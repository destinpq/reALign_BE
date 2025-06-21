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
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST') || 'localhost',
          port: configService.get<number>('SMTP_PORT') || 587,
          secure: configService.get<boolean>('SMTP_SECURE') || false,
          ignoreTLS: true, // Ignore TLS errors for development
          requireTLS: false, // Don't require TLS
          tls: {
            rejectUnauthorized: false, // Ignore certificate errors
          },
          auth: configService.get<string>('SMTP_USER') ? {
            user: configService.get<string>('SMTP_USER'),
            pass: configService.get<string>('SMTP_PASS'),
          } : undefined, // Don't set auth if no credentials
        },
        defaults: {
          from: `"reAlign PhotoMaker" <${configService.get<string>('SMTP_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {} 