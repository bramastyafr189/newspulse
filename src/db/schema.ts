import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const interests = sqliteTable('interests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  language: text('language'),
  country: text('country'),
  refreshInterval: integer('refresh_interval').default(0),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).default(false),
  lastScanAt: integer('last_scan_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const keywords = sqliteTable('keywords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  interestId: integer('interest_id').notNull().references(() => interests.id, { onDelete: 'cascade' }),
  word: text('word').notNull(),
});

export const interestRelations = relations(interests, ({ many }) => ({
  keywords: many(keywords),
}));

export const keywordRelations = relations(keywords, ({ one }) => ({
  interest: one(interests, {
    fields: [keywords.interestId],
    references: [interests.id],
  }),
}));
