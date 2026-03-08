-- ============================================
-- SISTEMA MULTI-TENANT DE DECORAÇÃO DE EVENTOS
-- Execute este script no seu Supabase self-hosted
-- ============================================

-- 1. Criar tipo ENUM para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'entity_admin', 'manager', 'user');

-- 2. Criar tipo ENUM para status de eventos
CREATE TYPE public.event_status AS ENUM ('planning', 'in_progress', 'assembly', 'completed', 'cancelled');

-- 3. Criar tipo ENUM para status de itens de decoração
CREATE TYPE public.decoration_status AS ENUM ('pending', 'in_transit', 'delivered', 'installed', 'returned');

-- ============================================
-- TABELA: entities (Entidades/Empresas)
-- ============================================
CREATE TABLE public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir entidade Super Admin
INSERT INTO public.entities (name, slug, is_super_admin, is_active)
VALUES ('Super Admin', 'super-admin', true, true);

-- ============================================
-- TABELA: profiles (Perfis de Usuários)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    position VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: user_roles (Roles de Usuários)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, entity_id, role)
);

-- ============================================
-- TABELA: events (Eventos)
-- ============================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_email VARCHAR(255),
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(500),
    address TEXT,
    status event_status DEFAULT 'planning',
    budget DECIMAL(12, 2),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: decoration_items (Itens de Decoração)
-- ============================================
CREATE TABLE public.decoration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2),
    status decoration_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: event_updates (Histórico/Atualizações)
-- ============================================
CREATE TABLE public.event_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: comments (Comentários Internos)
-- ============================================
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decoration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================

-- Função para obter entity_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_entity_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT entity_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Função para verificar se usuário tem uma role específica
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

-- Função para verificar se usuário é Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.entities e ON ur.entity_id = e.id
        WHERE ur.user_id = _user_id 
        AND ur.role = 'super_admin'
        AND e.is_super_admin = true
    )
$$;

-- Função para verificar se usuário pertence a uma entidade específica
CREATE OR REPLACE FUNCTION public.belongs_to_entity(_user_id UUID, _entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND entity_id = _entity_id
    )
$$;

-- ============================================
-- POLÍTICAS RLS - ENTITIES
-- ============================================
CREATE POLICY "Super admins can view all entities"
    ON public.entities FOR SELECT
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own entity"
    ON public.entities FOR SELECT
    TO authenticated
    USING (id = public.get_user_entity_id());

CREATE POLICY "Super admins can manage entities"
    ON public.entities FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================
-- POLÍTICAS RLS - PROFILES
-- ============================================
CREATE POLICY "Users can view profiles from their entity"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Entity admins can manage profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        entity_id = public.get_user_entity_id() 
        AND (public.has_role(auth.uid(), 'entity_admin') OR public.is_super_admin(auth.uid()))
    )
    WITH CHECK (
        entity_id = public.get_user_entity_id()
        AND (public.has_role(auth.uid(), 'entity_admin') OR public.is_super_admin(auth.uid()))
    );

-- ============================================
-- POLÍTICAS RLS - USER_ROLES
-- ============================================
CREATE POLICY "Users can view roles from their entity"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Entity admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        entity_id = public.get_user_entity_id()
        AND (public.has_role(auth.uid(), 'entity_admin') OR public.is_super_admin(auth.uid()))
    )
    WITH CHECK (
        entity_id = public.get_user_entity_id()
        AND (public.has_role(auth.uid(), 'entity_admin') OR public.is_super_admin(auth.uid()))
    );

-- ============================================
-- POLÍTICAS RLS - EVENTS
-- ============================================
CREATE POLICY "Users can view events from their entity"
    ON public.events FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can create events in their entity"
    ON public.events FOR INSERT
    TO authenticated
    WITH CHECK (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can update events in their entity"
    ON public.events FOR UPDATE
    TO authenticated
    USING (entity_id = public.get_user_entity_id())
    WITH CHECK (entity_id = public.get_user_entity_id());

CREATE POLICY "Managers can delete events"
    ON public.events FOR DELETE
    TO authenticated
    USING (
        entity_id = public.get_user_entity_id()
        AND (public.has_role(auth.uid(), 'entity_admin') OR public.has_role(auth.uid(), 'manager'))
    );

-- ============================================
-- POLÍTICAS RLS - DECORATION_ITEMS
-- ============================================
CREATE POLICY "Users can view decoration items from their entity"
    ON public.decoration_items FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can manage decoration items in their entity"
    ON public.decoration_items FOR ALL
    TO authenticated
    USING (entity_id = public.get_user_entity_id())
    WITH CHECK (entity_id = public.get_user_entity_id());

-- ============================================
-- POLÍTICAS RLS - EVENT_UPDATES
-- ============================================
CREATE POLICY "Users can view updates from their entity"
    ON public.event_updates FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can create updates in their entity"
    ON public.event_updates FOR INSERT
    TO authenticated
    WITH CHECK (entity_id = public.get_user_entity_id());

-- ============================================
-- POLÍTICAS RLS - COMMENTS
-- ============================================
CREATE POLICY "Users can view comments from their entity"
    ON public.comments FOR SELECT
    TO authenticated
    USING (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can create comments in their entity"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can update their own comments"
    ON public.comments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON public.comments FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- TRIGGER PARA CRIAR PROFILE AUTOMÁTICO
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_entity_id UUID;
BEGIN
    -- Obter entity_id dos metadados ou usar entidade padrão
    v_entity_id := (NEW.raw_user_meta_data ->> 'entity_id')::UUID;
    
    IF v_entity_id IS NULL THEN
        -- Se não há entity_id, não criar profile automaticamente
        RETURN NEW;
    END IF;
    
    INSERT INTO public.profiles (id, entity_id, full_name, phone, position)
    VALUES (
        NEW.id,
        v_entity_id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.raw_user_meta_data ->> 'phone',
        NEW.raw_user_meta_data ->> 'position'
    );
    
    -- Criar role padrão
    INSERT INTO public.user_roles (user_id, entity_id, role)
    VALUES (NEW.id, v_entity_id, 'user');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_profiles_entity_id ON public.profiles(entity_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_entity_id ON public.user_roles(entity_id);
CREATE INDEX idx_events_entity_id ON public.events(entity_id);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_decoration_items_event_id ON public.decoration_items(event_id);
CREATE INDEX idx_event_updates_event_id ON public.event_updates(event_id);
CREATE INDEX idx_comments_event_id ON public.comments(event_id);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON public.entities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decoration_items_updated_at
    BEFORE UPDATE ON public.decoration_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
