import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Calendar, Clock, MapPin, User, Filter, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getAthleteSessions } from '@/lib/athlete/attendance-actions';

export default async function SchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const athleteResult = await supabase
    .from('athletes')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();
  const athlete = athleteResult.data as { id: string; club_id: string } | null;

  if (!athlete) {
    redirect('/dashboard/athlete');
  }

  // Get all sessions (upcoming and past)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allSessionsResult = await supabase
    .from('training_sessions')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('club_id', athlete.club_id)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });
  const allSessions = allSessionsResult.data as any[] | null;

  // Get attendance records for this athlete
  const attendanceRecordsResult = await supabase
    .from('attendance_logs')
    .select('training_session_id, status, check_in_time')
    .eq('athlete_id', athlete.id);
  const attendanceRecords = attendanceRecordsResult.data as Array<{
    training_session_id: string;
    status: string;
    check_in_time: string | null;
  }> | null;

  // Create attendance map
  const attendanceMap = new Map(
    attendanceRecords?.map((record) => [
      record.training_session_id,
      { status: record.status, check_in_time: record.check_in_time },
    ]) || []
  );

  // Enhance sessions with attendance info
  const enhancedSessions = allSessions?.map((session) => {
    const attendance = attendanceMap.get(session.id);
    const sessionDate = new Date(session.session_date);
    const isPast = sessionDate < today;
    const isToday = sessionDate.toDateString() === today.toDateString();
    
    return {
      ...session,
      attendance_status: attendance?.status,
      check_in_time: attendance?.check_in_time,
      is_past: isPast,
      is_today: isToday,
      coach_name: session.coaches 
        ? `${session.coaches.first_name} ${session.coaches.last_name}`
        : undefined,
    };
  }) || [];

  // Separate into categories
  const todaySessions = enhancedSessions.filter((s) => s.is_today);
  const upcomingSessions = enhancedSessions.filter(
    (s) => !s.is_past && !s.is_today
  );
  const pastSessions = enhancedSessions.filter((s) => s.is_past).reverse();

  // Calculate stats
  const totalSessions = enhancedSessions.length;
  const attendedCount = enhancedSessions.filter(
    (s) => s.attendance_status === 'present'
  ).length;
  const missedCount = enhancedSessions.filter(
    (s) => s.is_past && !s.attendance_status
  ).length;
  const attendanceRate = totalSessions > 0 
    ? Math.round((attendedCount / totalSessions) * 100) 
    : 0;

  const renderSessionCard = (session: any) => {
    const getStatusBadge = () => {
      if (session.attendance_status === 'present') {
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-black text-white text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            เข้าร่วมแล้ว
          </div>
        );
      }
      if (session.attendance_status === 'absent') {
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            ขาดฝึก
          </div>
        );
      }
      if (session.is_today) {
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-black text-white text-xs font-medium rounded-full">
            <AlertCircle className="w-3 h-3" />
            วันนี้
          </div>
        );
      }
      return null;
    };

    return (
      <Link
        key={session.id}
        href={`/dashboard/athlete/schedule/${session.id}`}
        className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-black transition-colors group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-black mb-1 group-hover:underline">
              {session.title || session.session_name || 'การฝึกซ้อม'}
            </h3>
            {session.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {session.description}
              </p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)} น.
            </span>
          </div>

          {session.location && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{session.location}</span>
            </div>
          )}

          {session.coach_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              <span>โค้ช {session.coach_name}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {new Date(session.session_date).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2">ตารางฝึกซ้อม</h1>
        <p className="text-sm text-gray-600">
          ดูตารางการฝึกซ้อมและเช็คสถานะการเข้าร่วม
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{totalSessions}</p>
          <p className="text-xs text-gray-500 mt-1">ทั้งหมด</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{attendedCount}</p>
          <p className="text-xs text-gray-500 mt-1">เข้าร่วม</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{attendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-1">อัตราเข้าร่วม</p>
        </div>
      </div>

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-black"></div>
            <h2 className="text-sm font-bold text-black">วันนี้</h2>
          </div>
          <div className="space-y-3">
            {todaySessions.map(renderSessionCard)}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-bold text-black">กำลังจะมาถึง</h2>
            <span className="text-xs text-gray-500">({upcomingSessions.length})</span>
          </div>
          <div className="space-y-3">
            {upcomingSessions.slice(0, 10).map(renderSessionCard)}
          </div>
          {upcomingSessions.length > 10 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              และอีก {upcomingSessions.length - 10} รายการ
            </p>
          )}
        </div>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-black">ผ่านมาแล้ว</h2>
            <span className="text-xs text-gray-500">({pastSessions.length})</span>
          </div>
          <div className="space-y-3 opacity-60">
            {pastSessions.slice(0, 5).map(renderSessionCard)}
          </div>
          {pastSessions.length > 5 && (
            <Link
              href="/dashboard/athlete/attendance"
              className="block text-center text-xs text-gray-600 hover:text-black mt-3 py-2"
            >
              ดูประวัติทั้งหมด →
            </Link>
          )}
        </div>
      )}

      {/* Empty State */}
      {totalSessions === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-black mb-2">
            ยังไม่มีตารางฝึกซ้อม
          </h3>
          <p className="text-sm text-gray-600">
            โค้ชจะสร้างตารางการฝึกซ้อมและแสดงที่นี่
          </p>
        </div>
      )}
    </div>
  );
}
