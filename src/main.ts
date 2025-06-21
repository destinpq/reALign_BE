import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
const compression = require('compression');
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  const corsOrigin = configService.get('CORS_ORIGIN') || 'http://localhost:3000';

  // Configure body parsers with larger limits for image uploads
  const express = require('express');
  app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
  app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded limit
  app.use(express.raw({ limit: '50mb' })); // Increase raw body limit
  app.use(express.text({ limit: '50mb' })); // Increase text body limit

  // Security middleware with relaxed CSP for images
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "http://localhost:3000", "http://localhost:3001"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (configService.get('SWAGGER_ENABLED') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('ReAlign PhotoMaker API')
      .setDescription('API for professional photo generation and avatar customization')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('photos', 'Photo upload and management')
      .addTag('wearables', 'Wearable items and selections')
      .addTag('customizations', 'Avatar customizations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable Prisma connection
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap(); 