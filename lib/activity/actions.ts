'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Activity Management Actions
// ============================================================================

export async function createActivity(formData: {
  title: string;
  description?: string;
  activity_type: 'training' | 'competition' | 'practice' | 'other';
  activity_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants?: number;
  requires_registration: boolean;
  checkin_window_before?: number;
  checkin_window_after?: number;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    return { error: 'ไม่พบข้อมูลโค้ช' };
  }

  // Create activity
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      club_id: (coach as any).club_id,
      coach_id: (coach as any).id,
      ...formData,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { data: activity };
}

export async function generateQRCode(activityId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Verify coach owns this activity
  const { data: activity } = await supabase
    .from('activities')
    .select('id, coach_id, coaches!inner(user_id)')
    .eq('id', activityId)
    .single();

  if (!activity || activity.coaches.user_id !== user.id) {
    return { error: 'ไม่มีสิทธิ์เข้าถึงกิจกรรมนี้' };
  }

  // Generate QR token using database function
  const { data, error } = await supabase.rpc('generate_activity_qr_token', {
    p_activity_id: activityId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/coach/activities/${activityId}`);
  return { data: { token: data } };
}

// ============================================================================
// Registration Actions
// ============================================================================

export async function registerForActivity(activityId: string, notes?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get athlete profile
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();

  if (!athlete) {
    return { error: 'ไม่พบข้อมูลนักกีฬา' };
  }

  // Check if activity requires registration
  const { data: activity } = await supabase
    .from('activities')
    .select('requires_registration, max_participants')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'ไม่พบกิจกรรม' };
  }

  if (!activity.requires_registration) {
    return { error: 'กิจกรรมนี้ไม่ต้องลงทะเบียนล่วงหน้า' };
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from('activity_registrations')
    .select('id, status')
    .eq('activity_id', activityId)
    .eq('athlete_id', athlete.id)
    .single();

  if (existing) {
    return { error: 'คุณได้ลงทะเบียนกิจกรรมนี้แล้ว' };
  }

  // Check if activity is full
  const { data: isFull } = await supabase.rpc('is_activity_full', {
    p_activity_id: activityId,
  });

  if (isFull) {
    return { error: 'กิจกรรมเต็มแล้ว' };
  }

  // Create registration
  const { data: registration, error } = await supabase
    .from('activity_registrations')
    .insert({
      activity_id: activityId,
      athlete_id: athlete.id,
      athlete_notes: notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { data: registration };
}

export async function cancelRegistration(registrationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  const { error } = await supabase
    .from('activity_registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)
    .eq('status', 'pending');

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { success: true };
}

export async function approveRegistration(registrationId: string, coachNotes?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    return { error: 'ไม่พบข้อมูลโค้ช' };
  }

  const { error } = await supabase
    .from('activity_registrations')
    .update({
      status: 'approved',
      approved_by: coach.id,
      approved_at: new Date().toISOString(),
      coach_notes: coachNotes,
    })
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    return { error: 'ไม่พบข้อมูลโค้ช' };
  }

  const { error } = await supabase
    .from('activity_registrations')
    .update({
      status: 'rejected',
      approved_by: coach.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

export async function removeAthleteFromActivity(registrationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  const { error } = await supabase
    .from('activity_registrations')
    .delete()
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

// ============================================================================
// Check-in Actions
// ============================================================================

export async function checkInWithQR(activityId: string, qrToken: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get athlete profile
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!athlete) {
    return { error: 'ไม่พบข้อมูลนักกีฬา' };
  }

  // Verify QR token
  const { data: activity } = await supabase
    .from('activities')
    .select('id, qr_code_token, qr_code_expires_at')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'ไม่พบกิจกรรม' };
  }

  if (activity.qr_code_token !== qrToken) {
    return { error: 'QR Code ไม่ถูกต้อง' };
  }

  if (activity.qr_code_expires_at && new Date(activity.qr_code_expires_at) < new Date()) {
    return { error: 'QR Code หมดอายุแล้ว' };
  }

  // Check if within check-in window
  const { data: isValid } = await supabase.rpc('is_checkin_window_valid', {
    p_activity_id: activityId,
  });

  if (!isValid) {
    return { error: 'ไม่อยู่ในช่วงเวลาเช็คอิน' };
  }

  // Check if already checked in
  const { data: existing } = await supabase
    .from('activity_checkins')
    .select('id')
    .eq('activity_id', activityId)
    .eq('athlete_id', athlete.id)
    .single();

  if (existing) {
    return { error: 'คุณได้เช็คอินแล้ว' };
  }

  // Determine status (on_time or late)
  const { data: status } = await supabase.rpc('determine_checkin_status', {
    p_activity_id: activityId,
  });

  // Create check-in record
  const { data: checkin, error } = await supabase
    .from('activity_checkins')
    .insert({
      activity_id: activityId,
      athlete_id: athlete.id,
      status: status || 'on_time',
      checkin_method: 'qr',
      qr_token_used: qrToken,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { data: checkin };
}

export async function checkOutFromActivity(activityId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get athlete profile
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!athlete) {
    return { error: 'ไม่พบข้อมูลนักกีฬา' };
  }

  // Update check-out time
  const { error } = await supabase
    .from('activity_checkins')
    .update({ checked_out_at: new Date().toISOString() })
    .eq('activity_id', activityId)
    .eq('athlete_id', athlete.id)
    .is('checked_out_at', null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { success: true };
}
