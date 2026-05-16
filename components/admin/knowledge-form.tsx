import React, { useState } from 'react';

import { AdminButton, Field } from '@/components/admin/admin-kit';
import type { KnowledgeDoc } from '@/types/admin';

export type KnowledgeFormValue = {
  title: string;
  content: string;
  category: string;
  tags: string;
  keywords: string;
  goal: string;
  fitnessLevel: string;
  difficulty: string;
  safetyNotes: string;
};

export function toFormValue(d?: Partial<KnowledgeDoc>): KnowledgeFormValue {
  return {
    title: d?.title ?? '',
    content: d?.content ?? '',
    category: d?.category ?? '',
    tags: (d?.tags ?? []).join(', '),
    keywords: (d?.keywords ?? []).join(', '),
    goal: d?.goal ?? '',
    fitnessLevel: d?.fitnessLevel ?? '',
    difficulty: d?.difficulty ?? '',
    safetyNotes: d?.safetyNotes ?? '',
  };
}

export function toKnowledgeDoc(v: KnowledgeFormValue): Partial<KnowledgeDoc> {
  const csv = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    title: v.title.trim(),
    content: v.content.trim(),
    category: v.category.trim() || null,
    tags: csv(v.tags),
    keywords: csv(v.keywords),
    goal: v.goal.trim() || null,
    fitnessLevel: v.fitnessLevel.trim() || null,
    difficulty: v.difficulty.trim() || null,
    safetyNotes: v.safetyNotes.trim() || null,
  };
}

export function KnowledgeForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial: KnowledgeFormValue;
  submitLabel: string;
  busy: boolean;
  onSubmit: (v: KnowledgeFormValue) => void;
}) {
  const [v, setV] = useState<KnowledgeFormValue>(initial);
  const set = (k: keyof KnowledgeFormValue) => (t: string) =>
    setV((p) => ({ ...p, [k]: t }));

  return (
    <>
      <Field
        label="TITLE"
        value={v.title}
        onChangeText={set('title')}
        autoCapitalize="sentences"
      />
      <Field
        label="CONTENT"
        value={v.content}
        onChangeText={set('content')}
        multiline
        autoCapitalize="sentences"
      />
      <Field label="CATEGORY" value={v.category} onChangeText={set('category')} />
      <Field
        label="TAGS (comma separated)"
        value={v.tags}
        onChangeText={set('tags')}
      />
      <Field
        label="KEYWORDS (comma separated)"
        value={v.keywords}
        onChangeText={set('keywords')}
      />
      <Field label="GOAL" value={v.goal} onChangeText={set('goal')} />
      <Field
        label="FITNESS LEVEL"
        value={v.fitnessLevel}
        onChangeText={set('fitnessLevel')}
      />
      <Field
        label="DIFFICULTY"
        value={v.difficulty}
        onChangeText={set('difficulty')}
      />
      <Field
        label="SAFETY NOTES"
        value={v.safetyNotes}
        onChangeText={set('safetyNotes')}
        multiline
        autoCapitalize="sentences"
      />
      <AdminButton
        label={busy ? 'Saving…' : submitLabel}
        onPress={() => onSubmit(v)}
        disabled={busy}
      />
    </>
  );
}
