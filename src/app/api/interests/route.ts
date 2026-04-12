import { NextResponse } from 'next/server';
import { db } from '@/db';
import { interests, keywords } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allInterests = await db.query.interests.findMany({
      with: {
        keywords: true,
      },
    });
    return NextResponse.json(allInterests);
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, language, country } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    
    const [result] = await db.insert(interests).values({ 
      name,
      language: language || null,
      country: country || null
    }).returning();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to create interest:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { name, language, country, refreshInterval, notificationsEnabled, lastScanAt } = await request.json();
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    await db.update(interests)
      .set({ 
        name: name !== undefined ? name : undefined,
        language: language !== undefined ? language : undefined,
        country: country !== undefined ? country : undefined,
        refreshInterval: refreshInterval !== undefined ? refreshInterval : undefined,
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : undefined,
        lastScanAt: lastScanAt !== undefined ? (lastScanAt ? new Date(lastScanAt) : null) : undefined,
      })
      .where(eq(interests.id, parseInt(id)));
      
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update interest:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    await db.delete(interests).where(eq(interests.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete interest:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
