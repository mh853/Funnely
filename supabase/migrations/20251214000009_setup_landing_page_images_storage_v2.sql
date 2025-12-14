-- Setup Supabase Storage bucket for landing page images
-- NOTE: This migration creates the bucket only.
-- RLS policies must be created via Supabase Dashboard due to permission requirements.

-- Create storage bucket for landing page images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-page-images',
  'landing-page-images',
  true,
  2097152, -- 2MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT: RLS policies for storage.objects must be created manually via Dashboard
--
-- Go to: Supabase Dashboard → Storage → landing-page-images → Policies
--
-- Create 3 policies:
--
-- 1. INSERT Policy (Upload)
--    Name: Allow authenticated users to upload landing page images
--    Target: authenticated
--    WITH CHECK: bucket_id = 'landing-page-images' AND (storage.foldername(name))[1] = 'completion-backgrounds'
--
-- 2. SELECT Policy (View)
--    Name: Allow public to view landing page images
--    Target: public
--    USING: bucket_id = 'landing-page-images'
--
-- 3. DELETE Policy
--    Name: Allow users to delete their company's landing page images
--    Target: authenticated
--    USING: bucket_id = 'landing-page-images' AND (storage.foldername(name))[1] = 'completion-backgrounds' AND auth.uid() IS NOT NULL
