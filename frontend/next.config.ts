import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
});

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

export default withSentryConfig(withAnalyzer(nextConfig), {
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
