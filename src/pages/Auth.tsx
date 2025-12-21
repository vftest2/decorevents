import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entitySlug, setEntitySlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entitySlug.trim()) {
      toast.error('Por favor, informe a entidade');
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      // First, verify the entity exists - using maybeSingle to avoid RLS errors
      const { data: entity, error: entityError } = await supabase
        .from('entities')
        .select('id, name, slug')
        .eq('slug', entitySlug.toLowerCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (entityError) {
        console.error('Entity lookup error:', entityError);
        toast.error('Erro ao verificar entidade');
        setIsLoading(false);
        return;
      }

      if (!entity) {
        toast.error('Entidade não encontrada ou inativa');
        setIsLoading(false);
        return;
      }

      // Attempt to sign in
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
        // Verify user belongs to this entity
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entity_id')
          .eq('user_id', authData.user.id)
          .single();

        if (profileError || !profile) {
          toast.error('Perfil de usuário não encontrado');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        if (profile.entity_id !== entity.id) {
          toast.error('Você não pertence a esta entidade');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground italic">
              Fazer login
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Entity Field */}
            <div className="space-y-2">
              <Label htmlFor="entity">Entidade</Label>
              <Input
                id="entity"
                type="text"
                placeholder="Digite o código da entidade..."
                value={entitySlug}
                onChange={(e) => setEntitySlug(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Login</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu login..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'ENTRAR'
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline block w-full"
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            >
              Esqueci meu login ou senha
            </button>
            <button
              type="button"
              className="text-sm text-primary hover:underline block w-full"
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            >
              Política de Privacidade
            </button>
            <Link
              to="/admin"
              className="text-sm text-primary hover:underline block w-full"
            >
              Área Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
