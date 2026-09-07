import { Inject, Injectable, Optional } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { MeiliSearch } from 'meilisearch';
import { AppConfigService } from '../../../config/app-config.service';

@Injectable()
export class MeilisearchHealthIndicator extends HealthIndicator {
  private client: MeiliSearch | null = null;

  constructor(@Optional() @Inject(AppConfigService) private readonly config?: AppConfigService) {
    super();
    if (this.config?.meilisearchHost) {
      try {
        this.client = new MeiliSearch({
          host: this.config.meilisearchHost,
          apiKey: this.config.meilisearchApiKey,
        });
      } catch {
        this.client = null;
      }
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.client || !this.config?.meilisearchHost) {
      return this.getStatus(key, true, {
        state: 'disabled',
        message: 'Meilisearch host not configured',
      });
    }

    const start = Date.now();
    try {
      const isHealthy = await this.client.isHealthy();
      const latencyMs = Date.now() - start;
      if (!isHealthy) {
        throw new HealthCheckError(
          'Meilisearch check returned unhealthy',
          this.getStatus(key, false, { latencyMs, host: this.config.meilisearchHost }),
        );
      }
      return this.getStatus(key, true, {
        latencyMs,
        host: this.config.meilisearchHost,
      });
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Meilisearch ping failed';
      throw new HealthCheckError(
        'Meilisearch check failed',
        this.getStatus(key, false, {
          message,
          latencyMs,
          host: this.config.meilisearchHost,
        }),
      );
    }
  }

  async ping(_key = 'meilisearch'): Promise<{
    status: 'up' | 'down' | 'disabled';
    latencyMs: number;
    host?: string;
    message?: string;
  }> {
    if (!this.client || !this.config?.meilisearchHost) {
      return { status: 'disabled', latencyMs: 0, message: 'Not configured' };
    }
    const start = Date.now();
    try {
      const isHealthy = await this.client.isHealthy();
      const latencyMs = Date.now() - start;
      return {
        status: isHealthy ? 'up' : 'down',
        latencyMs,
        host: this.config.meilisearchHost,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        host: this.config.meilisearchHost,
        message: error instanceof Error ? error.message : 'Ping failed',
      };
    }
  }
}
