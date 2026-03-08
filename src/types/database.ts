export type AppRole = 'super_admin' | 'entity_admin' | 'manager' | 'user';
export type EventStatus = 'planning' | 'in_progress' | 'assembly' | 'completed' | 'cancelled';
export type DecorationStatus = 'pending' | 'in_transit' | 'delivered' | 'installed' | 'returned';

export interface Entity {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  entity_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  entity_id: string;
  role: AppRole;
  created_at: string;
}

export interface Event {
  id: string;
  entity_id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  address: string | null;
  status: EventStatus;
  budget: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecorationItem {
  id: string;
  entity_id: string;
  event_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  status: DecorationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventUpdate {
  id: string;
  entity_id: string;
  event_id: string;
  user_id: string | null;
  action: string;
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface Comment {
  id: string;
  entity_id: string;
  event_id: string;
  user_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: UserRole[];
  entity: Entity | null;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planning: 'Planejamento',
  in_progress: 'Em Andamento',
  assembly: 'Montagem',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const DECORATION_STATUS_LABELS: Record<DecorationStatus, string> = {
  pending: 'Pendente',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  installed: 'Instalado',
  returned: 'Devolvido',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  entity_admin: 'Administrador',
  manager: 'Gerente',
  user: 'Usuário',
};
