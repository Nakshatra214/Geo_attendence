import { NextResponse } from 'next/server';
import { authenticateUser, resolveLocationId, createAdminClient } from '@/lib/supabase/server';
import { formatAttendanceForClient, Attendance } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { latitude, longitude, locationId } = body;

    if (latitude == null || longitude == null || !locationId) {
      return NextResponse.json(
        { success: false, message: 'latitude, longitude, and locationId are required.' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid GPS coordinates.' },
        { status: 400 }
      );
    }

    // Resolve legacy Mongo ID to PostgreSQL UUID if sent by existing mobile app
    const resolvedLocationId = await resolveLocationId(locationId, auth.userClient!);

    // Call PostgreSQL RPC rpc_check_in with the authenticated user's client
    // Rule: Attendance RPCs must receive the authenticated user's access token so auth.uid() identifies the actual user.
    const { data: attendanceRow, error: rpcError } = await auth.userClient!.rpc('rpc_check_in', {
      p_latitude: lat,
      p_longitude: lon,
      p_location_id: resolvedLocationId,
    });

    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('Attendance already marked for today') || rpcError.code === 'PT409' || msg.includes('unique_user_daily_attendance')) {
        return NextResponse.json(
          { success: false, message: 'Attendance already marked for today.' },
          { status: 409 }
        );
      }
      if (msg.includes('away from') || msg.includes('Must be within') || rpcError.code === 'PT403') {
        return NextResponse.json(
          { success: false, message: msg },
          { status: 403 }
        );
      }
      if (msg.includes('Location not found') || rpcError.code === 'PT404') {
        return NextResponse.json(
          { success: false, message: 'Authorized location not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, message: msg || 'Check-in failed.' },
        { status: 400 }
      );
    }

    // Fetch location details for Flutter client compatibility (nested locationId)
    const adminClient = createAdminClient();
    const { data: locationData } = await adminClient
      .from('locations')
      .select('id, location_name, latitude, longitude, radius')
      .eq('id', resolvedLocationId)
      .maybeSingle();

    const formattedAttendance = formatAttendanceForClient(
      attendanceRow as Attendance,
      locationData,
      auth.profile
    );

    return NextResponse.json(
      {
        success: true,
        message: `Check-in successful at "${locationData?.location_name || 'Location'}" (${attendanceRow.distance_at_check_in || 0}m away).`,
        data: {
          attendance: formattedAttendance,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
