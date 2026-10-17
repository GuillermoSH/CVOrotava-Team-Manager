-- Unify videos.category + videos.competition_type into videos.video_type

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_type text;

UPDATE public.videos SET video_type = CASE
  WHEN category = 'training' THEN 'training'
  WHEN category = 'match' AND competition_type = 'friendly' THEN 'friendly_match'
  ELSE 'league_match'
END
WHERE video_type IS NULL;

ALTER TABLE public.videos
  ALTER COLUMN video_type SET NOT NULL;

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_video_type_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_video_type_check
    CHECK (video_type IN ('league_match', 'friendly_match', 'training'));

ALTER TABLE public.videos
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS competition_type;
