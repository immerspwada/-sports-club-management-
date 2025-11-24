-- Create announcements table for coach notifications
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  target_audience TEXT NOT NULL DEFAULT 'all',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add constraints
ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_priority_check 
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_target_check 
  CHECK (target_audience IN ('all', 'athletes', 'specific'));

ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_title_length 
  CHECK (char_length(title) >= 3 AND char_length(title) <= 200);

ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_message_length 
  CHECK (char_length(message) >= 10 AND char_length(message) <= 5000);

-- Create announcement_reads table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_coach_id ON public.announcements(coach_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads(user_id);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
