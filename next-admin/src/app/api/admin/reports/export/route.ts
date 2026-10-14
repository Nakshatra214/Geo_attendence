import { NextResponse } from 'next/server';
import { authenticateAdmin, createAdminClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const adminClient = createAdminClient();

    let query = adminClient
      .from('attendances')
      .select('*, profiles!attendances_user_fk(name, email, department, employee_id), locations(location_name)')
      .order('date', { ascending: false });

    if (month && year) {
      const m = String(month).padStart(2, '0');
      const start = `${year}-${m}-01`;
      const nextMonth = parseInt(m, 10) === 12 ? 1 : parseInt(m, 10) + 1;
      const nextYear = parseInt(m, 10) === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
      const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      query = query.gte('date', start).lt('date', end);
    } else if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const data = (records || []).map((r: any) => ({
      Name: r.profiles?.name || '',
      Email: r.profiles?.email || '',
      Department: r.profiles?.department || '',
      EmployeeID: r.profiles?.employee_id || '',
      Date: r.date,
      Status: r.status,
      CheckIn: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '',
      CheckOut: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '',
      WorkingHrs: r.working_hours != null ? `${r.working_hours}h` : '',
      Location: r.locations?.location_name || '',
      Distance: r.distance_at_check_in != null ? `${r.distance_at_check_in}m` : '',
    }));

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=attendance_${year || 'all'}_${month || 'all'}.xlsx`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        records: data,
        total: data.length,
      },
    });
  } catch (err: any) {
    console.error('Export report error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
