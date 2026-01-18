import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Create Winston logger
  const logLevel = process.env.LOG_LEVEL || 'info';

  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context }) => {
            return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.json(),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
    }),
  );

  // Compression
  app.use(compression());

  // Increase body parser limits for large file uploads (500MB)
  app.use(bodyParser.json({ limit: '500mb' }));
  app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
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

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Velox API')
      .setDescription(
        'Enterprise Cloud Storage API - Modernized with NestJS\n\n' +
        'Features:\n' +
        '- JWT Authentication with Google OAuth\n' +
        '- Multi-cloud storage (OpenStack Swift, AWS S3, Google Cloud Storage)\n' +
        '- Box/Project management with team collaboration\n' +
        '- File upload, download, versioning\n' +
        '- User quota management\n' +
        '- Full CRUD operations with soft delete\n' +
        '- Advanced search and filtering\n',
      )
      .setVersion('2.0')
      .setContact('Velox Team', 'https://github.com/yourusername/velox', 'support@velox.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'JWT',
      )
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication and authorization')
      .addTag('users', 'User management and profile')
      .addTag('boxes', 'Box/project management and collaboration')
      .addTag('files', 'File operations - upload, download, version control')
      .addTag('storage', 'Storage provider operations')
      .addTag('notifications', 'User notifications and alerts')
      .addServer('http://localhost:3000', 'Local development server')
      .addServer('https://api.velox.com', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Velox API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`API Documentation available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  }

  await app.listen(port);

  logger.log(`============================================`, 'Bootstrap');
  logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`❤️  Health Check: http://localhost:${port}/api/v1/health`, 'Bootstrap');
  logger.log(`🌍 Environment: ${nodeEnv}`, 'Bootstrap');
  logger.log(`============================================`, 'Bootstrap');
}

bootstrap();
