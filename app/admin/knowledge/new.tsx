import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { AdminScreen } from '@/components/admin/admin-kit';
import {
  KnowledgeForm,
  toFormValue,
  toKnowledgeDoc,
} from '@/components/admin/knowledge-form';
import { adminApi } from '@/lib/admin';

export default function NewKnowledge() {
  const [busy, setBusy] = useState(false);
  return (
    <AdminScreen title="New Knowledge">
      <KnowledgeForm
        initial={toFormValue()}
        submitLabel="Create"
        busy={busy}
        onSubmit={async (v) => {
          setBusy(true);
          try {
            await adminApi.knowledge.create(toKnowledgeDoc(v));
            Alert.alert('Created', 'Knowledge doc created.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Failed to create.',
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </AdminScreen>
  );
}
