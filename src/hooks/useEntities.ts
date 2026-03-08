import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Entity } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface EntityStats {
  totalEntities: number;
  activeEntities: number;
  inactiveEntities: number;
  totalUsers: number;
  totalEvents: number;
}

interface CreateEntityData {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface UpdateEntityData extends CreateEntityData {
  is_active?: boolean;
}

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [stats, setStats] = useState<EntityStats>({
    totalEntities: 0,
    activeEntities: 0,
    inactiveEntities: 0,
    totalUsers: 0,
    totalEvents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('is_super_admin', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntities((data || []) as Entity[]);
    } catch (error) {
      console.error('Error fetching entities:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as entidades.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async () => {
    try {
      // Get entities count
      const { data: entitiesData } = await supabase
        .from('entities')
        .select('id, is_active')
        .eq('is_super_admin', false);

      const allEntities = entitiesData || [];
      const active = allEntities.filter(e => e.is_active).length;

      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalEntities: allEntities.length,
        activeEntities: active,
        inactiveEntities: allEntities.length - active,
        totalUsers: usersCount || 0,
        totalEvents: eventsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  };

  const createEntity = async (data: CreateEntityData) => {
    try {
      const slug = generateSlug(data.name) + '-' + Date.now().toString(36);
      
      const { data: newEntity, error } = await supabase
        .from('entities')
        .insert({
          name: data.name,
          slug: slug,
          cnpj: data.cnpj || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          is_active: true,
          is_super_admin: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Entidade criada com sucesso!',
      });

      await fetchEntities();
      await fetchStats();
      return { data: newEntity as Entity, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a entidade.',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateEntity = async (id: string, data: UpdateEntityData) => {
    try {
      const { data: updatedEntity, error } = await supabase
        .from('entities')
        .update({
          name: data.name,
          cnpj: data.cnpj || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          is_active: data.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Entidade atualizada com sucesso!',
      });

      await fetchEntities();
      await fetchStats();
      return { data: updatedEntity as Entity, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a entidade.',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const toggleEntityStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('entities')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Entidade ${isActive ? 'ativada' : 'desativada'} com sucesso!`,
      });

      await fetchEntities();
      await fetchStats();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchEntities();
    fetchStats();
  }, [fetchEntities, fetchStats]);

  return {
    entities,
    stats,
    isLoading,
    fetchEntities,
    fetchStats,
    createEntity,
    updateEntity,
    toggleEntityStatus,
  };
}
