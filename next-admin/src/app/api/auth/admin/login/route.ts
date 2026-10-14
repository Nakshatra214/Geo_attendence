import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/server';
import { formatUserForClient, Profile } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Sign in via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, message: 'Admin account not found.' },
        { status: 401 }
      );
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Contact admin.' },
        { status: 403 }
      );
    }

    // Update last_login
    await adminClient
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id);

    return NextResponse.json({
      success: true,
      message: 'Admin login successful.',
      data: {
        token: authData.session.access_token,
        user: formatUserForClient(profile as Profile),
      },
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
