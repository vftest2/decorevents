-- Drop existing policies on user_roles if any
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Entity admins can manage entity roles" ON public.user_roles;

-- Policy: Users can view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy: Super admins can view all roles
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.is_super_admin());

-- Policy: Entity admins can view roles of users in their entity
CREATE POLICY "Entity admins can view entity roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  public.is_entity_admin() AND 
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.entity_id = public.get_user_entity_id()
  )
);

-- Policy: Super admins can insert any role
CREATE POLICY "Super admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin());

-- Policy: Entity admins can insert roles for users in their entity (except super_admin)
CREATE POLICY "Entity admins can insert entity roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_entity_admin() AND 
  role != 'super_admin' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.entity_id = public.get_user_entity_id()
  )
);

-- Policy: Super admins can delete any role
CREATE POLICY "Super admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- Policy: Entity admins can delete roles for users in their entity (except super_admin)
CREATE POLICY "Entity admins can delete entity roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (
  public.is_entity_admin() AND 
  role != 'super_admin' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.entity_id = public.get_user_entity_id()
  )
);