import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../database/prisma.service';
import { EmailStatus } from '@prisma/client';

export interface PaymentConfirmationData {
  paymentId: string;
  amount: number;
  credits: number;
  currency: string;
}

export interface PaymentFailedData {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface HeadshotGeneratedData {
  jobId: string;
  imageUrl: string;
  creditsUsed: number;
}

export interface WelcomeEmailData {
  firstName?: string;
  email: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;

  constructor(
    private readonly mailerService: MailerService,
    private readonly prismaService: PrismaService,
  ) {
    this.emailEnabled = process.env.EMAIL_ENABLED !== 'false' && !!process.env.SMTP_HOST;
    if (!this.emailEnabled) {
      this.logger.warn('Email service is disabled for development mode');
    }
  }

  async sendPaymentConfirmation(to: string, data: PaymentConfirmationData) {
    return this.sendEmail({
      to,
      subject: 'Payment Confirmation - Credits Added to Your Account',
      template: 'payment-confirmation',
      context: {
        paymentId: data.paymentId,
        amount: data.amount,
        credits: data.credits,
        currency: data.currency,
        date: new Date().toLocaleDateString(),
      },
    });
  }

  async sendPaymentFailed(to: string, data: PaymentFailedData) {
    return this.sendEmail({
      to,
      subject: 'Payment Failed - Please Try Again',
      template: 'payment-failed',
      context: {
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        supportEmail: 'support@realign-photomaker.com',
      },
    });
  }

  async sendHeadshotGenerated(to: string, data: HeadshotGeneratedData) {
    return this.sendEmail({
      to,
      subject: 'Your AI Headshot is Ready!',
      template: 'headshot-generated',
      context: {
        jobId: data.jobId,
        imageUrl: data.imageUrl,
        creditsUsed: data.creditsUsed,
        downloadLink: `${process.env.FRONTEND_URL}/dashboard/headshots/${data.jobId}`,
      },
    });
  }

  async sendHeadshotFailed(to: string, jobId: string, reason: string) {
    return this.sendEmail({
      to,
      subject: 'Headshot Generation Failed',
      template: 'headshot-failed',
      context: {
        jobId,
        reason,
        supportEmail: 'support@realign-photomaker.com',
        dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
      },
    });
  }

  async sendWelcomeEmail(to: string, data: WelcomeEmailData) {
    return this.sendEmail({
      to,
      subject: 'Welcome to reAlign PhotoMaker!',
      template: 'welcome',
      context: {
        firstName: data.firstName || 'there',
        email: data.email,
        dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
        featuresLink: `${process.env.FRONTEND_URL}/features`,
        supportEmail: 'support@realign-photomaker.com',
      },
    });
  }

