-- Drop the existing restrictive policy for managing categories
DROP POLICY IF EXISTS "Entity admins can manage categories" ON public.inventory_categories;

-- Create separate policies for better control
CREATE POLICY "Users can insert entity categories"
ON public.inventory_categories
FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update entity categories"
ON public.inventory_categories
FOR UPDATE
USING (entity_id = get_user_entity_id())
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can delete entity categories"
ON public.inventory_categories
FOR DELETE
USING (entity_id = get_user_entity_id() AND is_entity_admin());