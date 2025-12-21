-- Função para criar locação automaticamente quando evento é confirmado
CREATE OR REPLACE FUNCTION public.create_rental_on_event_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_rental_id uuid;
BEGIN
  -- Só executa se o status mudou para 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Verifica se já existe uma locação para este evento
    IF NOT EXISTS (SELECT 1 FROM rentals WHERE event_id = NEW.id) THEN
      -- Cria a locação
      INSERT INTO rentals (
        entity_id,
        event_id,
        client_id,
        title,
        description,
        departure_date,
        return_date,
        status,
        total_value
      ) VALUES (
        NEW.entity_id,
        NEW.id,
        NEW.client_id,
        'Locação - ' || NEW.title,
        'Locação automática criada para o evento: ' || NEW.title,
        NEW.start_date,
        NEW.end_date,
        'pending',
        NEW.total_value
      )
      RETURNING id INTO new_rental_id;
      
      -- Copia os itens do evento para a locação
      INSERT INTO rental_items (rental_id, inventory_item_id, quantity, unit_price)
      SELECT 
        new_rental_id,
        ei.inventory_item_id,
        ei.quantity,
        ei.unit_price
      FROM event_items ei
      WHERE ei.event_id = NEW.id
        AND ei.inventory_item_id IS NOT NULL;
        
      -- Registra no histórico dos itens
      INSERT INTO item_history (entity_id, inventory_item_id, rental_id, event_id, action_type, quantity, notes)
      SELECT 
        NEW.entity_id,
        ei.inventory_item_id,
        new_rental_id,
        NEW.id,
        'rental_created',
        ei.quantity,
        'Locação criada automaticamente ao confirmar evento'
      FROM event_items ei
      WHERE ei.event_id = NEW.id
        AND ei.inventory_item_id IS NOT NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_create_rental_on_confirmation ON events;
CREATE TRIGGER trigger_create_rental_on_confirmation
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_rental_on_event_confirmation();