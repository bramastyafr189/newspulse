import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL || 'file:newspulse.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} as Config;
