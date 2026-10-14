import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/supabase/server';
import { formatUserForClient, Profile } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    return NextResponse.json({
      success: true,
      data: {
        user: formatUserForClient(auth.profile!),
      },
    });
  } catch (err: any) {
    console.error('Get profile error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.department !== undefined) updates.department = body.department.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.profileImage !== undefined) updates.profile_image = body.profileImage;

    // Use userClient; column-level privileges and RLS allow authenticated users
    // to update their own (name, department, phone, profile_image)
    const { data: updatedProfile, error } = await auth.userClient!
      .from('profiles')
      .update(updates)
      .eq('id', auth.user!.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated.',
      data: {
        user: formatUserForClient(updatedProfile as Profile),
      },
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
