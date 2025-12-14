-- Setup Supabase Storage bucket for landing page images

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

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to upload landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their company's landing page images" ON storage.objects;

-- Policy: Allow authenticated users to upload landing page images
CREATE POLICY "Allow authenticated users to upload landing page images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
);

-- Policy: Allow public to view landing page images (since bucket is public)
CREATE POLICY "Allow public to view landing page images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'landing-page-images');

-- Policy: Allow users to delete their company's landing page images
CREATE POLICY "Allow users to delete their company's landing page images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
  AND auth.uid() IS NOT NULL
);

-- Add comments
COMMENT ON POLICY "Allow authenticated users to upload landing page images" ON storage.objects IS
'Authenticated users can upload images to landing-page-images/completion-backgrounds/ folder';

COMMENT ON POLICY "Allow public to view landing page images" ON storage.objects IS
'Public access to view landing page images (for public landing pages)';

COMMENT ON POLICY "Allow users to delete their company's landing page images" ON storage.objects IS
'Authenticated users can delete landing page images';
