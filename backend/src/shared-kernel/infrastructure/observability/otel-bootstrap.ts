import type { DbStatementSerializer } from '@opentelemetry/instrumentation-ioredis';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export type OpenTelemetryHandle = {
  readonly shutdown: () => Promise<void>;
};

export { activeOtelTraceId } from './otel-trace-id';

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  return raw === 'true' || raw === '1';
}

/** Redact AUTH / sensitive Redis command args from db.statement attributes. */
export const redactRedisStatement: DbStatementSerializer = (cmdName, cmdArgs) => {
  const name = cmdName.toUpperCase();
  if (name === 'AUTH' || name === 'HELLO') {
    return name;
  }
  const args = cmdArgs.map((arg) => {
    if (typeof arg === 'number') {
      return String(arg);
    }
    if (Buffer.isBuffer(arg)) {
      return `<buf:${arg.length}>`;
    }
    if (Array.isArray(arg)) {
      return `[${arg.length}]`;
    }
    const text = String(arg);
    // Keys/commands only — truncate long values (tokens, payloads).
    if (text.length > 64) {
      return `${text.slice(0, 24)}…`;
    }
    return text;
  });
  return [name, ...args].join(' ');
};

function otlpUrl(endpoint: string, signalPath: '/v1/traces' | '/v1/metrics'): string {
  if (endpoint.includes('/v1/')) {
    return endpoint.replace(/\/v1\/(?:traces|metrics)\/?$/, signalPath);
  }
  return `${endpoint.replace(/\/$/, '')}${signalPath}`;
}

/**
 * Starts OpenTelemetry tracing + metrics when OTEL_ENABLED=true.
 * Must be called before NestFactory.create so instrumentations patch modules.
 *
 * Phase 23.2–23.10: HTTP/Express/Nest + PostgreSQL + Redis + BullMQ; payment/search spans;
 * HTTP RED + dependency + queue + business metrics.
 * Export: OTLP when OTEL_EXPORTER_OTLP_ENDPOINT is set; otherwise console in non-production.
 */
export function startOpenTelemetry(): OpenTelemetryHandle | null {
  if (!envFlag('OTEL_ENABLED')) {
    return null;
  }

  const serviceName = process.env['OTEL_SERVICE_NAME']?.trim() || 'octopus-api';
  const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT']?.trim();
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  const traceExporter = endpoint
    ? new OTLPTraceExporter({ url: otlpUrl(endpoint, '/v1/traces') })
    : nodeEnv === 'production'
      ? null
      : new ConsoleSpanExporter();

  const metricExporter = endpoint
    ? new OTLPMetricExporter({ url: otlpUrl(endpoint, '/v1/metrics') })
    : nodeEnv === 'production'
      ? null
      : new ConsoleMetricExporter();

  if (!traceExporter || !metricExporter) {
    console.warn(
      '[otel] OTEL_ENABLED=true in production but OTEL_EXPORTER_OTLP_ENDPOINT is unset; skipping SDK',
    );
    return null;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60_000,
      }),
    ],
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new PgInstrumentation({
        enhancedDatabaseReporting: false,
      }),
      new IORedisInstrumentation({
        dbStatementSerializer: redactRedisStatement,
      }),
    ],
  });

  sdk.start();

  return {
    shutdown: async () => {
      await sdk.shutdown();
    },
  };
}
