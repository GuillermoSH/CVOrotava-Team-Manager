-- Link videos to matches (Phase 2)

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_match_id ON public.videos (match_id)
  WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_one_per_match ON public.videos (match_id)
  WHERE match_id IS NOT NULL;

UPDATE public.videos v
SET match_id = m.id
FROM public.matches m
WHERE m.video_url IS NOT NULL
  AND trim(m.video_url) = trim(v.url)
  AND v.video_type IN ('league_match', 'friendly_match')
  AND v.match_id IS NULL;
