import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Entity, User } from '@/types';

interface EntityContextType {
  currentEntity: Entity | null;
  currentUser: User | null;
  setCurrentEntity: (entity: Entity | null) => void;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

// Mock entity for demo
const mockEntity: Entity = {
  id: '1',
  name: 'Festas & Sonhos Decorações',
  slug: 'festas-sonhos',
  primaryColor: '#E85A4F',
  secondaryColor: '#F5F0EB',
  accentColor: '#E8A83C',
  theme: 'light',
  createdAt: new Date(),
  isActive: true,
};

const mockUser: User = {
  id: '1',
  email: 'admin@festasonhos.com',
  name: 'Maria Silva',
  role: 'entity_admin',
  entityId: '1',
  createdAt: new Date(),
  isActive: true,
};

export function EntityProvider({ children }: { children: ReactNode }) {
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(mockEntity);
  const [currentUser, setCurrentUser] = useState<User | null>(mockUser);

  const isAuthenticated = currentUser !== null;

  const logout = () => {
    setCurrentUser(null);
    setCurrentEntity(null);
  };

  return (
    <EntityContext.Provider
      value={{
        currentEntity,
        currentUser,
        setCurrentEntity,
        setCurrentUser,
        isAuthenticated,
        logout,
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
