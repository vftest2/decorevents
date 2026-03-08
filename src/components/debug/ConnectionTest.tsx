import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  message: string;
  details?: string;
}

export function ConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test 1: Check if we can reach the Supabase API
        const { data, error } = await supabase
          .from('entities')
          .select('count')
          .limit(1);

        if (error) {
          // Check if error is about missing table (means connection works but table doesn't exist)
          if (error.message.includes('Could not find') || 
              error.message.includes('relation') && error.message.includes('does not exist') ||
              error.message.includes('schema cache')) {
            setStatus({
              connected: true,
              message: '✓ Conexão OK!',
              details: 'O Supabase está acessível, mas as tabelas ainda não existem. Execute o schema.sql no SQL Editor do Supabase.',
            });
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            setStatus({
              connected: false,
              message: 'Erro de conexão',
              details: 'Não foi possível conectar ao Supabase. Verifique se a URL está correta e o servidor está acessível.',
            });
          } else {
            setStatus({
              connected: false,
              message: 'Erro ao conectar',
              details: error.message,
            });
          }
        } else {
          setStatus({
            connected: true,
            message: 'Conectado ao Supabase!',
            details: 'Conexão funcionando corretamente.',
          });
        }
      } catch (err) {
        setStatus({
          connected: false,
          message: 'Erro de conexão',
          details: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      } finally {
        setIsLoading(false);
      }
    };

    testConnection();
  }, []);

  return (
    <Card className="max-w-md mx-auto mt-4 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Testando conexão...</span>
          </div>
        ) : status ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {status.connected ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={status.connected ? 'text-success' : 'text-destructive'}>
                {status.message}
              </span>
            </div>
            {status.details && (
              <p className="text-sm text-muted-foreground pl-7">
                {status.details}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
