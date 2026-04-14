import { db } from '@/db';
import { interests, intelligenceLogs, capturedArticles, pushSubscriptions } from '@/db/schema';
import { getNewsOnServer } from '@/lib/news-fetcher';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:bramastya@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  // Security check for Vercel Cron
  const authHeader = req.headers.get('Authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Starting global intelligence scan...');
  
  try {
    // 1. Fetch all channels
    const channels = await db.query.interests.findMany({
      with: {
        keywords: true
      }
    });

    let totalNewArticles = 0;
    const now = new Date();

    for (const channel of channels) {
      // 1. Skip if no keywords, or interval is set to Manual (0) or null
      const interval = channel.refreshInterval || 0;
      if (channel.keywords.length === 0 || interval <= 0) continue;

      const lastScanAt = channel.lastScanAt ? new Date(channel.lastScanAt) : new Date(0);
      const diffMinutes = (now.getTime() - lastScanAt.getTime()) / (1000 * 60);

      // 2. Only scan if the time elapsed is >= the user-defined interval
      if (diffMinutes < interval) {
        console.log(`[CRON] Skipping "${channel.name}" (Next scan in ${Math.round(interval - diffMinutes)} mins)`);
        continue;
      }

      console.log(`[CRON] Scanning "${channel.name}" pipeline...`);
      const keywords = channel.keywords.map(k => k.word);
      const articles = await getNewsOnServer(keywords.join(' OR '), channel.language || 'any');
      
      const newArticles = articles.filter(a => new Date(a.publishedAt) > lastScanAt);

      if (newArticles.length > 0) {
        totalNewArticles += newArticles.length;
        const logId = Math.random().toString(36).substr(2, 9);

        // a. Save to Intelligence Logs
        await db.transaction(async (tx) => {
          await tx.insert(intelligenceLogs).values({
            id: logId,
            title: `+${newArticles.length}`,
            body: `Background sync complete for "${channel.name}" pipeline.`,
            channel: channel.name,
            timestamp: now,
          });

          await tx.insert(capturedArticles).values(
            newArticles.map(art => ({
              logId: logId,
              title: art.title,
              url: art.url,
              source: art.source,
              publishedAt: art.publishedAt,
            }))
          );

          // b. Update lastScanAt for the channel
          await tx.update(interests)
            .set({ lastScanAt: now })
            .where(eq(interests.id, channel.id));
        });

        // c. Trigger Web Push for this channel if notifications enabled
        if (channel.notificationsEnabled) {
          const subscriptions = await db.query.pushSubscriptions.findMany();
          
          const payload = JSON.stringify({
            title: `Intelligence: ${channel.name}`,
            body: `Intercepted ${newArticles.length} new signals from the feed.`,
            icon: '/icon-192x192.png',
            tag: `channel-${channel.id}`,
            data: { url: '/' }
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                  }
                },
                payload
              );
            } catch (error: any) {
              if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription has expired or is no longer valid
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
              }
              console.error(`Failed to send push to ${sub.endpoint}:`, error);
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      scannedChannels: channels.length,
      newArticlesFound: totalNewArticles 
    });
  } catch (error) {
    console.error('[CRON] Scan failed:', error);
    return NextResponse.json({ error: 'Background scan failed' }, { status: 500 });
  }
}
