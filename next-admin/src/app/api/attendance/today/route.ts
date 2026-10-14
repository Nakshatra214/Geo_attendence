import { NextResponse } from 'next/server';
import { authenticateUser, createAdminClient } from '@/lib/supabase/server';
import { formatAttendanceForClient, Attendance } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const today = new Date().toISOString().split('T')[0];

    // Fetch user's attendance for today
    const { data: attendanceRow, error } = await auth.userClient!
      .from('attendances')
      .select('*')
      .eq('user_id', auth.user!.id)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!attendanceRow) {
      return NextResponse.json({
        success: true,
        data: { attendance: null, date: today },
      });
    }

    // Fetch location details
    const adminClient = createAdminClient();
    const { data: locationData } = await adminClient
      .from('locations')
      .select('id, location_name, latitude, longitude, radius')
      .eq('id', attendanceRow.location_id)
      .maybeSingle();

    const formattedAttendance = formatAttendanceForClient(
      attendanceRow as Attendance,
      locationData,
      auth.profile
    );

    return NextResponse.json({
      success: true,
      data: { attendance: formattedAttendance, date: today },
    });
  } catch (err: any) {
    console.error('Today status error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
