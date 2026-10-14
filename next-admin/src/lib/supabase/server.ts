import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Profile } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates an authenticated Supabase client using the caller's JWT token.
 * This guarantees that PostgreSQL functions like `rpc_check_in` and `rpc_check_out`
 * receive the caller's real identity via `auth.uid()`.
 */
export function createClientFromToken(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

/**
 * Creates an admin Supabase client with the service-role key.
 * Used ONLY on the server for privileged operations like Auth Admin bans.
 * NEVER exposed to client-side bundles or used for RPC check-in/out.
 */
export function createAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in server environment');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

/**
 * Extracts Bearer token from Request Authorization header or cookie
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Also check cookie (for dashboard SSR / API calls from browser)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/sb-access-token=([^;]+)/) || cookieHeader.match(/adminToken=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Verifies authenticated user and returns their profile
 */
export async function authenticateUser(request: Request) {
  const token = extractToken(request);
  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Access denied. No token provided.' },
        { status: 401 }
      ),
      user: null,
      profile: null,
      token: null,
      userClient: null,
    };
  }

  const userClient = createClientFromToken(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Invalid or expired token.' },
        { status: 401 }
      ),
      user: null,
      profile: null,
      token: null,
      userClient: null,
    };
  }

  // Fetch profile using admin client to reliably inspect is_active flag
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: NextResponse.json(
        { success: false, message: 'User profile not found.' },
        { status: 401 }
      ),
      user: null,
      profile: null,
      token: null,
      userClient: null,
    };
  }

  if (!profile.is_active) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Account is deactivated. Contact admin.' },
        { status: 403 }
      ),
      user: null,
      profile: null,
      token: null,
      userClient: null,
    };
  }

  return {
    error: null,
    user,
    profile: profile as Profile,
    token,
    userClient,
  };
}

/**
 * Verifies that the caller has admin privileges
 */
export async function authenticateAdmin(request: Request) {
  const auth = await authenticateUser(request);
  if (auth.error) return auth;

  if (auth.profile?.role !== 'admin') {
    return {
      error: NextResponse.json(
        { success: false, message: 'Admin access required.' },
        { status: 403 }
      ),
      user: null,
      profile: null,
      token: null,
      userClient: null,
    };
  }

  return auth;
}

/**
 * Resolves a location ID that might be a legacy 24-character MongoDB hex ObjectId
 * to the corresponding PostgreSQL UUID in `public.locations`.
 */
export async function resolveLocationId(locationId: string, client: SupabaseClient): Promise<string> {
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(locationId);
  if (!isMongoId) {
    return locationId; // Already a UUID or invalid format
  }

  // Query locations table by legacy_mongo_id
  const { data, error } = await client
    .from('locations')
    .select('id')
    .eq('legacy_mongo_id', locationId)
    .maybeSingle();

  if (data?.id) {
    return data.id;
  }

  // If not found by legacy ID, return original
  return locationId;
}
