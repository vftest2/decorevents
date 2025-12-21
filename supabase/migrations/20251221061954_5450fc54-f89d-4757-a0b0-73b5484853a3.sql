-- Allow entity admins to update profiles within their entity (to set entity_id for new users)
DROP POLICY IF EXISTS "Entity admins can update entity profiles" ON public.profiles;

CREATE POLICY "Entity admins can update entity profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  public.is_entity_admin() AND 
  (entity_id = public.get_user_entity_id() OR entity_id IS NULL)
)
WITH CHECK (
  public.is_entity_admin() AND 
  entity_id = public.get_user_entity_id()
);