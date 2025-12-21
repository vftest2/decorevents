import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEntity } from '@/contexts/EntityContext';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { setCurrentUser, setCurrentEntity } = useEntity();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set mock user and entity
    setCurrentUser({
      id: '1',
      email: 'admin@festasonhos.com',
      name: 'Maria Silva',
      role: 'entity_admin',
      entityId: '1',
      createdAt: new Date(),
      isActive: true,
    });
    
    setCurrentEntity({
      id: '1',
      name: 'Festas & Sonhos Decorações',
      slug: 'festas-sonhos',
      primaryColor: '#E85A4F',
      secondaryColor: '#F5F0EB',
      accentColor: '#E8A83C',
      theme: 'light',
      createdAt: new Date(),
      isActive: true,
    });

    setIsLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="animate-slide-up">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <PartyPopper className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              DecoraFest
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-md">
              Gerencie seus eventos de decoração com eficiência. 
              Controle estoque, organize equipes e encante seus clientes.
            </p>
            
            {/* Features */}
            <div className="space-y-4">
              {[
                'Gestão completa de eventos',
                'Controle de estoque inteligente',
                'Agenda integrada com conflitos',
                'Relatórios e insights',
              ].map((feature, index) => (
                <div 
                  key={feature}
                  className="flex items-center gap-3 animate-slide-in-left"
                  style={{ animationDelay: `${(index + 1) * 150}ms` }}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <PartyPopper className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">DecoraFest</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {mode === 'login' 
                ? 'Entre com suas credenciais para acessar o sistema' 
                : 'Preencha os dados para começar a usar o sistema'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2 animate-slide-up">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center">
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
