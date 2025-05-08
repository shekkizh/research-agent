import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, session_id } = body;
    
    // Forward the request to your backend API
    // Replace with your actual backend URL
    const response = await fetch('http://localhost:8000/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, session_id }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to process research request');
    }
    
    return NextResponse.json({ success: true, session_id });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process research request' },
      { status: 500 }
    );
  }
} 