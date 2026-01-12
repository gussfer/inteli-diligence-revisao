import { NextResponse } from 'next/server';
import { accessLogs } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ logs: accessLogs });
}