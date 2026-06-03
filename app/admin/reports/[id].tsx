import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Field,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import { db } from '@/lib/firebase';
import type { ReportDetail } from '@/types/admin';

export default function AdminReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { can } = useAdmin();

  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporterName, setReporterName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setDetail(await adminApi.reports.detail(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resolve the reporter's uid to a display name (admins can read user docs).
  useEffect(() => {
    const rid = detail?.report.reportedBy;
    if (!rid) {
      setReporterName(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', rid))
      .then((snap) => {
        if (!cancelled) setReporterName((snap.data()?.displayName as string) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [detail?.report.reportedBy]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      Alert.alert('Done', ok);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const post = detail?.post as
    | { caption?: string; moderationStatus?: string; authorName?: string }
    | null
    | undefined;

  return (
    <AdminScreen title="Report" refreshing={loading} onRefresh={load}>
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : detail ? (
        <>
          <Card>
            <Text style={styles.label}>WHY · REASON</Text>
            <Text style={styles.body}>{detail.report.reason}</Text>
            <Text style={styles.meta}>Status: {detail.report.status}</Text>
          </Card>

          <Card>
            <Text style={styles.label}>WHO SENT IT · REPORTER</Text>
            <Text style={styles.body}>
              {reporterName ?? detail.report.reportedBy ?? '—'}
            </Text>
            {detail.report.reportedBy ? (
              <Text style={styles.meta}>uid: {detail.report.reportedBy}</Text>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.label}>ABOUT WHOM · REPORTED POST</Text>
            {post ? (
              <>
                <Text style={styles.body}>
                  {post.caption || '(no caption)'}
                </Text>
                <Text style={styles.meta}>
                  Author: {post.authorName ?? '—'} · {post.moderationStatus}
                </Text>
              </>
            ) : (
              <Text style={styles.meta}>Post not found / deleted.</Text>
            )}
          </Card>

          {can('reports.resolve') && detail.report.status === 'pending' ? (
            <Card>
              <Text style={styles.label}>RESOLUTION</Text>
              <Field
                label="NOTE"
                value={note}
                onChangeText={setNote}
                placeholder="resolution note"
                multiline
                autoCapitalize="sentences"
              />
              <AdminButton
                label="Dismiss (no action)"
                variant="ghost"
                disabled={busy}
                onPress={() =>
                  act(
                    () =>
                      adminApi.reports.resolve(detail.id, 'dismiss', note),
                    'Report dismissed.',
                  )
                }
              />
              {detail.report.postId ? (
                <>
                  <Text style={{ height: 8 }} />
                  <AdminButton
                    label="Hide post & resolve"
                    disabled={busy}
                    onPress={() =>
                      act(
                        () =>
                          adminApi.reports.resolve(
                            detail.id,
                            'hidePost',
                            note,
                          ),
                        'Post hidden, report resolved.',
                      )
                    }
                  />
                  <Text style={{ height: 8 }} />
                  <AdminButton
                    label="Remove post & resolve"
                    variant="danger"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        'Remove post',
                        'Soft-remove this post and resolve the report?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () =>
                              act(
                                () =>
                                  adminApi.reports.resolve(
                                    detail.id,
                                    'removePost',
                                    note,
                                  ),
                                'Post removed, report resolved.',
                              ),
                          },
                        ],
                      )
                    }
                  />
                </>
              ) : null}
              <Text style={{ height: 8 }} />
              <AdminButton
                label="Reject report"
                variant="ghost"
                disabled={busy}
                onPress={() =>
                  act(
                    () => adminApi.reports.reject(detail.id, note),
                    'Report rejected.',
                  )
                }
              />
            </Card>
          ) : null}
        </>
      ) : (
        <StateBlock empty emptyText="Report not found." />
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    body: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  });
