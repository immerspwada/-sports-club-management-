'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  target_audience?: 'all' | 'athletes' | 'specific';
  is_pinned?: boolean;
  expires_at?: string;
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  id: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Get coach profile
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();

  if (coachError || !coach) {
    return { success: false, error: 'ไม่พบข้อมูลโค้ช' };
  }

  // Create announcement
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      coach_id: coach.id,
      title: input.title,
      message: input.message,
      priority: input.priority || 'normal',
      target_audience: input.target_audience || 'all',
      is_pinned: input.is_pinned || false,
      expires_at: input.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    return { success: false, error: 'ไม่สามารถสร้างประกาศได้' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

export async function updateAnnouncement(input: UpdateAnnouncementInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating announcement:', error);
    return { success: false, error: 'ไม่สามารถอัปเดตประกาศได้' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  const { error } = await supabase.from('announcements').delete().eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    return { success: false, error: 'ไม่สามารถลบประกาศได้' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true };
}

export async function getCoachAnnouncements() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้', data: [] };
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    return { success: false, error: 'ไม่พบข้อมูลโค้ช', data: [] };
  }

  // Get announcements with read statistics
  const { data, error } = await supabase
    .from('announcements')
    .select(
      `
      *,
      announcement_reads(count)
    `
    )
    .eq('coach_id', coach.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลประกาศได้', data: [] };
  }

  return { success: true, data: data || [] };
}

export async function markAnnouncementAsRead(announcementId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // Insert or ignore if already exists
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      {
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: 'announcement_id,user_id',
      }
    );

  if (error) {
    console.error('Error marking announcement as read:', error);
    return { success: false, error: 'ไม่สามารถบันทึกการอ่านได้' };
  }

  return { success: true };
}
