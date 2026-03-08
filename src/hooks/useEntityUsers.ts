import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, Entity, AppRole } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export interface EntityUser {
  id: string;
  email: string;
  profile: Profile;
  roles: UserRole[];
  entity: Entity;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  entity_id: string;
  role: AppRole;
  phone?: string;
  position?: string;
}

export function useEntityUsers() {
  const [users, setUsers] = useState<EntityUser[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('is_super_admin', false)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEntities((data || []) as Entity[]);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch profiles with their entity info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          entities:entity_id (*)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data - filter out super admin entity users
      const combinedUsers: EntityUser[] = (profilesData || [])
        .filter((p: any) => p.entities && !p.entities.is_super_admin)
        .map((profile: any) => ({
          id: profile.id,
          email: '', // We'll need to get this from auth if needed
          profile: {
            id: profile.id,
            entity_id: profile.entity_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            position: profile.position,
            is_active: profile.is_active,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          },
          roles: (rolesData || []).filter((r: any) => r.user_id === profile.id) as UserRole[],
          entity: profile.entities as Entity,
        }));

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createUser = async (data: CreateUserData) => {
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.full_name,
            entity_id: data.entity_id,
            phone: data.phone,
            position: data.position,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // The trigger should create the profile automatically
      // But we need to add the role manually
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          entity_id: data.entity_id,
          role: data.role,
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
        // Don't throw here, user was created successfully
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso! Um email de confirmação foi enviado.',
      });

      await fetchUsers();
      return { data: authData.user, error: null };
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let message = 'Não foi possível criar o usuário.';
      if (error.message?.includes('already registered')) {
        message = 'Este email já está cadastrado.';
      }
      
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  const updateUserRole = async (userId: string, entityId: string, newRole: AppRole) => {
    try {
      // First, delete existing roles for this user/entity
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('entity_id', entityId);

      // Then insert the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          entity_id: entityId,
          role: newRole,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Papel do usuário atualizado!',
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o papel.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchEntities();
    fetchUsers();
  }, [fetchEntities, fetchUsers]);

  return {
    users,
    entities,
    isLoading,
    fetchUsers,
    fetchEntities,
    createUser,
    toggleUserStatus,
    updateUserRole,
  };
}
