-- Allow anonymous users to view active entities for login
-- This is needed because users need to verify the entity exists before authenticating
CREATE POLICY "Anyone can view active entities for login" ON public.entities
  FOR SELECT
  USING (is_active = true);