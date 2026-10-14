import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/supabase/server';
import { formatUserForClient } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await authenticateUser(request);
  if (auth.error) return auth.error;

  return NextResponse.json({
    success: true,
    data: {
      user: formatUserForClient(auth.profile!),
    },
  });
}
