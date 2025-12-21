import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type AuthMode = 'login' | 'signup';

export default function AdminAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is super_admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
        if (isSuperAdmin) {
          navigate('/admin/entities');
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
        if (isSuperAdmin) {
          navigate('/admin/entities');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up new admin
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: {
              name: name.trim(),
            },
          },
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (authData.user) {
          // Add super_admin role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'super_admin' as const,
            });

          if (roleError) {
            console.error('Error adding role:', roleError);
          }

          toast.success('Conta criada com sucesso!');
          navigate('/admin/entities');
        }
      } else {
        // Sign in
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) {
          if (authError.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (authData.user) {
          // Check if user is super_admin
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authData.user.id);

          const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
          
          if (!isSuperAdmin) {
            toast.error('Você não tem permissão de administrador');
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }

          toast.success('Login realizado com sucesso!');
          navigate('/admin/entities');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Erro na autenticação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          {/* Back Link */}
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Área Admin
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === 'login' 
                ? 'Acesse o painel administrativo' 
                : 'Crie sua conta de administrador'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'
              )}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="ml-1 text-primary font-medium hover:underline"
              >
                {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
