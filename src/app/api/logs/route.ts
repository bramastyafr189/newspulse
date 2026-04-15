import { db } from '@/db';
import { intelligenceLogs, capturedArticles } from '@/db/schema';
import { desc, eq, gt, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Only return logs from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const logs = await db.query.intelligenceLogs.findMany({
      where: gt(intelligenceLogs.timestamp, twentyFourHoursAgo),
      with: {
        articles: true,
      },
      orderBy: [desc(intelligenceLogs.timestamp)],
      limit: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ error: 'Failed to fetch intelligence logs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, body: logBody, channel, timestamp, articles } = body;

    // Use a basic sequential approach if transaction support is uncertain or for simplicity
    // But LibSQL supports transactions
    await db.transaction(async (tx) => {
      await tx.insert(intelligenceLogs).values({
        id: id || Math.random().toString(36).substr(2, 9),
        title,
        body: logBody,
        channel,
        timestamp: new Date(timestamp),
      });

      if (articles && articles.length > 0) {
        await tx.insert(capturedArticles).values(
          articles.map((art: any) => ({
            logId: id,
            title: art.title,
            description: art.description,
            url: art.url,
            source: art.source,
            publishedAt: art.publishedAt,
          }))
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save log:', error);
    return NextResponse.json({ error: 'Failed to save intelligence log' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.delete(intelligenceLogs);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return NextResponse.json({ error: 'Failed to clear intelligence logs' }, { status: 500 });
  }
}
