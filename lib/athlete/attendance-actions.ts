'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit/actions';
import { Database } from '@/types/database.types';
import { invalidatePattern } from '@/lib/utils/cache';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];
type AttendanceLog = Database['public']['Tables']['attendance']['Row'];
type AttendanceLogInsert = Database['public']['Tables']['attendance']['Insert'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'];
type LeaveRequestInsert = Database['public']['Tables']['leave_requests']['Insert'];

interface SessionWithAttendance extends TrainingSession {
  attendance?: AttendanceLog | null;
  leave_request?: LeaveRequest | null;
}

interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  attendanceRate: number;
}

/**
 * Get all training sessions for an athlete's club
 * Includes attendance status for each session
 * OPTIMIZED: Added pagination support
 */
export async function getAthleteSessions(filter?: {
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data?: SessionWithAttendance[]; total?: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Build query for sessions with pagination
    const limit = filter?.limit || 100; // Default limit
    const offset = filter?.offset || 0;

    // @ts-ignore
    let query = supabase
      .from('training_sessions')
      .select('*', { count: 'exact' })
      // @ts-ignore
      .eq('club_id', athlete.club_id)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    const today = new Date().toISOString().split('T')[0];

    if (filter?.upcoming) {
      query = query.gte('session_date', today);
    } else if (filter?.past) {
      query = query.lt('session_date', today);
    }

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางฝึกซ้อม' };
    }

    // Get attendance records for this athlete
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
    }

    // Get leave requests for this athlete
    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    if (leaveError) {
      console.error('Leave requests query error:', leaveError);
    }

    // Combine sessions with attendance and leave request data
    const sessionsWithAttendance: SessionWithAttendance[] = (sessions || []).map((session) => {
      const attendance = attendanceRecords?.find(
        // @ts-ignore
        (record) => record.training_session_id === session.id
      );
      const leaveRequest = leaveRequests?.find(
        // @ts-ignore
        (request) => request.session_id === session.id
      );
      return {
        // @ts-ignore - TypeScript has issues with spread on Supabase types
        ...session,
        attendance: attendance || null,
        leave_request: leaveRequest || null,
      };
    });

    return { data: sessionsWithAttendance, total: count || 0 };
  } catch (error) {
    console.error('Unexpected error in getAthleteSessions:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

/**
 * Get details of a specific training session
 */
export async function getSessionDetails(sessionId: string): Promise<{
  data?: SessionWithAttendance;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'ไม่พบตารางฝึกซ้อม' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: 'คุณไม่สามารถดูตารางของสโมสรอื่นได้' };
    }

    // Get attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('training_session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
    }

    // Get leave request
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (leaveError) {
      console.error('Leave request query error:', leaveError);
    }

    return {
      data: {
        // @ts-ignore
        ...session,
        attendance: attendance || null,
        leave_request: leaveRequest || null,
      },
    };
  } catch (error) {
    console.error('Unexpected error in getSessionDetails:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

/**
 * Check in to a training session
 * Validates time window: 30 minutes before to 15 minutes after start time
 */
export async function athleteCheckIn(sessionId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'ไม่พบตารางฝึกซ้อม' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: 'คุณไม่สามารถเช็คอินในตารางของสโมสรอื่นได้' };
    }

    // Check if session is cancelled
    // @ts-ignore
    if (session.status === 'cancelled') {
      return { error: 'ตารางฝึกซ้อมนี้ถูกยกเลิกแล้ว' };
    }

    // Validate check-in time window
    // @ts-ignore
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    
    // 30 minutes before
    const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    // 15 minutes after
    const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

    if (now < earliestCheckIn) {
      return { error: 'ยังไม่ถึงเวลาเช็คอิน (สามารถเช็คอินได้ 30 นาทีก่อนเวลาเริ่ม)' };
    }

    if (now > latestCheckIn) {
      return { error: 'หมดเวลาเช็คอินแล้ว (สามารถเช็คอินได้จนถึง 15 นาทีหลังเวลาเริ่ม)' };
    }

    // Check for existing attendance
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('training_session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return { error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' };
    }

    if (existingAttendance) {
      return { error: 'คุณได้เช็คอินแล้ว' };
    }

    // Determine status based on time
    let status: 'present' | 'late' = 'present';
    if (now > sessionDateTime) {
      status = 'late';
    }

    // Create attendance record
    const attendanceData: AttendanceLogInsert = {
      session_id: sessionId,
      // @ts-ignore
      athlete_id: athlete.id,
      status: status,
      check_in_time: now.toISOString(),
      check_in_method: 'manual',
      notes: null,
    };

    // @ts-ignore
    const { data: newAttendance, error: insertError } = await supabase
      .from('attendance')
      // @ts-ignore
      .insert(attendanceData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'เกิดข้อผิดพลาดในการบันทึกการเช็คอิน' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.create',
      entityType: 'attendance_log',
      // @ts-ignore
      entityId: newAttendance.id,
      details: { session_id: sessionId, status, method: 'self_checkin' },
    });

    revalidatePath('/dashboard/athlete/schedule');
    revalidatePath('/dashboard/athlete/attendance');

    // Invalidate stats cache
    invalidatePattern('attendance-stats:.*');
    invalidatePattern('club-stats:.*');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in athleteCheckIn:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

