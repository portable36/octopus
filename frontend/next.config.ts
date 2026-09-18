import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

type RemotePattern = {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname: string;
};

/** Allow next/image for local MinIO and optional public media CDN. */
function mediaRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
    { protocol: 'http', hostname: '127.0.0.1', port: '9000', pathname: '/**' },
  ];
  const raw = process.env['NEXT_PUBLIC_MEDIA_BASE_URL']?.trim();
  if (!raw) {
    return patterns;
  }
  try {
    const url = new URL(raw);
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    patterns.push({
      protocol,
      hostname: url.hostname,
      pathname: '/**',
      ...(url.port ? { port: url.port } : {}),
    });
  } catch {
    // Invalid env — keep localhost defaults only.
  }
  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: mediaRemotePatterns(),
  },
};

/** Bundle analyzer is a devDependency — skip after `npm prune --omit=dev`. */
function withOptionalAnalyzer(config: NextConfig): NextConfig {
  if (process.env['ANALYZE'] !== 'true') {
    return config;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundleAnalyzer = require('@next/bundle-analyzer') as (options: {
    enabled?: boolean;
  }) => (c: NextConfig) => NextConfig;
  return bundleAnalyzer({ enabled: true })(config);
}

export default withSentryConfig(withOptionalAnalyzer(nextConfig), {
  silent: true,
  // Source maps upload only when SENTRY_AUTH_TOKEN is set in CI.
  sourcemaps: {
    disable: !process.env['SENTRY_AUTH_TOKEN'],
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
