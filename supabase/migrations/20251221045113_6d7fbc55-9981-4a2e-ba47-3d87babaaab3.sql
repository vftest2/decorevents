-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'entity_admin', 'decorator', 'employee', 'driver');

-- Enum para status de eventos
CREATE TYPE public.event_status AS ENUM ('budget', 'confirmed', 'in_assembly', 'in_transit', 'finished');

-- Enum para condição de retorno
CREATE TYPE public.return_condition AS ENUM ('ok', 'damaged', 'lost');

-- Tabela de Entidades (empresas)
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  primary_color TEXT DEFAULT '#E85A4F',
  secondary_color TEXT DEFAULT '#F5F0EB',
  accent_color TEXT DEFAULT '#E8A83C',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Perfis (vinculada a auth.users e entities)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Categorias de Inventário
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens do Inventário
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  rental_price DECIMAL(10,2) DEFAULT 0,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Eventos
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  theme TEXT,
  address TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status event_status DEFAULT 'budget',
  total_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens do Evento
CREATE TABLE public.event_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Checklist de Logística
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  checked_out BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,
  return_condition return_condition,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de usuários atribuídos a eventos
CREATE TABLE public.event_assigned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ========== FUNÇÕES DE SEGURANÇA ==========

-- Função para obter entity_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_entity_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entity_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
$$;

-- Função para verificar se é admin da entidade
CREATE OR REPLACE FUNCTION public.is_entity_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'entity_admin') OR public.has_role(auth.uid(), 'super_admin')
$$;

-- ========== RLS POLICIES ==========

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assigned_users ENABLE ROW LEVEL SECURITY;

-- Policies para ENTITIES
CREATE POLICY "Super admins can manage all entities" ON public.entities
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view their own entity" ON public.entities
  FOR SELECT TO authenticated
  USING (id = public.get_user_entity_id());

-- Policies para PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Entity admins can view entity profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (entity_id = public.get_user_entity_id());

-- Policies para USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Policies para CLIENTS (isolamento por entity_id)
CREATE POLICY "Users can view entity clients" ON public.clients
  FOR SELECT TO authenticated
  USING (entity_id = public.get_user_entity_id() OR public.is_super_admin());

CREATE POLICY "Entity admins can manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (entity_id = public.get_user_entity_id() AND public.is_entity_admin())
  WITH CHECK (entity_id = public.get_user_entity_id() AND public.is_entity_admin());

-- Policies para INVENTORY_CATEGORIES
CREATE POLICY "Users can view entity categories" ON public.inventory_categories
  FOR SELECT TO authenticated
  USING (entity_id = public.get_user_entity_id() OR public.is_super_admin());

CREATE POLICY "Entity admins can manage categories" ON public.inventory_categories
  FOR ALL TO authenticated
  USING (entity_id = public.get_user_entity_id() AND public.is_entity_admin())
  WITH CHECK (entity_id = public.get_user_entity_id() AND public.is_entity_admin());

-- Policies para INVENTORY_ITEMS
CREATE POLICY "Users can view entity inventory" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (entity_id = public.get_user_entity_id() OR public.is_super_admin());

CREATE POLICY "Entity admins can manage inventory" ON public.inventory_items
  FOR ALL TO authenticated
  USING (entity_id = public.get_user_entity_id() AND public.is_entity_admin())
  WITH CHECK (entity_id = public.get_user_entity_id() AND public.is_entity_admin());

-- Policies para EVENTS
CREATE POLICY "Users can view entity events" ON public.events
  FOR SELECT TO authenticated
  USING (entity_id = public.get_user_entity_id() OR public.is_super_admin());

CREATE POLICY "Entity admins can manage events" ON public.events
  FOR ALL TO authenticated
  USING (entity_id = public.get_user_entity_id() AND public.is_entity_admin())
  WITH CHECK (entity_id = public.get_user_entity_id() AND public.is_entity_admin());

-- Policies para EVENT_ITEMS
CREATE POLICY "Users can view entity event items" ON public.event_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_items.event_id 
      AND (entity_id = public.get_user_entity_id() OR public.is_super_admin())
    )
  );

CREATE POLICY "Entity admins can manage event items" ON public.event_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_items.event_id 
      AND entity_id = public.get_user_entity_id() 
      AND public.is_entity_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_items.event_id 
      AND entity_id = public.get_user_entity_id() 
      AND public.is_entity_admin()
    )
  );

-- Policies para CHECKLIST_ITEMS
CREATE POLICY "Users can view entity checklist" ON public.checklist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = checklist_items.event_id 
      AND (entity_id = public.get_user_entity_id() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can manage entity checklist" ON public.checklist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = checklist_items.event_id 
      AND entity_id = public.get_user_entity_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = checklist_items.event_id 
      AND entity_id = public.get_user_entity_id()
    )
  );

-- Policies para EVENT_ASSIGNED_USERS
CREATE POLICY "Users can view assigned users" ON public.event_assigned_users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_assigned_users.event_id 
      AND (entity_id = public.get_user_entity_id() OR public.is_super_admin())
    )
  );

CREATE POLICY "Entity admins can manage assigned users" ON public.event_assigned_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_assigned_users.event_id 
      AND entity_id = public.get_user_entity_id() 
      AND public.is_entity_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_assigned_users.event_id 
      AND entity_id = public.get_user_entity_id() 
      AND public.is_entity_admin()
    )
  );

-- ========== TRIGGERS ==========

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar profile no signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();