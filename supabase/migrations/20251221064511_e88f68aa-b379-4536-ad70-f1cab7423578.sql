-- Drop the existing restrictive policy for managing inventory
DROP POLICY IF EXISTS "Entity admins can manage inventory" ON public.inventory_items;

-- Create separate policies for better control
CREATE POLICY "Users can insert entity inventory"
ON public.inventory_items
FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update entity inventory"
ON public.inventory_items
FOR UPDATE
USING (entity_id = get_user_entity_id())
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can delete entity inventory"
ON public.inventory_items
FOR DELETE
USING (entity_id = get_user_entity_id());