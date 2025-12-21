// Entity Types
export interface Entity {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  theme: 'light' | 'dark' | 'auto';
  createdAt: Date;
  isActive: boolean;
}

// User Types
export type UserRole = 'super_admin' | 'entity_admin' | 'decorator' | 'employee' | 'driver';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  entityId: string;
  createdAt: Date;
  isActive: boolean;
}

// Client Types
export interface Client {
  id: string;
  entityId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: Date;
}

// Event Types
export type EventStatus = 
  | 'budget' 
  | 'confirmed' 
  | 'in_assembly' 
  | 'in_transit' 
  | 'finished';

export interface Event {
  id: string;
  entityId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  clientId: string;
  client?: Client;
  address: string;
  eventType: string;
  theme?: string;
  items: EventItem[];
  assignedUsers: string[];
  totalValue: number;
  createdAt: Date;
}

export interface EventItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  unitPrice: number;
}

// Inventory Types
export interface InventoryCategory {
  id: string;
  entityId: string;
  name: string;
  description?: string;
  color: string;
}

export interface InventoryItem {
  id: string;
  entityId: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: InventoryCategory;
  totalQuantity: number;
  availableQuantity: number;
  rentalPrice: number;
  photo?: string;
  createdAt: Date;
}

// Logistics Types
export interface ChecklistItem {
  id: string;
  eventId: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  checkedOut: boolean;
  checkedIn: boolean;
  returnCondition?: 'ok' | 'damaged' | 'lost';
  notes?: string;
}

// Dashboard Types
export interface DashboardMetrics {
  totalEvents: number;
  confirmedEvents: number;
  monthlyRevenue: number;
  pendingBudgets: number;
  eventsThisWeek: number;
  inventoryUtilization: number;
}