  async sendPasswordReset(to: string, resetToken: string) {
    return this.sendEmail({
      to,
      subject: 'Reset Your Password - reAlign PhotoMaker',
      template: 'password-reset',
      context: {
        resetLink: `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
        supportEmail: 'support@realign-photomaker.com',
      },
    });
  }

  async sendEmailVerification(to: string, verificationToken: string) {
    return this.sendEmail({
      to,
      subject: 'Verify Your Email - reAlign PhotoMaker',
      template: 'email-verification',
      context: {
        verificationLink: `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`,
        supportEmail: 'support@realign-photomaker.com',
      },
    });
  }

  async sendCreditLowWarning(to: string, remainingCredits: number) {
    return this.sendEmail({
      to,
      subject: 'Low Credits Warning - Time to Recharge!',
      template: 'credit-low-warning',
      context: {
        remainingCredits,
        buyCreditsLink: `${process.env.FRONTEND_URL}/dashboard/billing`,
        packagesLink: `${process.env.FRONTEND_URL}/pricing`,
      },
    });
  }

  async sendSubscriptionExpiring(to: string, expiryDate: Date) {
    return this.sendEmail({
      to,
      subject: 'Subscription Expiring Soon',
      template: 'subscription-expiring',
      context: {
        expiryDate: expiryDate.toLocaleDateString(),
        renewLink: `${process.env.FRONTEND_URL}/dashboard/billing`,
        packagesLink: `${process.env.FRONTEND_URL}/pricing`,
      },
    });
  }

  async sendMonthlyUsageReport(to: string, usageData: any) {
    return this.sendEmail({
      to,
      subject: 'Your Monthly Usage Report',
      template: 'monthly-usage-report',
      context: {
        month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        ...usageData,
        dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
      },
    });
  }

  async sendContentViolationWarning(to: string, data: { name: string; violationType: string; reason: string; riskScore: number }) {
    return this.sendEmail({
      to,
      subject: 'Content Policy Warning - ReAlign PhotoMaker',
      template: 'content-violation-warning',
      context: {
        ...data,
        supportEmail: 'support@realign-photomaker.com',
        guidelinesLink: `${process.env.FRONTEND_URL}/guidelines`,
      },
    });
  }

  async sendAdminViolationAlert(to: string, data: { userId: string; userEmail: string; userName: string; violationType: string; riskScore: number; flaggedKeywords: string[]; reason: string }) {
    return this.sendEmail({
      to,
      subject: 'High-Risk Content Violation Alert - ReAlign PhotoMaker Admin',
      template: 'admin-violation-alert',
      context: {
        ...data,
        adminPanelLink: `${process.env.FRONTEND_URL}/admin/users/${data.userId}`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAccountStatusUpdate(to: string, data: { name: string; status: string; reason?: string }) {
    return this.sendEmail({
      to,
      subject: `Account ${data.status === 'activated' ? 'Activated' : 'Deactivated'} - ReAlign PhotoMaker`,
      template: 'account-status-update',
      context: {
        ...data,
        supportEmail: 'support@realign-photomaker.com',
        dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
      },
    });
  }

  async sendCreditsAwarded(to: string, data: { name: string; creditsAwarded: number; newBalance: number; reason?: string }) {
    return this.sendEmail({
      to,
      subject: 'Credits Awarded - ReAlign PhotoMaker',
      template: 'credits-awarded',
      context: {
        ...data,
        dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
        date: new Date().toLocaleDateString(),
      },
    });
  }

  private async sendEmail(emailData: {
    to: string;
    subject: string;
    template: string;
    context: any;
    userId?: string;
  }) {
    try {
      // Create email notification record
      const emailNotification = await this.prismaService.email_notifications.create({
        data: {
          userId: emailData.userId,
          to: emailData.to,
          from: process.env.SMTP_FROM || 'noreply@realign-photomaker.com',
          subject: emailData.subject,
          template: emailData.template,
          templateData: emailData.context,
          status: EmailStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      try {
        if (!this.emailEnabled) {
          // Mock email sending for development
          this.logger.log(`[MOCK] Would send email: ${emailData.template} to ${emailData.to} with subject: ${emailData.subject}`);
          
          // Update email status to sent (mocked)
          await this.prismaService.email_notifications.update({
            where: { id: emailNotification.id },
            data: {
              status: EmailStatus.SENT,
              sentAt: new Date(),
            },
          });

          return { success: true, emailId: emailNotification.id, mocked: true };
        }

        // Send email using mailer service
        await this.mailerService.sendMail({
          to: emailData.to,
          subject: emailData.subject,
          template: emailData.template,
          context: emailData.context,
        });

        // Update email status to sent
        await this.prismaService.email_notifications.update({
          where: { id: emailNotification.id },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
          },
        });

        this.logger.log(`Email sent successfully: ${emailData.template} to ${emailData.to}`);
        
        return { success: true, emailId: emailNotification.id };
      } catch (error) {
        // Update email status to failed
        await this.prismaService.email_notifications.update({
          where: { id: emailNotification.id },
          data: {
            status: EmailStatus.FAILED,
            failureReason: error.message,
            attempts: { increment: 1 },
          },
        });

        this.logger.error(`Failed to send email: ${emailData.template} to ${emailData.to}`, error);
        
        // In development mode, don't throw email errors
        if (!this.emailEnabled) {
          this.logger.warn('Email error ignored in development mode');
          return { success: false, emailId: emailNotification.id, error: error.message };
        }
        
        throw error;
      }
    } catch (error) {
      this.logger.error('Email service error:', error);
      
      // In development mode, don't throw database errors related to email
      if (!this.emailEnabled) {
        this.logger.warn('Email database error ignored in development mode');
        return { success: false, error: error.message };
      }
      
      throw error;
    }
  }

  async retryFailedEmails() {
    const failedEmails = await this.prismaService.email_notifications.findMany({
      where: {
        status: EmailStatus.FAILED,
        attempts: { lt: 3 }, // Max 3 attempts
      },
      take: 10, // Process 10 at a time
    });

    for (const email of failedEmails) {
      try {
        await this.mailerService.sendMail({
          to: email.to,
          subject: email.subject,
          template: email.template,
          context: email.templateData as { [name: string]: any },
        });

        await this.prismaService.email_notifications.update({
          where: { id: email.id },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            attempts: { increment: 1 },
          },
        });

        this.logger.log(`Retry successful: ${email.template} to ${email.to}`);
      } catch (error) {
        await this.prismaService.email_notifications.update({
          where: { id: email.id },
          data: {
            attempts: { increment: 1 },
            failureReason: error.message,
          },
        });

        this.logger.error(`Retry failed: ${email.template} to ${email.to}`, error);
      }
    }
  }

  async getEmailStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails,
      emailsByTemplate,
    ] = await Promise.all([
      this.prismaService.email_notifications.count({ where: whereClause }),
      this.prismaService.email_notifications.count({
        where: { ...whereClause, status: EmailStatus.SENT },
      }),
      this.prismaService.email_notifications.count({
        where: { ...whereClause, status: EmailStatus.FAILED },
      }),
      this.prismaService.email_notifications.count({
        where: { ...whereClause, status: EmailStatus.PENDING },
      }),
      this.prismaService.email_notifications.groupBy({
        by: ['template'],
        where: whereClause,
        _count: { template: true },
        orderBy: { _count: { template: 'desc' } },
      }),
    ]);

    return {
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails,
      successRate: totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0,
      emailsByTemplate: emailsByTemplate.map(item => ({
        template: item.template,
        count: item._count.template,
      })),
    };
  }
} 