/**
 * Request leave for a training session
 * Must be at least 2 hours before session start
 * Reason must be at least 10 characters
 */
export async function requestLeave(data: {
  sessionId: string;
  reason: string;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Validate reason
    if (!data.reason || data.reason.trim().length < 10) {
      return { error: 'กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร' };
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'ไม่พบตารางฝึกซ้อม' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: 'คุณไม่สามารถแจ้งลาในตารางของสโมสรอื่นได้' };
    }

    // Check if session is cancelled
    // @ts-ignore
    if (session.status === 'cancelled') {
      return { error: 'ตารางฝึกซ้อมนี้ถูกยกเลิกแล้ว' };
    }

    // Validate timing - must be at least 2 hours before session
    // @ts-ignore
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (sessionDateTime < twoHoursFromNow) {
      return { error: 'ต้องแจ้งลาล่วงหน้าอย่างน้อย 2 ชั่วโมงก่อนเวลาเริ่ม' };
    }

    // Check for existing leave request
    const { data: existingRequest, error: checkError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('session_id', data.sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return { error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' };
    }

    if (existingRequest) {
      return { error: 'คุณได้แจ้งลาสำหรับตารางนี้แล้ว' };
    }

    // Check if already checked in
    const { data: existingAttendance, error: attendanceCheckError } = await supabase
      .from('attendance')
      .select('*')
      .eq('training_session_id', data.sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (attendanceCheckError) {
      console.error('Attendance check error:', attendanceCheckError);
    }

    if (existingAttendance) {
      return { error: 'คุณได้เช็คอินแล้ว ไม่สามารถแจ้งลาได้' };
    }

    // Create leave request
    const leaveRequestData: LeaveRequestInsert = {
      session_id: data.sessionId,
      // @ts-ignore
      athlete_id: athlete.id,
      reason: data.reason.trim(),
      status: 'pending',
      requested_at: now.toISOString(),
    };

    // @ts-ignore
    const { data: newRequest, error: insertError } = await supabase
      .from('leave_requests')
      // @ts-ignore
      .insert(leaveRequestData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'เกิดข้อผิดพลาดในการบันทึกคำขอลา' };
    }

    // Log audit event (using attendance type as leave_request not yet in audit types)
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.create',
      entityType: 'attendance_log',
      // @ts-ignore
      entityId: newRequest.id,
      details: { 
        type: 'leave_request',
        session_id: data.sessionId, 
        reason: data.reason 
      },
    });

    revalidatePath('/dashboard/athlete/schedule');
    revalidatePath('/dashboard/athlete/attendance');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in requestLeave:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

/**
 * Get attendance history for the current athlete
 */
export async function getMyAttendance(filter?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{
  data?: (AttendanceLog & { training_sessions?: TrainingSession })[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Build query
    let query = supabase
      .from('attendance')
      .select(`
        *,
        training_sessions (*)
      `)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false });

    // Apply date filters if provided
    if (filter?.startDate) {
      // @ts-ignore
      query = query.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      query = query.lte('training_sessions.session_date', filter.endDate);
    }

    // Apply limit
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data: attendance, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเข้าร่วม' };
    }

    // @ts-ignore
    return { data: attendance };
  } catch (error) {
    console.error('Unexpected error in getMyAttendance:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

/**
 * Get attendance statistics for the current athlete
 */
export async function getAttendanceStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: AttendanceStats; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ' };
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'ไม่พบข้อมูลนักกีฬา' };
    }

    // Build query
    let query = supabase
      .from('attendance')
      .select(`
        *,
        training_sessions!inner (
          session_date
        )
      `)
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    // Apply date filters if provided
    if (filter?.startDate) {
      // @ts-ignore
      query = query.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      query = query.lte('training_sessions.session_date', filter.endDate);
    }

    const { data: attendance, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' };
    }

    // Calculate statistics
    const totalSessions = attendance?.length || 0;
    // @ts-ignore - TypeScript has issues with nested query types
    const presentCount = attendance?.filter((a) => a.status === 'present').length || 0;
    // @ts-ignore
    const absentCount = attendance?.filter((a) => a.status === 'absent').length || 0;
    // @ts-ignore
    const excusedCount = attendance?.filter((a) => a.status === 'excused').length || 0;
    // @ts-ignore
    const lateCount = attendance?.filter((a) => a.status === 'late').length || 0;

    // Calculate attendance rate (present + late / total)
    const attendanceRate =
      totalSessions > 0
        ? Math.round(((presentCount + lateCount) / totalSessions) * 100 * 10) / 10
        : 0;

    const stats: AttendanceStats = {
      totalSessions,
      presentCount,
      absentCount,
      excusedCount,
      lateCount,
      attendanceRate,
    };

    return { data: stats };
  } catch (error) {
    console.error('Unexpected error in getAttendanceStats:', error);
    return { error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

// Note: requestLeave function is defined earlier in this file (line ~379)
