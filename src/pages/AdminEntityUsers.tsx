import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Users, Plus, Search, MoreVertical, Edit2, Trash2, LogOut, ArrowLeft, Loader2, UserPlus, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Entity {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  role?: string;
}

const ROLES = [
  { value: 'entity_admin', label: 'Administrador' },
  { value: 'decorator', label: 'Decorador' },
  { value: 'employee', label: 'Funcionário' },
  { value: 'driver', label: 'Motorista' },
];

export default function AdminEntityUsers() {
  const navigate = useNavigate();
  const { entityId } = useParams<{ entityId: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    is_active: true,
  });

  useEffect(() => {
    checkAuth();
    if (entityId) {
      fetchEntity();
      fetchUsers();
    }
  }, [entityId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      toast.error('Acesso negado');
      navigate('/admin');
    }
  };

  const fetchEntity = async () => {
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('id, name, slug, primary_color')
        .eq('id', entityId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Entidade não encontrada');
        navigate('/admin/entities');
        return;
      }
      
      setEntity(data);
    } catch (error) {
      console.error('Error fetching entity:', error);
      toast.error('Erro ao carregar entidade');
      navigate('/admin/entities');
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles for this entity
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);
          
          return {
            ...profile,
            role: roles?.[0]?.role || 'employee',
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      is_active: true,
    });
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      // Create the user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            name: formData.name.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(authError.message);
        }
        setIsSaving(false);
        return;
      }

      if (authData.user) {
        // Update profile with entity_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            entity_id: entityId,
            is_active: formData.is_active,
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        // Add role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: formData.role as 'entity_admin' | 'decorator' | 'employee' | 'driver',
          });

        if (roleError) {
          console.error('Error adding role:', roleError);
        }

        toast.success('Usuário criado com sucesso!');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole as 'entity_admin' | 'decorator' | 'employee' | 'driver',
        });

      if (error) throw error;

      toast.success('Cargo atualizado!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar cargo');
    }
  };

  const handleToggleActive = async (profile: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success(profile.is_active ? 'Usuário desativado' : 'Usuário ativado');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Tem certeza que deseja excluir "${profile.name}"?`)) return;

    try {
      // Note: We can't delete from auth.users directly, but we can deactivate and remove entity link
      const { error } = await supabase
        .from('profiles')
        .update({ 
          entity_id: null,
          is_active: false 
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Usuário removido da entidade');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/entities"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              {entity && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-semibold text-sm"
                  style={{ backgroundColor: entity.primary_color }}
                >
                  {entity.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold">Usuários</h1>
                <p className="text-sm text-muted-foreground">{entity?.name}</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description={
              searchQuery
                ? 'Nenhum usuário corresponde à sua busca.'
                : 'Comece criando o primeiro usuário desta entidade.'
            }
            actionLabel={!searchQuery ? 'Novo Usuário' : undefined}
            onAction={!searchQuery ? () => setIsCreateDialogOpen(true) : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback 
                        className="text-white"
                        style={{ backgroundColor: entity?.primary_color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{user.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(user)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Usuário Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Usuários inativos não podem fazer login
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
