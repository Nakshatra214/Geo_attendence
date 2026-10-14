import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';

export async function PUT(request: Request) {
  try {
    const auth = await authenticateUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Both passwords are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Verify current password by testing sign-in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: auth.user!.email!,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    // Update password with user's client
    const { error: updateError } = await auth.userClient!.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
