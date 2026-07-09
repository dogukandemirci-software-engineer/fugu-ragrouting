import { useState } from 'react';
import { Terminal as MagicTerminal, TypingAnimation, AnimatedSpan } from '../magicui/terminal';
import { cn } from '../../lib/utils';

type Tab = 'ts' | 'go';

const TS_LINES = [
  { text: '$ npm install fugu-sdk', tone: 'cmd' as const },
  { text: '// 1. connect once', tone: 'comment' as const },
  { text: `import { FuguClient } from 'fugu-sdk';`, tone: 'code' as const },
  { text: `const client = new FuguClient({ apiKey: 'fugu_sk_...' });`, tone: 'code' as const },
  { text: '// 2. ask anything, routed automatically', tone: 'comment' as const },
  { text: `const { answer } = await client.query.execute('...');`, tone: 'code' as const },
  { text: '// 3. upload a document', tone: 'comment' as const },
  { text: `await client.documents.upload({ filename, data });`, tone: 'code' as const },
  { text: '✓ Package resolved — fugu-sdk', tone: 'ok' as const },
  { text: '✓ Client authenticated', tone: 'ok' as const },
  { text: '✓ Query routed — hybrid', tone: 'ok' as const },
  { text: '✓ Document indexed', tone: 'ok' as const },
];

const GO_LINES = [
  { text: '$ go get .../sdk-go', tone: 'cmd' as const },
  { text: '// 1. connect once', tone: 'comment' as const },
  { text: `client := fugu.NewClient(apiKey)`, tone: 'code' as const },
  { text: '// 2. ask anything, routed automatically', tone: 'comment' as const },
  { text: `resp, err := client.Query.Execute(ctx, "...", opts)`, tone: 'code' as const },
  { text: '// 3. upload a document', tone: 'comment' as const },
  { text: `_, err = client.Documents.Upload(ctx, doc)`, tone: 'code' as const },
  { text: '✓ Module resolved — sdk-go', tone: 'ok' as const },
  { text: '✓ Client authenticated', tone: 'ok' as const },
  { text: '✓ Query routed — hybrid', tone: 'ok' as const },
  { text: '✓ Document indexed', tone: 'ok' as const },
];

const TONE_CLASS: Record<'cmd' | 'comment' | 'code' | 'ok', string> = {
  cmd: 'text-emerald-400',
  comment: 'text-white/35 italic',
  code: 'text-white/70',
  ok: 'text-accent-teal-glow',
};

export function SdkTerminal() {
  const [tab, setTab] = useState<Tab>('ts');
  const lines = tab === 'ts' ? TS_LINES : GO_LINES;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="inline-flex w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-1 mb-4">
        {(['ts', 'go'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-md text-[13px] font-semibold transition-colors',
              tab === t ? 'bg-accent-violet text-white' : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t === 'ts' ? 'TypeScript' : 'Go'}
          </button>
        ))}
      </div>
      <MagicTerminal key={tab} className="w-full">
        {lines.map((line, i) =>
          line.tone === 'code' ? (
            <TypingAnimation key={i} duration={18} delay={i * 60} className={TONE_CLASS[line.tone]}>
              {line.text}
            </TypingAnimation>
          ) : (
            <AnimatedSpan key={i} className={TONE_CLASS[line.tone]}>
              {line.text}
            </AnimatedSpan>
          )
        )}
      </MagicTerminal>
    </div>
  );
}
