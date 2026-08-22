import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly entityManager: EntityManager) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.entityManager.getConnection().execute('select 1 as ok');
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database check failed';
      throw new HealthCheckError('Database check failed', this.getStatus(key, false, { message }));
    }
  }
}
