import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';

// Explicit content keywords and patterns
const EXPLICIT_KEYWORDS = [
  'nude', 'naked', 'sex', 'porn', 'explicit', 'adult', 'nsfw',
  'sexual', 'erotic', 'intimate', 'provocative', 'revealing',
  'topless', 'bottomless', 'underwear', 'lingerie', 'bikini',
  'swimsuit', 'cleavage', 'suggestive', 'seductive', 'sensual',
  'fetish', 'kinky', 'dirty', 'hot', 'sexy', 'arousing',
];

const INAPPROPRIATE_PATTERNS = [
  /\b(nude|naked|sex|porn)\b/i,
  /\b(explicit|adult|nsfw)\b/i,
  /\b(sexual|erotic|intimate)\b/i,
  /\b(topless|bottomless)\b/i,
  /\b(provocative|revealing|suggestive)\b/i,
  /\b(seductive|sensual|arousing)\b/i,
];

export interface ContentModerationResult {
  isAppropriate: boolean;
  flaggedKeywords: string[];
  riskScore: number; // 0-100, higher is more risky
  reason?: string;
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async moderateContent(
    userId: string,
    prompt: string,
    imageUrl?: string,
  ): Promise<ContentModerationResult> {
    try {
      const textResult = this.moderateText(prompt);
      
      // For now, we'll focus on text moderation
      // Image moderation would require additional AI services
      const result: ContentModerationResult = {
        isAppropriate: textResult.isAppropriate,
        flaggedKeywords: textResult.flaggedKeywords,
        riskScore: textResult.riskScore,
        reason: textResult.reason,
      };

      // Log moderation attempt
      await this.auditService.log({
        userId,
        action: 'content.moderation_check',
        entityType: 'ProcessingJob',
        metadata: {
          prompt,
          imageUrl,
          moderationResult: result,
        },
      });

      // If content is flagged, log as violation
      if (!result.isAppropriate) {
        await this.logContentViolation(userId, prompt, result);
      }

      return result;
    } catch (error) {
      this.logger.error('Content moderation failed:', error);
      
      // Default to blocking if moderation fails
      return {
        isAppropriate: false,
        flaggedKeywords: [],
        riskScore: 100,
        reason: 'Moderation system error - content blocked for safety',
      };
    }
  }

