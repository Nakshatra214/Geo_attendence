import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';
import { formatLocationForClient, Location } from '@/lib/supabase/types';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;
    const body = await request.json();

    const updates: Record<string, any> = {};
    if (body.locationName !== undefined) updates.location_name = body.locationName.trim();
    if (body.latitude !== undefined) updates.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) updates.longitude = parseFloat(body.longitude);
    if (body.radius !== undefined) updates.radius = parseFloat(body.radius);
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);

    const adminClient = createAdminClient();
    const { data: updatedLocation, error } = await adminClient
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select('*, profiles(name, email)')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Location name already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    if (!updatedLocation) {
      return NextResponse.json({ success: false, message: 'Location not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated.',
      data: {
        location: formatLocationForClient(updatedLocation as Location),
      },
    });
  } catch (err: any) {
    console.error('Update location error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;
    const adminClient = createAdminClient();

    // Check if location exists
    const { data: loc } = await adminClient
      .from('locations')
      .select('id, location_name')
      .eq('id', id)
      .maybeSingle();

    if (!loc) {
      return NextResponse.json({ success: false, message: 'Location not found.' }, { status: 404 });
    }

    // Try hard delete; if attendances reference it, ON DELETE RESTRICT will fail with 23503
    const { error: deleteError } = await adminClient
      .from('locations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      if (deleteError.code === '23503') {
        // FK restriction: attendances exist. Soft delete instead!
        await adminClient.from('locations').update({ is_active: false }).eq('id', id);
        return NextResponse.json({
          success: true,
          message: 'Location has historical attendance records and was deactivated instead of permanently deleted.',
        });
      }
      return NextResponse.json({ success: false, message: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted.',
    });
  } catch (err: any) {
    console.error('Delete location error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
