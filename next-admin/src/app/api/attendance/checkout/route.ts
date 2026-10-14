import { NextResponse } from 'next/server';
import { authenticateUser, createAdminClient } from '@/lib/supabase/server';
import { formatAttendanceForClient, Attendance } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      const body = await request.json();
      if (body.latitude != null) latitude = parseFloat(body.latitude);
      if (body.longitude != null) longitude = parseFloat(body.longitude);
    } catch {
      // Body may be empty, coordinates optional at checkout
    }

    // Call PostgreSQL RPC rpc_check_out with authenticated user client
    const { data: attendanceRow, error: rpcError } = await auth.userClient!.rpc('rpc_check_out', {
      p_latitude: latitude,
      p_longitude: longitude,
    });

    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('No check-in found for today') || rpcError.code === 'PT404') {
        return NextResponse.json(
          { success: false, message: 'No check-in found for today.' },
          { status: 404 }
        );
      }
      if (msg.includes('Already checked out for today') || rpcError.code === 'PT409') {
        return NextResponse.json(
          { success: false, message: 'Already checked out for today.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: msg || 'Check-out failed.' },
        { status: 400 }
      );
    }

    // Fetch location details for Flutter client compatibility
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
      message: `Check-out successful. Total working hours: ${attendanceRow.working_hours || 0}h.`,
      data: {
        attendance: formattedAttendance,
      },
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
