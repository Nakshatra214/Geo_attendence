export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  department: string;
  employee_id: string;
  phone: string;
  is_active: boolean;
  profile_image: string;
  last_login: string | null;
  legacy_mongo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  radius: number;
  description: string;
  is_active: boolean;
  created_by: string | null;
  legacy_mongo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  location_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  distance_at_check_in: number | null;
  status: 'present' | 'absent' | 'late' | 'half-day';
  working_hours: number | null;
  notes: string;
  legacy_mongo_id: string | null;
  created_at: string;
  updated_at: string;
}

// Formatter to maintain exact JSON structure for Flutter and existing Admin Dashboard
export function formatUserForClient(p: Profile) {
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    department: p.department || '',
    employeeId: p.employee_id || '',
    phone: p.phone || '',
    isActive: p.is_active,
    profileImage: p.profile_image || '',
    lastLogin: p.last_login,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function formatLocationForClient(l: Location & { profiles?: { name: string; email: string } | null }) {
  return {
    _id: l.id,
    id: l.id,
    locationName: l.location_name,
    latitude: l.latitude,
    longitude: l.longitude,
    radius: l.radius,
    description: l.description || '',
    isActive: l.is_active,
    createdBy: l.profiles ? { name: l.profiles.name, email: l.profiles.email } : null,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

export function formatAttendanceForClient(
  a: Attendance,
  location?: { location_name: string; latitude?: number; longitude?: number; radius?: number } | null,
  user?: { name: string; email: string; department?: string; employee_id?: string } | null
) {
  return {
    _id: a.id,
    id: a.id,
    userId: user ? {
      _id: a.user_id,
      id: a.user_id,
      name: user.name,
      email: user.email,
      department: user.department || '',
      employeeId: user.employee_id || '',
    } : a.user_id,
    locationId: location ? {
      _id: a.location_id,
      id: a.location_id,
      locationName: location.location_name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
    } : a.location_id,
    date: a.date,
    checkInTime: a.check_in_time,
    checkOutTime: a.check_out_time,
    checkInLatitude: a.check_in_latitude,
    checkInLongitude: a.check_in_longitude,
    checkOutLatitude: a.check_out_latitude,
    checkOutLongitude: a.check_out_longitude,
    distanceAtCheckIn: a.distance_at_check_in,
    status: a.status,
    workingHours: a.working_hours,
    notes: a.notes,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}
