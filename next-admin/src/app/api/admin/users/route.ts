import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';
import { formatUserForClient, Profile } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';

    const adminClient = createAdminClient();

    let query = adminClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'user');

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term}`);
    }

    const skip = (page - 1) * limit;
    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const total = count || 0;
    const formattedUsers = (users || []).map(u => formatUserForClient(u as Profile));

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Get all users error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
