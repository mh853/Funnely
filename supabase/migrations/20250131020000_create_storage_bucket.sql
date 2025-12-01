-- Create storage bucket for landing page images and public assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Public read access for public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Create storage policy for authenticated upload
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
);

-- Create storage policy for users to update their own uploads
CREATE POLICY "Users can update own uploads in public-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policy for users to delete their own uploads
CREATE POLICY "Users can delete own uploads in public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
