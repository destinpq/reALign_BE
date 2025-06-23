import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const emailEnabled = configService.get<string>('EMAIL_ENABLED') !== 'false';
        const smtpHost = configService.get<string>('SMTP_HOST');
        
        // Always use a working transport configuration
        return {
          transport: {
            // Use a simple SMTP transport that works in development
            host: smtpHost || 'localhost',
            port: configService.get<number>('SMTP_PORT') || 1025, // Use mailhog port for dev
            secure: false,
            ignoreTLS: true,
            requireTLS: false,
            tls: {
              rejectUnauthorized: false,
            },
            // Only add auth if we have credentials
            ...(smtpHost && configService.get<string>('SMTP_USER') ? {
              auth: {
                user: configService.get<string>('SMTP_USER'),
                pass: configService.get<string>('SMTP_PASS'),
              }
            } : {}),
          },
          defaults: {
            from: `"reAlign PhotoMaker" <${configService.get<string>('SMTP_FROM') || 'noreply@realign.local'}>`,
          },
          // Only add template config if email is fully enabled
          ...(emailEnabled && smtpHost ? {
            template: {
              dir: join(__dirname, 'templates'),
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
          } : {}),
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {} 