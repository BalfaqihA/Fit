import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { AdminButton, AdminScreen, StateBlock } from '@/components/admin/admin-kit';
import {
  KnowledgeForm,
  toFormValue,
  toKnowledgeDoc,
  type KnowledgeFormValue,
} from '@/components/admin/knowledge-form';
import { useAdmin } from '@/hooks/use-admin';
import { adminApi } from '@/lib/admin';
import type { KnowledgeDoc } from '@/types/admin';

export default function EditKnowledge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAdmin();
  const [doc, setDoc] = useState<KnowledgeDoc | null>(null);
  const [initial, setInitial] = useState<KnowledgeFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const d = await adminApi.knowledge.get(id);
      setDoc(d);
      setInitial(toFormValue(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load doc.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const archived = doc?.status === 'archived';

  return (
    <AdminScreen title="Edit Knowledge" refreshing={loading} onRefresh={load}>
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : initial && doc ? (
        <>
          <KnowledgeForm
            initial={initial}
            submitLabel="Save changes"
            busy={busy}
            onSubmit={async (v) => {
              if (!can('knowledge.write')) return;
              setBusy(true);
              try {
                await adminApi.knowledge.update(doc.id, toKnowledgeDoc(v));
                Alert.alert('Saved', 'Changes saved.');
                await load();
              } catch (e) {
                Alert.alert(
                  'Error',
                  e instanceof Error ? e.message : 'Failed to save.',
                );
              } finally {
                setBusy(false);
              }
            }}
          />
          <View style={{ height: 12 }} />
          {can('knowledge.write') ? (
            <AdminButton
              label={archived ? 'Unarchive' : 'Archive'}
              variant="ghost"
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await adminApi.knowledge.archive(doc.id, !archived);
                  await load();
                } catch (e) {
                  Alert.alert(
                    'Error',
                    e instanceof Error ? e.message : 'Failed.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
          {can('knowledge.delete') ? (
            <>
              <View style={{ height: 12 }} />
              <AdminButton
                label="Delete permanently"
                variant="danger"
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    'Delete',
                    'Permanently delete this knowledge doc?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          setBusy(true);
                          try {
                            await adminApi.knowledge.remove(doc.id);
                            Alert.alert('Deleted', 'Doc deleted.', [
                              { text: 'OK', onPress: () => router.back() },
                            ]);
                          } catch (e) {
                            Alert.alert(
                              'Error',
                              e instanceof Error
                                ? e.message
                                : 'Failed to delete.',
                            );
                          } finally {
                            setBusy(false);
                          }
                        },
                      },
                    ],
                  )
                }
              />
            </>
          ) : null}
        </>
      ) : (
        <StateBlock empty emptyText="Doc not found." />
      )}
    </AdminScreen>
  );
}
