import { NextResponse } from 'next/server';
import { authenticateUser, createAdminClient } from '@/lib/supabase/server';
import { formatAttendanceForClient, Attendance } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const { userId } = params;

    // Rule: Users can only view their own history; admins can view anyone
    if (auth.profile!.role !== 'admin' && auth.user!.id !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const adminClient = createAdminClient();

    // Build query
    let query = adminClient
      .from('attendances')
      .select('*, locations(id, location_name, latitude, longitude, radius)', { count: 'exact' })
      .eq('user_id', userId);

    if (month && year) {
      const m = String(month).padStart(2, '0');
      const start = `${year}-${m}-01`;
      // End of month (handle year rollover)
      const nextMonth = parseInt(m, 10) === 12 ? 1 : parseInt(m, 10) + 1;
      const nextYear = parseInt(m, 10) === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
      const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      query = query.gte('date', start).lt('date', end);
    } else if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }

    const skip = (page - 1) * limit;
    const { data: records, count, error } = await query
      .order('date', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const total = count || 0;

    // Calculate all-time summary for this user
    const { data: allRecords } = await adminClient
      .from('attendances')
      .select('status')
      .eq('user_id', userId);

    const totalDays = allRecords?.length || 0;
    const presentDays = allRecords?.filter(r => ['present', 'late'].includes(r.status)).length || 0;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

    const formattedRecords = (records || []).map(r =>
      formatAttendanceForClient(r as Attendance, (r as any).locations, auth.profile)
    );

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalDays,
          presentDays,
          attendancePercentage: `${percentage}%`,
        },
      },
    });
  } catch (err: any) {
    console.error('History error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
