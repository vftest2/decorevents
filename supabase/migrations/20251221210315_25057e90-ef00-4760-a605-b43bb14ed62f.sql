-- Create storage bucket for entity logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('entity-logos', 'entity-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view logos
CREATE POLICY "Anyone can view entity logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'entity-logos');

-- Allow entity admins to upload their entity's logo
CREATE POLICY "Entity admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entity-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.profiles WHERE user_id = auth.uid())::text
  OR public.is_entity_admin()
);

-- Allow entity admins to update their entity's logo
CREATE POLICY "Entity admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'entity-logos' 
  AND public.is_entity_admin()
);

-- Allow entity admins to delete their entity's logo
CREATE POLICY "Entity admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entity-logos' 
  AND public.is_entity_admin()
);