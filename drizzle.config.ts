import type { Config } from 'drizzle-kit';

export default {
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL || 'file:newspulse.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} as Config;
