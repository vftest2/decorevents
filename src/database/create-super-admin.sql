-- ============================================
-- PASSO 1: Execute primeiro o schema.sql completo
-- Depois execute este script para criar o Super Admin
-- ============================================

-- Criar usuário Super Admin na tabela auth.users
-- IMPORTANTE: Altere o email e senha conforme necessário
-- A senha deve ser hasheada - use a API do Supabase Auth para criar o usuário

-- ============================================
-- OPÇÃO A: Via SQL (se você tiver acesso direto ao banco)
-- ============================================

-- Primeiro, obtenha o ID da entidade Super Admin
-- SELECT id FROM public.entities WHERE is_super_admin = true;

-- Depois de criar o usuário via Supabase Auth API ou Dashboard,
-- execute este script com o ID do usuário criado:

-- Substitua 'SEU_USER_ID_AQUI' pelo UUID do usuário criado
-- Substitua 'SEU_ENTITY_ID_AQUI' pelo UUID da entidade super-admin

/*
INSERT INTO public.profiles (id, entity_id, full_name, phone, position, is_active)
VALUES (
    'SEU_USER_ID_AQUI',
    'SEU_ENTITY_ID_AQUI',
    'Super Administrador',
    null,
    'Administrador do Sistema',
    true
);

INSERT INTO public.user_roles (user_id, entity_id, role)
VALUES (
    'SEU_USER_ID_AQUI',
    'SEU_ENTITY_ID_AQUI',
    'super_admin'
);
*/

-- ============================================
-- OPÇÃO B: Script automatizado (recomendado)
-- ============================================

-- Este script cria o Super Admin usando uma função
-- Execute após criar o usuário via Dashboard/API do Supabase Auth

CREATE OR REPLACE FUNCTION public.create_super_admin(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entity_id UUID;
BEGIN
    -- Obter ID da entidade Super Admin
    SELECT id INTO v_entity_id 
    FROM public.entities 
    WHERE is_super_admin = true 
    LIMIT 1;
    
    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Entidade Super Admin não encontrada. Execute o schema.sql primeiro.';
    END IF;
    
    -- Criar profile
    INSERT INTO public.profiles (id, entity_id, full_name, position, is_active)
    VALUES (_user_id, v_entity_id, 'Super Administrador', 'Administrador do Sistema', true)
    ON CONFLICT (id) DO UPDATE SET
        entity_id = v_entity_id,
        full_name = 'Super Administrador',
        position = 'Administrador do Sistema';
    
    -- Criar role
    INSERT INTO public.user_roles (user_id, entity_id, role)
    VALUES (_user_id, v_entity_id, 'super_admin')
    ON CONFLICT (user_id, entity_id, role) DO NOTHING;
    
    RAISE NOTICE 'Super Admin criado com sucesso!';
END;
$$;

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Primeiro, execute o schema.sql completo
-- 2. Crie um usuário no Supabase Auth (Dashboard > Authentication > Users > Add User)
--    Email: admin@seudominio.com
--    Password: SuaSenhaSegura123!
-- 3. Copie o UUID do usuário criado
-- 4. Execute: SELECT public.create_super_admin('UUID_DO_USUARIO_AQUI');
-- 5. Faça login em /admin-login com as credenciais criadas
-- ============================================
