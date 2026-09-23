import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';

export interface ErpRecord<T = Record<string, unknown>> {
  id: string;
  collection_name: string;
  record_key: string;
  organization_id: string | null;
  owner_id: string | null;
  payload: T;
  created_at: string;
  updated_at: string;
}

/** Collection-shaped access used while modules move from Firestore to Postgres. */
export async function listRecords<T = Record<string, unknown>>(collectionName: string, options?: {
  organizationId?: string;
  ownerId?: string;
}) {
  let query = supabase.from('erp_records').select('*').eq('collection_name', collectionName);
  if (options?.organizationId) query = query.eq('organization_id', options.organizationId);
  if (options?.ownerId) query = query.eq('owner_id', options.ownerId);
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ErpRecord<T>[];
}

export async function upsertRecord<T = Record<string, unknown>>(collectionName: string, recordKey: string, payload: T, options?: {
  organizationId?: string | null;
  ownerId?: string | null;
}) {
  const { data, error } = await supabase.from('erp_records').upsert({
    collection_name: collectionName,
    record_key: recordKey,
    payload,
    organization_id: options?.organizationId ?? null,
    owner_id: options?.ownerId ?? null,
  }, { onConflict: 'collection_name,record_key' }).select('*').single();
  if (error) throw error;
  return data as ErpRecord<T>;
}

export async function removeRecord(collectionName: string, recordKey: string) {
  const { error } = await supabase.from('erp_records').delete()
    .eq('collection_name', collectionName).eq('record_key', recordKey);
  if (error) throw error;
}

export function subscribeToCollection(collectionName: string, onChange: (record: ErpRecord | null, event: string) => void): RealtimeChannel {
  const channel = supabase.channel(`erp:${collectionName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_records', filter: `collection_name=eq.${collectionName}` }, payload => {
      const record = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as ErpRecord | null;
      onChange(record, payload.eventType);
    });
  void channel.subscribe();
  return channel;
}

export async function unsubscribeFromCollection(channel: RealtimeChannel) {
  await supabase.removeChannel(channel);
}
