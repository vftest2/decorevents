import { Calendar, FileText, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Calendar,
      label: 'Agendar Evento',
      onClick: () => navigate('/agenda'),
    },
    {
      icon: FileText,
      label: 'Gerar Orçamento',
      onClick: () => navigate('/events'),
    },
    {
      icon: Truck,
      label: 'Conferir Logística',
      onClick: () => navigate('/logistics'),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start gap-3 h-10"
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
