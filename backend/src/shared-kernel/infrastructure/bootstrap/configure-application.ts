import type { INestApplication, ValidationError } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import type { AppConfigService } from '../../../config/app-config.service';
import { Rfc7807ExceptionFilter } from '../filters/rfc7807-exception.filter';

export function configureApplication(app: INestApplication, config: AppConfigService): void {
  if (config.isProduction) {
    app.use(helmet());
  } else {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  app.use(compression());
  app.use(json({ limit: config.httpBodyLimit }));
  app.use(urlencoded({ extended: true, limit: config.httpBodyLimit }));
  app.use(cookieParser());

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['x-request-id'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException({
          message: 'Validation failed.',
          errors: flattenValidationErrors(errors),
        });
      },
    }),
  );

  app.useGlobalFilters(new Rfc7807ExceptionFilter());

  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Octopus API')
      .setDescription('Multi-vendor multi-store commerce platform')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }
}

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Array<{ field: string; message: string }> {
  const result: Array<{ field: string; message: string }> = [];

  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({ field, message });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...flattenValidationErrors(error.children, field));
    }
  }

  return result;
}
