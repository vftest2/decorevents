import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user && isSuperAdmin) {
      navigate('/super-admin');
    }
  }, [user, isSuperAdmin, navigate]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        let message = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Por favor, confirme seu email antes de fazer login';
        }
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: message,
        });
        return;
      }

      // The redirect will happen via the useEffect when isSuperAdmin updates
      toast({
        title: 'Verificando permissões...',
        description: 'Aguarde enquanto validamos seu acesso',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-foreground p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-lg mb-4">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-background">
            Acesso <span className="text-accent">Restrito</span>
          </h1>
          <p className="text-background/60 mt-2">
            Painel de Administração do Sistema
          </p>
        </div>

        <Card className="bg-card/10 backdrop-blur-sm border-background/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-display text-background">Super Admin</CardTitle>
            <CardDescription className="text-background/60">
              Este acesso é exclusivo para administradores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-background">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sistema.com"
                  {...register('email')}
                  className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 ${
                    errors.email ? 'border-destructive' : ''
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-background">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 pr-10 ${
                      errors.password ? 'border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-background/60 hover:text-background transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Acessar Painel'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-background/60 hover:text-background hover:bg-background/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login normal
          </Button>
        </div>
      </div>
    </div>
  );
}
