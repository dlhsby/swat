import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AppConfigService } from './config';
import { configureApp } from './configure-app';

/**
 * Application entrypoint. Boots NestJS, mounts the global `/api/v1` prefix
 * (health stays at `/health` for orchestrator probes), wires the Redis session
 * middleware, publishes Swagger UI at `/api/docs`, and listens on the
 * configured port.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const config = app.get(AppConfigService);

  app.enableShutdownHooks();
  await configureApp(app, config);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SWAT API')
    .setDescription('Fleet & waste-transport operations API')
    .setVersion('0.1.0')
    .addCookieAuth('swat.sid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api-json',
  });

  await app.listen(config.port);
  logger.log(`SWAT backend listening on http://localhost:${config.port}`);
  logger.log(`Swagger UI available at http://localhost:${config.port}/api/docs`);
}

void bootstrap();
