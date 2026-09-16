import type { QueueMetricsSnapshot } from './queue-metrics';

export type OpsAlertSeverity = 'warning' | 'critical';

export type OpsAlert = {
  readonly id: string;
  readonly severity: OpsAlertSeverity;
  readonly title: string;
  readonly detail: string;
  readonly source: string;
};

export type OpsAlertRuleCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly severity: OpsAlertSeverity;
  readonly condition: string;
  readonly runbook: string;
};

export type OpsAlertsDiagnosticsInput = {
  readonly dependencies: {
    readonly database: { readonly status: string; readonly latencyMs: number };
    readonly redis: { readonly status: string; readonly latencyMs: number };
    readonly meilisearch: { readonly status: string; readonly latencyMs: number };
  };
  readonly process: {
    readonly memory: {
      readonly heapUsedBytes: number;
      readonly heapTotalBytes: number;
    };
  };
  readonly workers: {
    readonly summary: { readonly totalFailed: number };
    readonly queues: readonly QueueMetricsSnapshot[];
  };
};

/** Latency (ms) above which a dependency ping is considered slow. */
export const OPS_ALERT_LATENCY_WARN_MS = 500;

/** Heap used / total ratio that warns of memory pressure. */
export const OPS_ALERT_HEAP_WARN_RATIO = 0.85;

export const OPS_ALERT_RULE_CATALOG: readonly OpsAlertRuleCatalogEntry[] = [
  {
    id: 'dependency.database.down',
    name: 'PostgreSQL down',
    severity: 'critical',
    condition: 'database.status !== up',
    runbook: 'Check Postgres process, connection string, and disk; restore from backup if corrupt.',
  },
  {
    id: 'dependency.redis.down',
    name: 'Redis down',
    severity: 'critical',
    condition: 'redis.status !== up',
    runbook: 'Check Redis process/memory; queues and sessions will fail until restored.',
  },
  {
    id: 'dependency.meilisearch.down',
    name: 'Meilisearch down',
    severity: 'warning',
    condition: 'meilisearch.status === down',
    runbook: 'Search/browse degrade; restart Meilisearch and reindex if needed.',
  },
  {
    id: 'dependency.latency_high',
    name: 'Dependency latency high',
    severity: 'warning',
    condition: `any dependency latencyMs > ${OPS_ALERT_LATENCY_WARN_MS}`,
    runbook: 'Inspect host load, network, and slow queries; scale or tune before SLO burn.',
  },
  {
    id: 'queue.failed_jobs',
    name: 'Failed queue jobs',
    severity: 'warning',
    condition: 'workers.summary.totalFailed > 0 (critical when queue status is critical)',
    runbook: 'Inspect BullMQ failed jobs / dead-letter; fix consumer and retry.',
  },
  {
    id: 'queue.lag_high',
    name: 'Queue lag high',
    severity: 'warning',
    condition: 'any queue lagMs > 10s (critical > 60s)',
    runbook: 'Scale workers or clear backlog; check outbox dispatcher health.',
  },
  {
    id: 'process.heap_pressure',
    name: 'Node heap pressure',
    severity: 'warning',
    condition: `heapUsed/heapTotal >= ${OPS_ALERT_HEAP_WARN_RATIO}`,
    runbook: 'Capture heap snapshot; look for leaks; restart if OOM imminent.',
  },
  {
    id: 'slo.burn_rate',
    name: 'Availability burn-rate (external)',
    severity: 'critical',
    condition: 'Wire Prometheus multi-window burn-rate on /health/ready success ratio',
    runbook:
      'Not evaluated in-process. Provision Cloudflare/uptime + Prometheus burn-rate alerts in ops.',
  },
] as const;

/**
 * Evaluates in-process ops alerts from a diagnostics-shaped snapshot.
 * Does not page anyone — surfaces conditions for the admin Alerts UI and future webhook hooks.
 */
export function evaluateOpsAlerts(input: OpsAlertsDiagnosticsInput): {
  readonly status: 'ok' | 'warning' | 'critical';
  readonly fired: readonly OpsAlert[];
  readonly rules: readonly OpsAlertRuleCatalogEntry[];
} {
  const fired: OpsAlert[] = [];

  const deps = [
    { key: 'database', label: 'PostgreSQL', ping: input.dependencies.database },
    { key: 'redis', label: 'Redis', ping: input.dependencies.redis },
    { key: 'meilisearch', label: 'Meilisearch', ping: input.dependencies.meilisearch },
  ] as const;

  for (const dep of deps) {
    const isDown = dep.ping.status === 'down';
    if (isDown) {
      fired.push({
        id: `dependency.${dep.key}.down`,
        severity: dep.key === 'meilisearch' ? 'warning' : 'critical',
        title: `${dep.label} is down`,
        detail: `${dep.label} health check returned status "${dep.ping.status}".`,
        source: `dependencies.${dep.key}`,
      });
    } else if (dep.ping.latencyMs > OPS_ALERT_LATENCY_WARN_MS) {
      fired.push({
        id: `dependency.${dep.key}.latency_high`,
        severity: 'warning',
        title: `${dep.label} latency high`,
        detail: `${dep.label} ping took ${dep.ping.latencyMs}ms (warn > ${OPS_ALERT_LATENCY_WARN_MS}ms).`,
        source: `dependencies.${dep.key}`,
      });
    }
  }

  const heapTotal = input.process.memory.heapTotalBytes;
  const heapUsed = input.process.memory.heapUsedBytes;
  if (heapTotal > 0 && heapUsed / heapTotal >= OPS_ALERT_HEAP_WARN_RATIO) {
    const pct = Math.round((heapUsed / heapTotal) * 100);
    fired.push({
      id: 'process.heap_pressure',
      severity: 'warning',
      title: 'Node heap pressure',
      detail: `Heap is ${pct}% used (${heapUsed} / ${heapTotal} bytes).`,
      source: 'process.memory',
    });
  }

  if (input.workers.summary.totalFailed > 0) {
    const anyCriticalQueue = input.workers.queues.some((q) => q.status === 'critical');
    fired.push({
      id: 'queue.failed_jobs',
      severity: anyCriticalQueue ? 'critical' : 'warning',
      title: 'Failed background jobs',
      detail: `${input.workers.summary.totalFailed} failed job(s) across BullMQ queues.`,
      source: 'workers.summary',
    });
  }

  for (const queue of input.workers.queues) {
    if (queue.status === 'healthy') {
      continue;
    }
    if (queue.lagMs > 10_000) {
      fired.push({
        id: `queue.${queue.name}.lag_high`,
        severity: queue.lagMs > 60_000 || queue.status === 'critical' ? 'critical' : 'warning',
        title: `Queue lag: ${queue.name}`,
        detail: `Oldest waiting job lag is ${queue.lagMs}ms (failed=${queue.failed}).`,
        source: `workers.queues.${queue.name}`,
      });
    } else if (queue.failed > 0 && queue.status === 'critical') {
      fired.push({
        id: `queue.${queue.name}.failed_critical`,
        severity: 'critical',
        title: `Queue critical: ${queue.name}`,
        detail: `Queue marked critical (failed=${queue.failed}, lagMs=${queue.lagMs}).`,
        source: `workers.queues.${queue.name}`,
      });
    }
  }

  const status = fired.some((a) => a.severity === 'critical')
    ? 'critical'
    : fired.length > 0
      ? 'warning'
      : 'ok';

  return {
    status,
    fired,
    rules: OPS_ALERT_RULE_CATALOG,
  };
}
