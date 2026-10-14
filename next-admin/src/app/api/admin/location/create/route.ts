import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/supabase/server';
import { formatLocationForClient, Location } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { locationName, latitude, longitude, radius, description } = body;

    if (!locationName || latitude == null || longitude == null) {
      return NextResponse.json(
        { success: false, message: 'locationName, latitude, longitude are required.' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = radius != null ? parseFloat(radius) : 100;

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid GPS coordinates.' },
        { status: 400 }
      );
    }

    if (isNaN(rad) || rad < 10 || rad > 5000) {
      return NextResponse.json(
        { success: false, message: 'Radius must be between 10 and 5000 meters.' },
        { status: 400 }
      );
    }

    // Insert using user client so trigger locations_set_created_by sets created_by = auth.uid()
    const { data: newLocation, error } = await auth.userClient!
      .from('locations')
      .insert({
        location_name: locationName.trim(),
        latitude: lat,
        longitude: lon,
        radius: rad,
        description: (description || '').trim(),
        is_active: true,
      })
      .select('*, profiles(name, email)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Location name already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Location created.',
        data: {
          location: formatLocationForClient(newLocation as Location),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Create location error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
