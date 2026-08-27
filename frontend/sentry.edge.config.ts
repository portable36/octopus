import * as Sentry from '@sentry/nextjs';
import { sentryInitOptions } from './src/lib/sentry';

const options = sentryInitOptions();
if (options) {
  Sentry.init(options);
}
