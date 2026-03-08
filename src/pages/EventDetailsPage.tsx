import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  Package,
  MessageSquare,
  History,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Event, 
  DecorationItem, 
  Comment, 
  EventUpdate,
  EventStatus,
  EVENT_STATUS_LABELS,
  DECORATION_STATUS_LABELS 
} from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EventDialog } from '@/components/events/EventDialog';
import { DecorationDialog } from '@/components/decorations/DecorationDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const statusColors: Record<EventStatus, string> = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  assembly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isDecorationDialogOpen, setIsDecorationDialogOpen] = useState(false);
  const [selectedDecoration, setSelectedDecoration] = useState<DecorationItem | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchEventData = async () => {
    if (!id || !profile?.entity_id) return;

    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('entity_id', profile.entity_id)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) {
        navigate('/events');
        return;
      }

      setEvent(eventData as Event);

      // Fetch decorations
      const { data: decorationsData } = await supabase
        .from('decoration_items')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      setDecorations((decorationsData || []) as DecorationItem[]);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      setComments((commentsData || []) as Comment[]);

      // Fetch updates
      const { data: updatesData } = await supabase
        .from('event_updates')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      setUpdates((updatesData || []) as EventUpdate[]);
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados do evento',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, profile?.entity_id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !event || !profile?.entity_id) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from('comments').insert({
        entity_id: profile.entity_id,
        event_id: event.id,
        user_id: user?.id,
        content: newComment.trim(),
        is_internal: true,
      });

      if (error) throw error;

      setNewComment('');
      fetchEventData();
      toast({
        title: 'Comentário adicionado',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar o comentário',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteDecoration = async (decorationId: string) => {
    try {
      const { error } = await supabase
        .from('decoration_items')
        .delete()
        .eq('id', decorationId);

      if (error) throw error;

      setDecorations(decorations.filter(d => d.id !== decorationId));
      toast({
        title: 'Item removido',
      });
    } catch (error) {
      console.error('Error deleting decoration:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o item',
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return null;
  }

  const totalBudget = decorations.reduce((sum, d) => sum + (d.unit_price || 0) * d.quantity, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {event.name}
              </h1>
              <Badge className={cn('mt-1 font-normal', statusColors[event.status])}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setIsEventDialogOpen(true)} variant="outline">
            <Pencil className="w-4 h-4 mr-2" />
            Editar Evento
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(parseISO(event.event_date), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {event.event_time && (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-medium">{event.event_time.slice(0, 5)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {event.location && (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-medium truncate">{event.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orçamento</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(event.budget || totalBudget)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Info */}
        {(event.client_name || event.client_phone || event.client_email) && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {event.client_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{event.client_name}</span>
                  </div>
                )}
                {event.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{event.client_phone}</span>
                  </div>
                )}
                {event.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{event.client_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="decorations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="decorations" className="gap-2">
              <Package className="w-4 h-4" />
              Decorações ({decorations.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentários ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Histórico ({updates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decorations">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Itens de Decoração</CardTitle>
                  <CardDescription>Gerencie os itens de decoração deste evento</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedDecoration(null);
                    setIsDecorationDialogOpen(true);
                  }}
                  className="bg-gradient-warm hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent>
                {decorations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum item de decoração cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {decorations.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{item.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Qtd: {item.quantity}</span>
                            {item.unit_price && (
                              <span>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(item.unit_price * item.quantity)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {DECORATION_STATUS_LABELS[item.status]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDecoration(item);
                              setIsDecorationDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDecoration(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Comentários Internos</CardTitle>
                <CardDescription>Comunicação interna sobre o evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Adicione um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="bg-gradient-warm hover:opacity-90"
                  >
                    Enviar
                  </Button>
                </div>

                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum comentário ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            U
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(parseISO(comment.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Histórico de Alterações</CardTitle>
                <CardDescription>Registro de todas as atualizações do evento</CardDescription>
              </CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma atualização registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div key={update.id} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">{update.action}</p>
                          {update.description && (
                            <p className="text-sm text-muted-foreground">
                              {update.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(update.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EventDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={event}
        onSuccess={fetchEventData}
      />

      <DecorationDialog
        open={isDecorationDialogOpen}
        onOpenChange={setIsDecorationDialogOpen}
        decoration={selectedDecoration}
        eventId={event.id}
        onSuccess={fetchEventData}
      />
    </DashboardLayout>
  );
}
