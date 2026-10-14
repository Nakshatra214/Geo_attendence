import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';
import { formatUserForClient, Profile } from '@/lib/supabase/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;

    if (id === auth.user!.id) {
      return NextResponse.json(
        { success: false, message: 'Admins cannot change their own active status.' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current active state
    const { data: userProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !userProfile) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const newActiveState = !userProfile.is_active;

    // 2. Call the authorized admin RPC admin_set_user_active with admin's client
    const { data: updatedProfile, error: rpcError } = await auth.userClient!.rpc(
      'admin_set_user_active',
      {
        p_user_id: id,
        p_is_active: newActiveState,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { success: false, message: rpcError.message || 'Failed to update user status.' },
        { status: 400 }
      );
    }

    // 3. Trusted server code: perform Auth Admin API ban/unban operation
    let authBanWarning: string | null = null;
    try {
      if (!newActiveState) {
        // Deactivate: ban for 100 years
        const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
          ban_duration: '876000h',
        });
        if (banError) {
          console.error('Partial failure: Profile deactivated but Auth ban failed:', banError.message);
          authBanWarning = 'Profile updated, but Auth session ban failed: ' + banError.message;
        }
      } else {
        // Activate: remove ban
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        });
        if (unbanError) {
          console.error('Partial failure: Profile activated but Auth unban failed:', unbanError.message);
          authBanWarning = 'Profile updated, but Auth session unban failed: ' + unbanError.message;
        }
      }
    } catch (authOpErr: any) {
      console.error('Exception during Auth Admin ban operation:', authOpErr);
      authBanWarning = 'Profile updated, but Auth Admin API threw an exception: ' + authOpErr.message;
    }

    return NextResponse.json({
      success: true,
      message: `User ${newActiveState ? 'activated' : 'deactivated'}.${authBanWarning ? ` Note: ${authBanWarning}` : ''}`,
      data: {
        user: formatUserForClient(updatedProfile as Profile),
        warning: authBanWarning,
      },
    });
  } catch (err: any) {
    console.error('Toggle user status error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