  private moderateText(text: string): ContentModerationResult {
    const lowerText = text.toLowerCase();
    const flaggedKeywords: string[] = [];
    let riskScore = 0;

    // Check for explicit keywords
    EXPLICIT_KEYWORDS.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        flaggedKeywords.push(keyword);
        riskScore += 20; // Each keyword adds 20 to risk score
      }
    });

    // Check for inappropriate patterns
    INAPPROPRIATE_PATTERNS.forEach(pattern => {
      if (pattern.test(text)) {
        riskScore += 15; // Each pattern adds 15 to risk score
      }
    });

    // Additional context-based checks
    if (this.containsSexualContext(lowerText)) {
      riskScore += 25;
      flaggedKeywords.push('sexual_context');
    }

    if (this.containsInappropriateRequests(lowerText)) {
      riskScore += 30;
      flaggedKeywords.push('inappropriate_request');
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    const isAppropriate = riskScore < 50; // Threshold for blocking content
    const reason = !isAppropriate 
      ? `Content flagged for inappropriate material. Risk score: ${riskScore}. Keywords: ${flaggedKeywords.join(', ')}`
      : undefined;

    return {
      isAppropriate,
      flaggedKeywords,
      riskScore,
      reason,
    };
  }

  private containsSexualContext(text: string): boolean {
    const sexualContexts = [
      'without clothes', 'no shirt', 'no top', 'bare chest',
      'undressed', 'undressing', 'strip', 'exposed',
      'bedroom', 'bed pose', 'lying down', 'seductive pose',
    ];

    return sexualContexts.some(context => text.includes(context));
  }

  private containsInappropriateRequests(text: string): boolean {
    const inappropriateRequests = [
      'make me look sexy', 'make me hot', 'show more skin',
      'remove clothing', 'add revealing', 'make provocative',
      'sultry look', 'bedroom eyes', 'seductive expression',
    ];

    return inappropriateRequests.some(request => text.includes(request));
  }

  async logContentViolation(
    userId: string,
    content: string,
    moderationResult: ContentModerationResult,
  ) {
    try {
      // Create content violation record in audit logs
      await this.auditService.log({
        userId,
        action: 'content.violation_detected',
        entityType: 'User',
        entityId: userId,
        metadata: {
          violationType: 'inappropriate_content',
          content: content.substring(0, 500), // Limit content length in logs
          flaggedKeywords: moderationResult.flaggedKeywords,
          riskScore: moderationResult.riskScore,
          reason: moderationResult.reason,
          timestamp: new Date().toISOString(),
        },
      });

      // Get user details for potential action
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (user) {
        // Send warning email to user
        await this.emailService.sendContentViolationWarning(
          user.email,
          {
            name: `${user.firstName} ${user.lastName}`,
            violationType: 'Inappropriate Content Request',
            reason: moderationResult.reason,
            riskScore: moderationResult.riskScore,
          },
        );

        // Notify admins of high-risk violations
        if (moderationResult.riskScore >= 80) {
          await this.notifyAdminsOfViolation(userId, user, moderationResult);
        }
      }

      this.logger.warn(`Content violation detected for user ${userId}`, {
        riskScore: moderationResult.riskScore,
        flaggedKeywords: moderationResult.flaggedKeywords,
      });
    } catch (error) {
      this.logger.error('Failed to log content violation:', error);
    }
  }

  private async notifyAdminsOfViolation(
    userId: string,
    user: any,
    moderationResult: ContentModerationResult,
  ) {
    try {
      // Get admin users
      const admins = await this.prismaService.users.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
        },
        select: { email: true },
      });

      // Send notification to all admins
      for (const admin of admins) {
        await this.emailService.sendAdminViolationAlert(
          admin.email,
          {
            userId,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            violationType: 'High-Risk Content Violation',
            riskScore: moderationResult.riskScore,
            flaggedKeywords: moderationResult.flaggedKeywords,
            reason: moderationResult.reason,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to notify admins of violation:', error);
    }
  }

  async getFlaggedContent(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [violations, total] = await Promise.all([
      this.prismaService.audit_logs.findMany({
        where: {
          action: 'content.violation_detected',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      }),
      this.prismaService.audit_logs.count({
        where: {
          action: 'content.violation_detected',
        },
      }),
    ]);

    return {
      violations: violations.map(violation => ({
        
        userId: violation.userId,
        user: violation.user,
        violationType: violation.metadata?.['violationType'],
        content: violation.metadata?.['content'],
        flaggedKeywords: violation.metadata?.['flaggedKeywords'],
        riskScore: violation.metadata?.['riskScore'],
        reason: violation.metadata?.['reason'],
        createdAt: violation.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserViolationHistory(userId: string) {
    const violations = await this.prismaService.audit_logs.findMany({
      where: {
        userId,
        action: 'content.violation_detected',
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Last 100 violations
    });

    const violationCount = violations.length;
    const highRiskViolations = violations.filter(
      v => v.metadata?.['riskScore'] >= 80,
    ).length;

    return {
      totalViolations: violationCount,
      highRiskViolations,
      recentViolations: violations.slice(0, 10),
      riskLevel: this.calculateUserRiskLevel(violationCount, highRiskViolations),
    };
  }

  private calculateUserRiskLevel(
    totalViolations: number,
    highRiskViolations: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (highRiskViolations >= 5 || totalViolations >= 20) {
      return 'CRITICAL';
    } else if (highRiskViolations >= 3 || totalViolations >= 10) {
      return 'HIGH';
    } else if (highRiskViolations >= 1 || totalViolations >= 5) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  async getModerationStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      action: 'content.moderation_check',
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalChecks,
      violations,
      highRiskViolations,
      uniqueViolators,
    ] = await Promise.all([
      this.prismaService.audit_logs.count({ where: whereClause }),
      this.prismaService.audit_logs.count({
        where: {
          ...whereClause,
          action: 'content.violation_detected',
        },
      }),
      this.prismaService.audit_logs.count({
        where: {
          ...whereClause,
          action: 'content.violation_detected',
          metadata: {
            path: ['riskScore'],
            gte: 80,
          },
        },
      }),
      this.prismaService.audit_logs.findMany({
        where: {
          ...whereClause,
          action: 'content.violation_detected',
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return {
      totalChecks,
      violations,
      highRiskViolations,
      uniqueViolators: uniqueViolators.length,
      violationRate: totalChecks > 0 ? (violations / totalChecks) * 100 : 0,
      highRiskRate: violations > 0 ? (highRiskViolations / violations) * 100 : 0,
    };
  }
} 