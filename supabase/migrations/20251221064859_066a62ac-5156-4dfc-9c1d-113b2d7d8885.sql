-- Create rentals table (locações)
CREATE TABLE public.rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  event_id UUID REFERENCES public.events(id),
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'out', 'returned', 'completed')),
  departure_date TIMESTAMP WITH TIME ZONE,
  return_date TIMESTAMP WITH TIME ZONE,
  actual_departure_date TIMESTAMP WITH TIME ZONE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rental_items table (itens da locação)
CREATE TABLE public.rental_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  checked_out BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,
  returned_quantity INTEGER DEFAULT 0,
  damaged_quantity INTEGER DEFAULT 0,
  lost_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create item_damages table (avarias)
CREATE TABLE public.item_damages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  rental_item_id UUID REFERENCES public.rental_items(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'severe', 'total_loss')),
  quantity INTEGER DEFAULT 1,
  photos TEXT[], -- Array of photo URLs
  repair_cost NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_repair', 'repaired', 'written_off')),
  registered_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create item_history table (histórico do item)
CREATE TABLE public.item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('rented', 'returned', 'damaged', 'repaired', 'lost', 'adjusted')),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_history ENABLE ROW LEVEL SECURITY;

-- Policies for rentals
CREATE POLICY "Users can view entity rentals"
ON public.rentals FOR SELECT
USING (entity_id = get_user_entity_id() OR is_super_admin());

CREATE POLICY "Users can insert entity rentals"
ON public.rentals FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update entity rentals"
ON public.rentals FOR UPDATE
USING (entity_id = get_user_entity_id())
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can delete entity rentals"
ON public.rentals FOR DELETE
USING (entity_id = get_user_entity_id());

-- Policies for rental_items
CREATE POLICY "Users can view entity rental items"
ON public.rental_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM rentals
  WHERE rentals.id = rental_items.rental_id
  AND (rentals.entity_id = get_user_entity_id() OR is_super_admin())
));

CREATE POLICY "Users can insert entity rental items"
ON public.rental_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM rentals
  WHERE rentals.id = rental_items.rental_id
  AND rentals.entity_id = get_user_entity_id()
));

CREATE POLICY "Users can update entity rental items"
ON public.rental_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM rentals
  WHERE rentals.id = rental_items.rental_id
  AND rentals.entity_id = get_user_entity_id()
));

CREATE POLICY "Users can delete entity rental items"
ON public.rental_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM rentals
  WHERE rentals.id = rental_items.rental_id
  AND rentals.entity_id = get_user_entity_id()
));

-- Policies for item_damages
CREATE POLICY "Users can view entity damages"
ON public.item_damages FOR SELECT
USING (entity_id = get_user_entity_id() OR is_super_admin());

CREATE POLICY "Users can insert entity damages"
ON public.item_damages FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update entity damages"
ON public.item_damages FOR UPDATE
USING (entity_id = get_user_entity_id())
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can delete entity damages"
ON public.item_damages FOR DELETE
USING (entity_id = get_user_entity_id());

-- Policies for item_history
CREATE POLICY "Users can view entity history"
ON public.item_history FOR SELECT
USING (entity_id = get_user_entity_id() OR is_super_admin());

CREATE POLICY "Users can insert entity history"
ON public.item_history FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

-- Create updated_at triggers
CREATE TRIGGER update_rentals_updated_at
BEFORE UPDATE ON public.rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_item_damages_updated_at
BEFORE UPDATE ON public.item_damages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for damage photos
INSERT INTO storage.buckets (id, name, public) VALUES ('damage-photos', 'damage-photos', true);

-- Storage policies for damage photos
CREATE POLICY "Users can view damage photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'damage-photos');

CREATE POLICY "Users can upload damage photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'damage-photos');

CREATE POLICY "Users can update damage photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'damage-photos');

CREATE POLICY "Users can delete damage photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'damage-photos');