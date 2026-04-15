import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'global')
    });

    return NextResponse.json(settings || { id: 'global', isSyncEnabled: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isSyncEnabled } = await req.json();

    await db.insert(systemSettings)
      .values({ 
        id: 'global', 
        isSyncEnabled, 
        updatedAt: new Date() 
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { 
          isSyncEnabled, 
          updatedAt: new Date() 
        }
      });

    return NextResponse.json({ success: true, isSyncEnabled });
  } catch (error) {
    console.error('[SETTINGS_API] Update failed:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
