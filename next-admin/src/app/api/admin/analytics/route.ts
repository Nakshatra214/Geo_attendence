import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const adminClient = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Total users
    const { count: totalUsers } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user');

    // 2. Active locations
    const { count: totalLocations } = await adminClient
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // 3. Today attendance
    const { count: todayAttendance } = await adminClient
      .from('attendances')
      .select('id', { count: 'exact', head: true })
      .eq('date', today);

    // 4. Total attendance records
    const { count: totalAttendance } = await adminClient
      .from('attendances')
      .select('id', { count: 'exact', head: true });

    // 5. Last 7 days attendance trend
    const last7DaysAttendance: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];

      const { count } = await adminClient
        .from('attendances')
        .select('id', { count: 'exact', head: true })
        .eq('date', ds);

      last7DaysAttendance.push({ date: ds, count: count || 0 });
    }

    // 6. Status breakdown
    const { data: allStatuses } = await adminClient
      .from('attendances')
      .select('status');

    const countsByStatus: Record<string, number> = {};
    for (const r of allStatuses || []) {
      const s = r.status || 'present';
      countsByStatus[s] = (countsByStatus[s] || 0) + 1;
    }

    const statusBreakdown = Object.entries(countsByStatus).map(([status, count]) => ({
      _id: status,
      count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalLocations: totalLocations || 0,
        todayAttendance: todayAttendance || 0,
        totalAttendance: totalAttendance || 0,
        last7DaysAttendance,
        statusBreakdown,
      },
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
