import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { formatUserForClient, Profile } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, department, employeeId, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const adminClient = createAdminClient();
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { success: false, message: 'Email already registered.' },
        { status: 409 }
      );
    }

    // Provision user via Supabase Auth Admin API (auto-confirmed)
    // Never trust client-supplied roles: user_metadata only copies non-privileged fields.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        department: (department || '').trim(),
        employee_id: (employeeId || '').trim(),
        phone: (phone || '').trim(),
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, message: authError?.message || 'Registration failed.' },
        { status: 400 }
      );
    }

    // Now sign in to obtain a valid access token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (sessionError || !sessionData.session) {
      return NextResponse.json(
        { success: false, message: 'User registered, but failed to start session.' },
        { status: 500 }
      );
    }

    // Fetch the created profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful.',
        data: {
          token: sessionData.session.access_token,
          user: formatUserForClient(profile as Profile),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Registration route error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
