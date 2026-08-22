import fs from 'node:fs';

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const env = process.env;
const missing = required.filter((key) => !env[key]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (env.NODE_ENV === 'production') {
  const weak = ['replace', 'secret', 'password', 'changeme'];
  const weakSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((key) =>
    weak.some((word) => String(env[key]).toLowerCase().includes(word)),
  );

  if (weakSecrets.length) {
    console.error(`Weak production secrets: ${weakSecrets.join(', ')}`);
    process.exit(1);
  }
}

console.log('Environment validation passed.');
