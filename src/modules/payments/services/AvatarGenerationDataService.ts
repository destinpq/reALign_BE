import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AvatarGenerationDataService {
  private readonly logger = new Logger(AvatarGenerationDataService.name);

  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  async storeAvatarGeneration(avatarData: {
    sessionId: string;
    userImage: string;
    selectedWearables: any[];
    selectedScenery: string;
    userDetails: any;
    generatedPrompt: string;
    status: string;
    metadata: any;
  }) {
    try {
      // Store avatar generation data in database
      const avatarGeneration = await this.prismaService.avatarGeneration.create({
        data: {
          sessionId: avatarData.sessionId,
          userImage: avatarData.userImage,
          selectedWearables: avatarData.selectedWearables,
          selectedScenery: avatarData.selectedScenery,
          userDetails: avatarData.userDetails,
          generatedPrompt: avatarData.generatedPrompt,
          status: avatarData.status,
          metadata: avatarData.metadata as any,
        },
      });

      this.logger.log(`💾 Avatar generation data stored: ${avatarGeneration.sessionId}`);
      return avatarGeneration;
    } catch (error) {
      this.logger.error('❌ Failed to store avatar generation data:', error);
      throw error;
    }
  }

  async updateAvatarGenerationStatus(sessionId: string, status: string, paymentId?: string) {
    try {
      // First check if the record exists
      const existing = await this.prismaService.avatarGeneration.findUnique({
        where: { sessionId },
      });

      if (!existing) {
        this.logger.warn(`⚠️ Avatar generation not found for session: ${sessionId}. Skipping update.`);
        return null;
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (paymentId) {
        updateData.paymentId = paymentId;
      }

      const updated = await this.prismaService.avatarGeneration.update({
        where: { sessionId },
        data: updateData,
      });

      this.logger.log(`✅ Avatar generation status updated: ${sessionId} -> ${status}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Failed to update avatar generation status:', error);
      throw error;
    }
  }

  async getAvatarGenerationBySession(sessionId: string) {
    try {
      const avatarGeneration = await this.prismaService.avatarGeneration.findUnique({
        where: { sessionId },
      });

      if (!avatarGeneration) {
        throw new Error('Avatar generation session not found');
      }

      return avatarGeneration;
    } catch (error) {
      this.logger.error('❌ Failed to get avatar generation:', error);
      throw error;
    }
  }

  async linkAvatarGenerationToPayment(sessionId: string, paymentId: string) {
    try {
      const updated = await this.prismaService.avatarGeneration.update({
        where: { sessionId },
        data: { paymentId },
      });

      this.logger.log(`🔗 Avatar generation linked to payment: ${sessionId} -> ${paymentId}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Failed to link avatar generation to payment:', error);
      throw error;
    }
  }

  async getAvatarGenerationsByUser(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [avatarGenerations, total] = await Promise.all([
        this.prismaService.avatarGeneration.findMany({
          where: {
            paymentId: {
              not: null,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          // Removed payment include since the relation might not exist in the schema
        }),
        this.prismaService.avatarGeneration.count({
          where: {
            paymentId: {
              not: null,
            },
          },
        }),
      ]);

      return {
        avatarGenerations,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user avatar generations:', error);
      throw error;
    }
  }
}
