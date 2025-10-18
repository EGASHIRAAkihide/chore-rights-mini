import type { SupabaseClient } from '@supabase/supabase-js';

type AuditEventPayload = {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
};

type PublicClient = SupabaseClient;

export async function logAuditEvent(client: PublicClient, payload: AuditEventPayload) {
  const eventPayload = {
    user_id: payload.userId,
    kind: payload.action,
    meta: {
      actor: payload.userId,
      entity: payload.entity,
      entity_id: payload.entityId,
      ...(payload.meta ?? {}),
    },
  };

  const { error } = await client.from('events').insert(eventPayload);
  if (error) {
    throw error;
  }
}
