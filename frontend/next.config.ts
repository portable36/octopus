import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  // Source maps upload only when SENTRY_AUTH_TOKEN is set in CI.
  sourcemaps: {
    disable: !process.env['SENTRY_AUTH_TOKEN'],
  },
});
