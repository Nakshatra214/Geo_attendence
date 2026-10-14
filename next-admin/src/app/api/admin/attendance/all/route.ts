import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';
import { formatAttendanceForClient, Attendance } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');

    const adminClient = createAdminClient();

    let query = adminClient
      .from('attendances')
      .select('*, profiles!attendances_user_fk(name, email, department, employee_id), locations(id, location_name)', { count: 'exact' });

    if (date) query = query.eq('date', date);
    if (userId) query = query.eq('user_id', userId);

    const skip = (page - 1) * limit;
    const { data: records, count, error } = await query
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false, nullsFirst: false })
      .range(skip, skip + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const total = count || 0;
    const formattedRecords = (records || []).map(r =>
      formatAttendanceForClient(
        r as Attendance,
        (r as any).locations,
        (r as any).profiles
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('All attendance error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
