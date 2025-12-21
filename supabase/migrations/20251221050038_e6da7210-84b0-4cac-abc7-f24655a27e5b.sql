-- Adicionar policy para permitir criação inicial de entidades por usuários autenticados
-- Esta policy permite que qualquer usuário autenticado crie entidades (para setup inicial)
-- Em produção, você pode remover esta policy e manter apenas a de super_admin

CREATE POLICY "Authenticated users can create entities for initial setup" ON public.entities
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Também precisamos permitir que usuários autenticados possam atualizar e deletar suas próprias entidades
-- se não forem super_admin mas forem entity_admin da entidade
CREATE POLICY "Entity admins can update their entity" ON public.entities
  FOR UPDATE TO authenticated
  USING (id = public.get_user_entity_id())
  WITH CHECK (id = public.get_user_entity_id());

-- Policy para permitir leitura de todas as entidades para usuários autenticados
-- (útil para seleção de entidade no login)
CREATE POLICY "Authenticated users can view all entities for selection" ON public.entities
  FOR SELECT TO authenticated
  USING (true);