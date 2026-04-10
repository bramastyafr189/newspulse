import { NextResponse } from 'next/server';
import { db } from '@/db';
import { keywords } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { interestId, word } = await request.json();
    if (!interestId || !word) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    
    const [result] = await db.insert(keywords).values({ 
      interestId: parseInt(interestId), 
      word: word.trim() 
    }).returning();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to add keyword:', error);
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    await db.delete(keywords).where(eq(keywords.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete keyword:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
