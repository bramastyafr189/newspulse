import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const intelligenceLogs = sqliteTable('intelligence_logs', {
  id: text('id').primaryKey(), // Using numeric-like string ID from frontend
  title: text('title').notNull(),
  body: text('body').notNull(),
  channel: text('channel').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const capturedArticles = sqliteTable('captured_articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  logId: text('log_id').notNull().references(() => intelligenceLogs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  source: text('source').notNull(),
  publishedAt: text('published_at').notNull(),
});

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

export const intelligenceLogsRelations = relations(intelligenceLogs, ({ many }) => ({
  articles: many(capturedArticles),
}));

export const capturedArticlesRelations = relations(capturedArticles, ({ one }) => ({
  log: one(intelligenceLogs, {
    fields: [capturedArticles.logId],
    references: [intelligenceLogs.id],
  }),
}));

export const interestRelations = relations(interests, ({ many }) => ({
  keywords: many(keywords),
}));

export const keywordRelations = relations(keywords, ({ one }) => ({
  interest: one(interests, {
    fields: [keywords.interestId],
    references: [interests.id],
  }),
}));

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

