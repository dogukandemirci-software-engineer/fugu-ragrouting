import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QueryExplainPanel } from '../../components/features/QueryExplainPanel/QueryExplainPanel';
import { useExecuteQueryMutation, useListQueryLogsQuery } from '../../store/api/queryApi';
import { useQuotaStatus } from '../../hooks/useQuotaStatus';
import type { QueryResponse } from '../../store/api/queryApi';
import toast from 'react-hot-toast';

const STRATEGIES = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'vector_only', label: 'Vector only' },
  { value: 'graph_only', label: 'Graph only' },
  { value: 'hybrid', label: 'Hybrid' },
];

export function QueryExplorerPage() {
  const [queryText, setQueryText] = useState('');
  const [strategy, setStrategy] = useState('auto');
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  const { hardBlocked } = useQuotaStatus();
  const [execute, { isLoading }] = useExecuteQueryMutation();
  const { data: logs } = useListQueryLogsQuery({ limit: 10 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || hardBlocked) return;
    try {
      const res = await execute({ query: queryText, strategy: strategy as any }).unwrap();
      setResult(res);
      setShowExplain(false);
    } catch (err: any) {
      const code = err?.data?.error?.code;
      if (code === 'QUOTA_EXCEEDED') {
        toast.error('Monthly query quota exceeded. Upgrade your plan.');
      } else {
        toast.error('Query failed. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Query Explorer" />
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Main query area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">Query Explorer</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Test FUGU's intelligent routing engine in real time.</p>
          </div>

          {hardBlocked && (
            <div className="flex items-center gap-3 p-4 bg-error-container rounded-card text-on-error-container">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-body-sm">Query limit reached. <a href="/dashboard/billing" className="font-semibold underline">Upgrade your plan</a> to continue.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              disabled={hardBlocked}
              placeholder="Ask anything about your documents… e.g. 'Who are the authors related to this topic?'"
              className="w-full h-28 resize-none px-4 py-3 text-body-md font-body text-on-surface bg-surface-container-lowest border border-outline-variant rounded-card focus:outline-none focus:ring-2 focus:ring-accent-violet/30 focus:border-accent-violet placeholder:text-on-surface-variant/60 transition-colors disabled:opacity-50"
            />
            <div className="flex items-center gap-3">
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="px-3 py-2 text-body-sm font-body text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
              >
                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Button type="submit" variant="brand" loading={isLoading} disabled={!queryText.trim() || hardBlocked}>
                <Search size={16} /> Run query
              </Button>
            </div>
          </form>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Explain panel toggle */}
              <button
                onClick={() => setShowExplain(!showExplain)}
                className="flex items-center gap-2 text-body-sm text-accent-violet hover:underline"
              >
                {showExplain ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showExplain ? 'Hide' : 'Show'} explain
              </button>

              {showExplain && <QueryExplainPanel result={result} queryText={queryText} />}

              {/* Results list */}
              <div className="space-y-3">
                {result.results.length === 0 && (
                  <Card>
                    <p className="text-body-md text-on-surface-variant text-center py-4">No results found for this query.</p>
                  </Card>
                )}
                {result.results.map((r, i) => (
                  <Card key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={r.source === 'vector' ? 'info' : 'full-access'}>{r.source}</Badge>
                      <span className="text-label-caps text-on-surface-variant font-code">score: {r.score.toFixed(3)}</span>
                    </div>
                    <p className="text-body-sm text-on-surface leading-relaxed">{r.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div className="w-72 border-l border-outline-variant flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h3 className="text-body-sm font-medium text-on-surface">Query history</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
            {logs?.logs.map(log => (
              <button
                key={log.id}
                onClick={() => setQueryText(log.query_text)}
                className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors"
              >
                <p className="text-body-sm text-on-surface truncate">{log.query_text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-on-surface-variant">{log.routing_strategy.replace('_', ' ')}</span>
                  <span className="text-[10px] text-on-surface-variant">·</span>
                  <span className="text-[10px] text-on-surface-variant">{log.response_time_ms}ms</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
