import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Entity, User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface EntityContextType {
  currentEntity: Entity | null;
  currentUser: User | null;
  session: Session | null;
  setCurrentEntity: (entity: Entity | null) => void;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshEntity: () => Promise<void>;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          setCurrentUser(null);
          setCurrentEntity(null);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          // Defer fetching user profile to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setCurrentUser(null);
          setCurrentEntity(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setIsLoading(false);
        return;
      }
      
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        setIsLoading(false);
        return;
      }

      // Fetch user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const userRole = roles?.[0]?.role || 'employee';

      // Set current user
      setCurrentUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar || undefined,
        role: userRole as User['role'],
        entityId: profile.entity_id || '',
        createdAt: new Date(profile.created_at || ''),
        isActive: profile.is_active || true,
      });

      // Fetch entity if user has one
      if (profile.entity_id) {
        const { data: entity, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', profile.entity_id)
          .single();

        if (!entityError && entity) {
          setCurrentEntity({
            id: entity.id,
            name: entity.name,
            slug: entity.slug,
            logo: entity.logo || undefined,
            primaryColor: entity.primary_color || '#E85A4F',
            secondaryColor: entity.secondary_color || '#F5F0EB',
            accentColor: entity.accent_color || '#E8A83C',
            theme: (entity.theme as 'light' | 'dark' | 'auto') || 'light',
            createdAt: new Date(entity.created_at || ''),
            isActive: entity.is_active || true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = session !== null && currentUser !== null;

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentEntity(null);
    setSession(null);
  };

  const refreshEntity = async () => {
    if (!currentUser?.entityId) return;
    
    try {
      const { data: entity, error } = await supabase
        .from('entities')
        .select('*')
        .eq('id', currentUser.entityId)
        .single();

      if (!error && entity) {
        setCurrentEntity({
          id: entity.id,
          name: entity.name,
          slug: entity.slug,
          logo: entity.logo || undefined,
          primaryColor: entity.primary_color || '#E85A4F',
          secondaryColor: entity.secondary_color || '#F5F0EB',
          accentColor: entity.accent_color || '#E8A83C',
          theme: (entity.theme as 'light' | 'dark' | 'auto') || 'light',
          createdAt: new Date(entity.created_at || ''),
          isActive: entity.is_active || true,
        });
      }
    } catch (error) {
      console.error('Error refreshing entity:', error);
    }
  };

  return (
    <EntityContext.Provider
      value={{
        currentEntity,
        currentUser,
        session,
        setCurrentEntity,
        setCurrentUser,
        isAuthenticated,
        isLoading,
        logout,
        refreshEntity,
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}
