-- Create storage bucket for support ticket attachments
-- Allows users to upload screenshots and files for technical support

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false, -- Private bucket - only accessible to ticket creator and admins
  10485760, -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload attachments for their own tickets
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT st.id::text
    FROM support_tickets st
    INNER JOIN users u ON u.company_id = st.company_id
    WHERE u.id = auth.uid()
  )
);

-- Policy: Users can view attachments for their company's tickets
CREATE POLICY "Users can view their company support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    -- Super admins can view all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
    -- OR users can view their company's ticket attachments
    OR (storage.foldername(name))[1] IN (
      SELECT st.id::text
      FROM support_tickets st
      INNER JOIN users u ON u.company_id = st.company_id
      WHERE u.id = auth.uid()
    )
  )
);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own support attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT st.id::text
    FROM support_tickets st
    WHERE st.created_by_user_id = auth.uid()
    AND st.status NOT IN ('resolved', 'closed')
  )
);

-- Policy: Super admins can manage all attachments
CREATE POLICY "Super admins can manage all support attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_super_admin = true
  )
);
