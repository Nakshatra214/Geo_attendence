import { NextResponse } from 'next/server';
import { authenticateUser, createAdminClient } from '@/lib/supabase/server';
import { formatLocationForClient, Location } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const isAdmin = auth.profile!.role === 'admin';
    const adminClient = createAdminClient();

    let query = adminClient
      .from('locations')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false });

    // Non-admins only see active locations
    if (!isAdmin) {
      query = query.eq('is_active', true);
    }

    const { data: locations, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const formatted = (locations || []).map(loc =>
      formatLocationForClient(loc as Location & { profiles?: { name: string; email: string } | null })
    );

    return NextResponse.json({
      success: true,
      data: {
        locations: formatted,
      },
    });
  } catch (err: any) {
    console.error('Get locations error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
