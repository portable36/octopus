import type { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { AppConfigService } from '../../../config/app-config.service';

export function registerGracefulShutdown(app: INestApplication, config: AppConfigService): void {
  const logger = app.get(Logger);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    logger.log(`Received ${signal}; starting graceful shutdown`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceExitTimer.unref();

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      logger.log('Application shut down cleanly');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error(
        { err: error instanceof Error ? error : undefined },
        'Error during graceful shutdown',
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}
