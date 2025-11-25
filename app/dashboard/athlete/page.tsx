import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarDays, TrendingUp, Award, Clock, Bell, Users, FileText, Activity } from 'lucide-react';
import Link from 'next/link';
import { RecommendationCard } from '@/components/athlete/RecommendationCard';
import { GoalsWidget } from '@/components/athlete/GoalsWidget';

interface AthleteProfile {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  profile_picture_url?: string;
  clubs?: {
    id: string;
    name: string;
  };
}

interface AttendanceLog {
  id: string;
  session_date: string;
  status: string;
  training_sessions?: {
    session_name: string;
    session_type: string;
  };
}

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  result_value: number;
  result_unit: string;
  notes?: string;
}

export default async function AthleteDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: profile, error: profileError } = (await supabase
    .from('athletes')
    .select(
      `
      *,
      clubs (id, name)
    `
    )
    .eq('user_id', user.id)
    .single()) as { data: AthleteProfile | null; error: any };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4 text-red-600">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูลนักกีฬา</h2>
          <p className="text-gray-600 mb-6">
            ไม่พบข้อมูลโปรไฟล์นักกีฬาสำหรับบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <div className="space-y-2 text-sm text-left bg-gray-50 p-4 rounded">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {profileError && <p className="text-red-600"><strong>Error:</strong> {profileError.message}</p>}
          </div>
          <div className="mt-6 space-y-2">
            <Link
              href="/dashboard/athlete/applications"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-center"
            >
              ดูใบสมัครของฉัน
            </Link>
            <Link
              href="/logout"
              className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 text-center"
            >
              ออกจากระบบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate date ranges
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get statistics with error handling
  const { count: totalAttendance, error: totalAttError } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id)
    .eq('status', 'present');

  const { count: monthlyAttendance, error: monthlyAttError } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id)
    .eq('status', 'present')
    .gte('session_date', startOfMonth.toISOString());

  const { count: totalPerformance, error: perfError } = await supabase
    .from('performance_records')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id);

  // Get recent attendance (last 5)
  const { data: recentAttendance, error: recentAttError } = (await supabase
    .from('attendance_logs')
    .select(
      `
      *,
      training_sessions (
        session_name,
        session_type
      )
    `
    )
    .eq('athlete_id', profile.id)
    .order('session_date', { ascending: false })
    .limit(5)) as { data: AttendanceLog[] | null; error: any };

  // Get recent performance records (last 5)
  const { data: recentPerformance, error: recentPerfError } = (await supabase
    .from('performance_records')
    .select('*')
    .eq('athlete_id', profile.id)
    .order('test_date', { ascending: false })
    .limit(5)) as { data: PerformanceRecord[] | null; error: any };

  // Get athlete goals
  const { data: goals } = await supabase
    .from('athlete_goals')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', profile.id)
    .order('created_at', { ascending: false });

  // Get announcements from club coaches (only if club exists)
  let announcements = null;
  if (profile.clubs?.id) {
    const { data, error: annError } = await supabase
      .from('announcements')
      .select(`
        *,
        announcement_reads!left(user_id)
      `)
      .eq('club_id', profile.clubs.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    
    announcements = data;
  }

  // Get upcoming sessions count (only if club exists)
  let upcomingSessionsCount = 0;
  if (profile.clubs?.id) {
    const { count, error: sessError } = await supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', profile.clubs.id)
      .gte('session_date', today.toISOString());
    
    upcomingSessionsCount = count || 0;
  }

  // Calculate attendance rate as progress percentage
  const totalSessions = (totalAttendance || 0) + (monthlyAttendance || 0);
  const progressPercentage = totalSessions > 0 
    ? Math.round(((totalAttendance || 0) / Math.max(totalSessions, 1)) * 100)
    : 0;

  // Generate smart recommendations
  const recommendations = [];

  // Priority 1: No club membership
  if (!profile.clubs?.id) {
    recommendations.push({
      id: 'join-club',
      title: 'เข้าร่วมสโมสรเพื่อเริ่มต้น',
      description: 'คุณยังไม่ได้เป็นสมาชิกสโมสร กรุณาสมัครเพื่อเข้าถึงฟีเจอร์ทั้งหมด',
      action: 'สมัครเข้าสโมสร',
      href: '/dashboard/athlete/applications',
      priority: 'high' as const,
      icon: <Users className="w-5 h-5 text-red-600" />,
    });
  }

  // Priority 2: Unread announcements
  if (announcements && announcements.length > 0) {
    const unreadCount = announcements.filter(
      (ann: any) => !ann.announcement_reads?.some((read: any) => read.user_id === user.id)
    ).length;
    
    if (unreadCount > 0) {
      recommendations.push({
        id: 'unread-announcements',
        title: `คุณมีประกาศใหม่ ${unreadCount} รายการ`,
        description: 'โค้ชได้ประกาศข้อมูลสำคัญ อ่านเพื่อไม่พลาดข่าวสาร',
        action: 'อ่านประกาศ',
        href: '/dashboard/athlete/announcements',
        priority: 'high' as const,
        icon: <Bell className="w-5 h-5 text-red-600" />,
      });
    }
  }

  // Priority 3: Today's sessions
  if (profile.clubs?.id) {
    const todaySessionsResult = await supabase
      .from('training_sessions')
      .select('id, session_name, start_time')
      .eq('club_id', profile.clubs.id)
      .gte('session_date', today.toISOString())
      .lt('session_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    const todaySessions = todaySessionsResult.data as Array<{
      id: string;
      session_name: string;
      start_time: string;
    }> | null;

    if (todaySessions && todaySessions.length > 0) {
      recommendations.push({
        id: 'today-session',
        title: 'มีการฝึกซ้อมวันนี้',
        description: `${todaySessions[0].session_name} - อย่าลืมเช็คอินเมื่อถึงเวลา`,
        action: 'ดูรายละเอียด',
        href: '/dashboard/athlete/schedule',
        priority: 'high' as const,
        icon: <CalendarDays className="w-5 h-5 text-red-600" />,
      });
    }
  }

  // Priority 4: Tomorrow's sessions
  if (profile.clubs?.id) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const tomorrowSessionsResult = await supabase
      .from('training_sessions')
      .select('id, session_name, start_time')
      .eq('club_id', profile.clubs.id)
      .gte('session_date', tomorrow.toISOString())
      .lt('session_date', dayAfterTomorrow.toISOString())
      .limit(1);
    const tomorrowSessions = tomorrowSessionsResult.data as Array<{
      id: string;
      session_name: string;
      start_time: string;
    }> | null;

    if (tomorrowSessions && tomorrowSessions.length > 0) {
      recommendations.push({
        id: 'tomorrow-session',
        title: 'เตรียมตัวสำหรับพรุ่งนี้',
        description: `${tomorrowSessions[0].session_name} - เตรียมอุปกรณ์และพักผ่อนให้เพียงพอ`,
        action: 'ดูตารางฝึก',
        href: '/dashboard/athlete/schedule',
        priority: 'medium' as const,
        icon: <CalendarDays className="w-5 h-5 text-yellow-600" />,
      });
    }
  }

  // Priority 5: Low attendance this month
  if (profile.clubs?.id && (monthlyAttendance || 0) < 4 && (monthlyAttendance || 0) > 0) {
    recommendations.push({
      id: 'low-attendance',
      title: 'เพิ่มความสม่ำเสมอในการฝึก',
      description: `คุณเข้าฝึกเพียง ${monthlyAttendance || 0} ครั้งในเดือนนี้ พยายามเข้าฝึกให้สม่ำเสมอเพื่อพัฒนาทักษะ`,
      action: 'ดูตารางฝึก',
      href: '/dashboard/athlete/schedule',
      priority: 'medium' as const,
      icon: <Activity className="w-5 h-5 text-yellow-600" />,
    });
  }

  // Priority 6: Great attendance streak
  if (profile.clubs?.id && (monthlyAttendance || 0) >= 8) {
    recommendations.push({
      id: 'great-attendance',
      title: 'เยี่ยมมาก! คุณมีความสม่ำเสมอสูง',
      description: `คุณเข้าฝึก ${monthlyAttendance} ครั้งในเดือนนี้ รักษาฟอร์มนี้ไว้นะ!`,
      action: 'ดูสถิติ',
      href: '/dashboard/athlete/attendance',
      priority: 'low' as const,
      icon: <Award className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 7: No performance records
  if (profile.clubs?.id && (totalPerformance || 0) === 0) {
    recommendations.push({
      id: 'no-performance',
      title: 'ยังไม่มีผลการทดสอบ',
      description: 'ติดตามผลการทดสอบของคุณเพื่อดูความก้าวหน้าและพัฒนาตนเอง',
      action: 'ดูผลทดสอบ',
      href: '/dashboard/athlete/performance',
      priority: 'low' as const,
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 8: Recent performance improvement
  if (recentPerformance && recentPerformance.length >= 2) {
    const latest = recentPerformance[0];
    const previous = recentPerformance[1];
    if (latest.result_value > previous.result_value && latest.test_type === previous.test_type) {
      recommendations.push({
        id: 'performance-improved',
        title: 'ผลการทดสอบของคุณดีขึ้น!',
        description: `${latest.test_type} ของคุณพัฒนาขึ้น ทำได้ดีมาก!`,
        action: 'ดูรายละเอียด',
        href: '/dashboard/athlete/performance',
        priority: 'low' as const,
        icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      });
    }
  }

  // Priority 9: Check activities
  if (profile.clubs?.id && upcomingSessionsCount === 0) {
    recommendations.push({
      id: 'check-activities',
      title: 'ตรวจสอบกิจกรรมใหม่',
      description: 'ดูกิจกรรมและการฝึกซ้อมที่กำลังจะมาถึง เพื่อวางแผนการเข้าร่วม',
      action: 'ดูกิจกรรม',
      href: '/dashboard/athlete/activities',
      priority: 'low' as const,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 10: Profile completion
  if (!profile.nickname || !profile.profile_picture_url) {
    recommendations.push({
      id: 'complete-profile',
      title: 'ทำโปรไฟล์ให้สมบูรณ์',
      description: 'เพิ่มรูปโปรไฟล์และชื่อเล่นเพื่อให้โค้ชและเพื่อนๆ รู้จักคุณมากขึ้น',
      action: 'แก้ไขโปรไฟล์',
      href: '/dashboard/athlete/profile/edit',
      priority: 'low' as const,
      icon: <Users className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 11: Long time no activity
  if (recentAttendance && recentAttendance.length > 0) {
    const lastAttendance = new Date(recentAttendance[0].session_date);
    const daysSinceLastAttendance = Math.floor((today.getTime() - lastAttendance.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastAttendance > 7 && profile.clubs?.id) {
      recommendations.push({
        id: 'long-absence',
        title: 'คิดถึงคุณแล้ว!',
        description: `คุณไม่ได้เข้าฝึกมา ${daysSinceLastAttendance} วันแล้ว กลับมาฝึกกับเราอีกครั้งนะ`,
        action: 'ดูตารางฝึก',
        href: '/dashboard/athlete/schedule',
        priority: 'medium' as const,
        icon: <Activity className="w-5 h-5 text-yellow-600" />,
      });
    }
  }

  // Sort by priority and limit to top 3
  const sortedRecommendations = recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  return (
    <div className="max-w-lg mx-auto">
      {/* No Club Warning */}
      {!profile.clubs?.id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                คุณยังไม่ได้เข้าร่วมสโมสร
              </h3>
              <p className="text-xs text-yellow-700 mb-2">
                กรุณาสมัครเข้าร่วมสโมสรเพื่อเข้าถึงฟีเจอร์ทั้งหมด
              </p>
              <Link
                href="/dashboard/athlete/applications"
                className="inline-block text-xs font-medium text-yellow-900 underline hover:text-yellow-800"
              >
                ดูใบสมัครของฉัน →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold">
            {profile.first_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-black">
              {profile.first_name} {profile.last_name}
            </h1>
            {profile.nickname && (
              <p className="text-sm text-gray-600">({profile.nickname})</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {profile.clubs?.name || 'ยังไม่ได้เข้าร่วมสโมสร'}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <RecommendationCard recommendations={sortedRecommendations} />

      {/* Goals Widget */}
      {goals && goals.length > 0 && <GoalsWidget goals={goals} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-black" />
            </div>
          </div>
          <p className="text-2xl font-bold text-black">{totalAttendance || 0}</p>
          <p className="text-xs text-gray-600">ครั้งทั้งหมด</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-black" />
            </div>
          </div>
          <p className="text-2xl font-bold text-black">{monthlyAttendance || 0}</p>
          <p className="text-xs text-gray-600">เดือนนี้</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
          </div>
          <p className="text-2xl font-bold text-black">{totalPerformance || 0}</p>
          <p className="text-xs text-gray-600">ผลการทดสอบ</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-black" />
            </div>
          </div>
          <p className="text-2xl font-bold text-black">{progressPercentage}%</p>
          <p className="text-xs text-gray-600">ความก้าวหน้า</p>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessionsCount && upcomingSessionsCount > 0 && (
        <Link
          href="/dashboard/athlete/schedule"
          className="block bg-black border border-gray-200 rounded-2xl p-5 mb-4 text-white hover:bg-gray-900 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">การฝึกซ้อมที่กำลังจะมาถึง</p>
              <p className="text-2xl font-bold mt-1">{upcomingSessionsCount} รายการ</p>
            </div>
            <CalendarDays className="w-10 h-10 opacity-60" />
          </div>
        </Link>
      )}

      {/* Announcements Section - Enhanced */}
      {announcements && announcements.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-black">ประกาศจากโค้ช</h2>
              {(() => {
                const unreadCount = announcements.filter(
                  (ann: any) => !ann.announcement_reads?.some((read: any) => read.user_id === user.id)
                ).length;
                return unreadCount > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadCount}
                  </span>
                ) : null;
              })()}
            </div>
            <Link 
              href="/dashboard/athlete/announcements" 
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((announcement: any) => {
              const isRead = announcement.announcement_reads?.some(
                (read: any) => read.user_id === user.id
              );
              const getPriorityStyles = (priority: string) => {
                switch (priority) {
                  case 'urgent':
                    return 'bg-red-50 border-red-300';
                  case 'high':
                    return 'bg-orange-50 border-orange-300';
                  default:
                    return isRead ? 'border-gray-200' : 'border-black';
                }
              };
              const getPriorityBadge = (priority: string) => {
                switch (priority) {
                  case 'urgent':
                    return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">เร่งด่วน</span>;
                  case 'high':
                    return <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">สำคัญ</span>;
                  default:
                    return null;
                }
              };
              return (
                <Link
                  key={announcement.id}
                  href="/dashboard/athlete/announcements"
                  className={`block bg-white rounded-2xl p-4 shadow-sm border-2 transition-all hover:shadow-md ${
                    getPriorityStyles(announcement.priority)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      announcement.priority === 'urgent' ? 'bg-red-600' :
                      announcement.priority === 'high' ? 'bg-orange-600' :
                      'bg-black'
                    }`}>
                      <Bell className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {!isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></div>
                        )}
                        <h3 className="font-bold text-black text-sm line-clamp-1 flex-1">
                          {announcement.title}
                        </h3>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {announcement.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString('th-TH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-black mb-4">เมนูด่วน</h2>
        <div className="grid grid-cols-4 gap-3">
          <Link
            href="/dashboard/athlete/announcements"
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors relative"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-black" />
            </div>
            {(() => {
              const unreadCount = announcements?.filter(
                (ann: any) => !ann.announcement_reads?.some((read: any) => read.user_id === user.id)
              ).length || 0;
              return unreadCount > 0 ? (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              ) : null;
            })()}
            <span className="text-xs text-gray-700 text-center">ประกาศ</span>
          </Link>

          <Link
            href="/dashboard/athlete/activities"
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 text-center">กิจกรรม</span>
          </Link>

          <Link
            href="/dashboard/athlete/schedule"
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-black" />
            </div>
            <span className="text-xs text-gray-700 text-center">ตารางฝึก</span>
          </Link>

          <Link
            href="/dashboard/athlete/performance"
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <span className="text-xs text-gray-700 text-center">ผลทดสอบ</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      {(recentAttendance && recentAttendance.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-black mb-4">กิจกรรมล่าสุด</h2>
          <div className="space-y-3">
            {recentAttendance.slice(0, 3).map((attendance) => (
              <div key={attendance.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${
                  attendance.status === 'present' ? 'bg-black' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">
                    {attendance.training_sessions?.session_name || 'การฝึกซ้อม'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(attendance.session_date).toLocaleDateString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  attendance.status === 'present' 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}>
                  {attendance.status === 'present' ? 'เข้าร่วม' : 'ขาด'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
