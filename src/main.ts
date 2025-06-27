import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 1001;

  // Configure body parsers with larger limits for image uploads
  app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
  app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded limit
  app.use(express.raw({ limit: '50mb' })); // Increase raw body limit
  app.use(express.text({ limit: '50mb' })); // Increase text body limit

  // 🔧 RAW BODY MIDDLEWARE FOR WEBHOOK SIGNATURE VERIFICATION
  // Razorpay webhook needs raw body for signature verification
  app.use('/api/v1/payments/webhook/razorpay', (req, res, next) => {
    // Collect raw body for signature verification
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
    });
    req.on('end', () => {
      req.rawBody = rawBody;
      try {
        req.body = JSON.parse(rawBody);
      } catch (error) {
        console.error('Failed to parse webhook JSON:', error);
        req.body = {};
      }
      next();
    });
  });

  // Security middleware with relaxed CSP for images
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "http://localhost:1000", "http://localhost:3000", "https://realign.destinpq.com", "https://realign-api.destinpq.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:1000", "http://localhost:3000", "https://realign.destinpq.com", "https://realign-api.destinpq.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(compression());
  app.use(cookieParser());

  // Enable CORS for frontend communication with more permissive settings
  app.enableCors({
    origin: [
      'http://localhost:1000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://realign.destinpq.com',
      'https://realign-frontend.destinpq.com',
      'https://www.realign.destinpq.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'Accept-Encoding',
      'User-Agent',
      'Referer'
    ],
    exposedHeaders: ['X-Auth-Logout', 'X-Auth-Reason'],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable trust proxy for production
  app.set('trust proxy', 1);

  // Add placeholder route mapping for different path patterns
  app.use('/api/placeholder', (req, res, next) => {
    // Extract the path after /api/placeholder and prepend /api/v1/photos/placeholder
    const placeholderPath = req.url; // This is the path after /api/placeholder
    req.url = `/api/v1/photos/placeholder${placeholderPath}`;
    next();
  });

  // Additional placeholder mapping for root level requests
  app.use('/placeholder', (req, res, next) => {
    req.url = `/api/v1/photos/placeholder${req.url}`;
    next();
  });

  // Handle direct placeholder requests that might be missing the prefix
  app.use('/api/:width/:height', (req, res, next) => {
    // This catches URLs like /api/150/150 and redirects to placeholder
    const { width, height } = req.params;
    if (!isNaN(Number(width)) && !isNaN(Number(height))) {
      res.redirect(`/api/v1/photos/placeholder/${width}/${height}`);
      return;
    }
    next();
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReAlign PhotoMaker API')
    .setDescription('API for ReAlign PhotoMaker application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable shutdown hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(port);
  console.log(`✅ ReAlign PhotoMaker API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap(); 