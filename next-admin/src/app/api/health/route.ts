import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    message: 'Attendance System API (Supabase Next.js) is running',
    timestamp: new Date().toISOString(),
  });
}
