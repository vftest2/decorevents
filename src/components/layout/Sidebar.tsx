import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  Users, 
  Settings, 
  Truck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  LogOut,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useEntity } from '@/contexts/EntityContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: Package, label: 'Estoque', path: '/inventory' },
  { icon: ClipboardList, label: 'Locação', path: '/rentals' },
  { icon: Truck, label: 'Logística', path: '/logistics' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
];

const bottomMenuItem = { icon: Settings, label: 'Configurações', path: '/settings' };

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEntity, currentUser } = useEntity();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col relative">
        {/* Collapse Toggle - Moved inside for better positioning */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent z-50 transition-all duration-300",
            isCollapsed ? "-right-3" : "-right-3"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Logo & Entity */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border transition-all duration-300",
          isCollapsed ? "justify-center px-2" : "px-4"
        )}>
          <div className={cn('flex items-center gap-3 overflow-hidden', isCollapsed && 'justify-center')}>
            {currentEntity?.logo ? (
              <div className={cn(
                "flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-10 w-10"
              )}>
                <img 
                  src={currentEntity.logo} 
                  alt={currentEntity.name || 'Logo'} 
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className={cn(
                "flex items-center justify-center rounded-xl gradient-primary shadow-glow flex-shrink-0 transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-10 w-10"
              )}>
                <PartyPopper className={cn("text-primary-foreground", isCollapsed ? "h-4 w-4" : "h-5 w-5")} />
              </div>
            )}
            {!isCollapsed && (
              <div className="animate-fade-in min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {currentEntity?.name || 'DecoraFest'}
                </p>
                <p className="text-xs text-sidebar-foreground/60">Gestão de Eventos</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-scale-in')} />
                {!isCollapsed && (
                  <span className="animate-fade-in truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings - Fixed at Bottom */}
        <div className="p-3 border-t border-sidebar-border">
          <Link
            to={bottomMenuItem.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              location.pathname === bottomMenuItem.path
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <bottomMenuItem.icon className={cn('h-5 w-5 flex-shrink-0', location.pathname === bottomMenuItem.path && 'animate-scale-in')} />
            {!isCollapsed && (
              <span className="animate-fade-in truncate">{bottomMenuItem.label}</span>
            )}
          </Link>
        </div>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              isCollapsed && 'justify-center'
            )}
          >
            <Avatar className="h-9 w-9 border-2 border-sidebar-primary">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {currentUser?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 animate-fade-in overflow-hidden">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                  {currentUser?.role?.replace('_', ' ')}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}
