import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Play, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Clock, Zap, AlertTriangle, Sparkles, History } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useListQueryLogsQuery, queryApi } from '../../store/api/queryApi';
import { useQuotaStatus } from '../../hooks/useQuotaStatus';
import { useQueryStream } from '../../hooks/useQueryStream';
import { useDispatch } from 'react-redux';
import { setGraphUnavailable } from '../../store/uiSlice';
import type { QueryResponse } from '../../store/api/queryApi';
import { colors } from '../../theme/tokens';
import toast from 'react-hot-toast';

const STRATEGIES = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'vector_only', label: 'Vector only' },
  { value: 'graph_only', label: 'Graph only' },
  { value: 'hybrid', label: 'Hybrid' },
];

const strategyColor: Record<string, string> = {
  vector_only: colors.secondary,
  graph_only: colors['accent-teal-glow'],
  hybrid: colors['accent-violet'],
  auto: colors['accent-magenta'],
};

export function QueryExplorerPage() {
  const [queryText, setQueryText] = useState('');
  const [strategy, setStrategy] = useState('auto');
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const { hardBlocked } = useQuotaStatus();
  const dispatch = useDispatch();
  const { answer: streamedAnswer, isStreaming, run: runStream } = useQueryStream();
  const { data: logs } = useListQueryLogsQuery({ limit: 10 });

  const isLoading = isStreaming;
  // While streaming, `streamResult` is null and we render the accumulating text;
  // once done, prefer the local `result` (also holds finalized citations/sources).
  const displayResult = result;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || hardBlocked || isStreaming) return;
    const start = Date.now();
    setResult(null);
    setShowExplain(false);
    setActiveCitation(null);

    const outcome = await runStream({ query: queryText, strategy });
    if (outcome.ok && outcome.result) {
      const res = outcome.result;
      setResult(res);
      setResponseTime(Date.now() - start);
      setShowSources(res.answer_degraded || res.results.length === 0);
      if (res.explain?.graph_available === false) dispatch(setGraphUnavailable(true));
      // Refresh the shared team history sidebar with the just-logged query.
      dispatch(queryApi.util.invalidateTags(['QueryLog']));
    } else if (outcome.error && outcome.error !== 'aborted') {
      toast.error(outcome.error);
    }
  };

  const copyAnswer = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.answer || JSON.stringify(result, null, 2));
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 1500);
    toast.success('Copied to clipboard');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const copyRawJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success('Copied raw JSON');
  };

  const jumpToCitation = (marker: string) => {
    setShowSources(true);
    setActiveCitation(marker);
    requestAnimationFrame(() => {
      document.getElementById(`source-${marker}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Query Explorer" />

      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-6 space-y-6">

          {/* Header */}
          <div>
            <h2 className="text-headline-md font-bold text-primary">Query Explorer</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Ask questions about your indexed documents — answers are generated and grounded in retrieved sources.
            </p>
          </div>

          {hardBlocked && (
            <div className="flex items-center gap-3 p-4 bg-error-container rounded-[10px] text-on-error-container text-body-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                Query limit reached.{' '}
                <a href="/dashboard/billing" className="font-semibold underline">Upgrade your plan</a>{' '}
                to continue.
              </span>
            </div>
          )}

          {/* Input Card */}
          <form onSubmit={handleSubmit}>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] shadow-sm">
              {/* Card header */}
              <div className="bg-background-alt border-b border-outline-variant px-4 py-3 rounded-t-[10px] flex justify-between items-center">
                <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold text-[11px]">
                  Input Query
                </span>
                <div className="flex items-center gap-3">
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="text-[12px] text-primary bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-mono text-[10px] rounded">POST</span>
                  <span className="text-on-surface-variant font-mono text-[10px]">/v1/query</span>
                </div>
              </div>

              {/* Textarea */}
              <div className="p-4">
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={hardBlocked}
                  placeholder="Ask anything about your documents…&#10;e.g. Who are the authors mentioned in the uploaded CV?"
                  rows={5}
                  className="w-full resize-none bg-surface-container-lowest text-primary text-body-sm font-body rounded-md p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary placeholder:text-on-surface-variant/50 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Action bar */}
              <div className="px-4 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-on-surface-variant text-[12px]">
                  <Clock size={14} />
                  <span className="hidden sm:inline">Answers stream in as they're generated</span>
                  <span className="hidden md:inline text-on-surface-variant/60">· Ctrl+Enter to run</span>
                </div>
                <button
                  type="submit"
                  disabled={!queryText.trim() || hardBlocked || isLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-[10px] text-white text-body-sm font-semibold bg-brand-indigo transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play size={15} fill="white" />
                  )}
                  {isLoading ? 'Running…' : 'Run Query'}
                </button>
              </div>
            </div>
          </form>

          {/* Answer */}
          {(displayResult || isStreaming) && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] shadow-sm animate-fade-in-up">
              {/* Answer header */}
              <div className="bg-background-alt border-b border-outline-variant px-4 py-3 rounded-t-[10px] flex justify-between items-center">
                <span className="flex items-center gap-2 text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold text-[11px]">
                  <Sparkles size={13} className="text-accent-violet" />
                  Answer
                </span>
                <div className="flex items-center gap-3">
                  {isStreaming && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-accent-violet">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse" />
                      streaming
                    </span>
                  )}
                  {!isStreaming && responseTime !== null && (
                    <span className="font-mono text-[10px] text-on-surface-variant">{responseTime}ms</span>
                  )}
                  {displayResult && (
                    <button
                      onClick={() => setShowExplain(!showExplain)}
                      className="flex items-center gap-1 text-[12px] text-secondary hover:text-secondary/80 transition-colors"
                    >
                      {showExplain ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      Explain
                    </button>
                  )}
                  <button onClick={copyAnswer} className="text-on-surface-variant hover:text-primary transition-colors" title="Copy answer">
                    {copiedAnswer ? <Check size={15} className="text-success-green animate-fade-in" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              {/* Explain panel */}
              {showExplain && displayResult && (
                <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Strategy', value: String(displayResult.explain.strategy_final ?? '-').replace('_', ' ') },
                    { label: 'Classifier', value: String(displayResult.explain.classifier ?? '-') },
                    { label: 'Confidence', value: typeof displayResult.explain.confidence === 'number' ? `${(displayResult.explain.confidence * 100).toFixed(0)}%` : '-' },
                    { label: 'Vector / Graph', value: `${displayResult.explain.vector_count ?? 0} / ${displayResult.explain.graph_count ?? 0}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant">
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1">{label}</p>
                      <p className="text-body-sm font-medium text-primary">{value}</p>
                    </div>
                  ))}
                  {displayResult.explain.graph_available === false && (
                    <div className="col-span-2 md:col-span-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12px]">
                      ⚠ Graph routing unavailable — results served via vector-only fallback
                    </div>
                  )}
                  <button
                    onClick={copyRawJson}
                    className="col-span-2 md:col-span-4 text-left text-[11px] text-secondary hover:text-secondary/80 transition-colors"
                  >
                    Copy raw JSON response
                  </button>
                </div>
              )}

              {/* Degraded warning */}
              {displayResult?.answer_degraded && (
                <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12px]">
                  <AlertTriangle size={14} className="shrink-0" />
                  Answer generation is temporarily unavailable — showing raw retrieved passages below.
                </div>
              )}

              {/* Synthesized answer (progressive while streaming) */}
              {!displayResult?.answer_degraded && (
                <div className="px-4 py-4">
                  <div className="prose-fugu text-body-sm text-on-surface leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: (props) => (
                          <div className="overflow-x-auto my-3">
                            <table className="w-full text-[13px] border-collapse" {...props} />
                          </div>
                        ),
                        th: (props) => (
                          <th className="border border-outline-variant bg-surface-container px-3 py-2 text-left font-semibold text-primary" {...props} />
                        ),
                        td: (props) => (
                          <td className="border border-outline-variant px-3 py-2 text-on-surface" {...props} />
                        ),
                        h2: (props) => <h2 className="text-body-lg font-bold text-primary mt-4 mb-2" {...props} />,
                        h3: (props) => <h3 className="text-body-md font-bold text-primary mt-3 mb-1.5" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                        code: (props) => (
                          <code className="font-code text-[12px] bg-surface-container px-1.5 py-0.5 rounded" {...props} />
                        ),
                        pre: (props) => (
                          <pre className="font-code text-[12px] bg-surface-container-high rounded-lg p-3 overflow-x-auto my-2" {...props} />
                        ),
                        p: (props) => <p className="my-2" {...props} />,
                        strong: (props) => <strong className="font-semibold text-primary" {...props} />,
                      }}
                    >
                      {displayResult ? displayResult.answer : streamedAnswer}
                    </ReactMarkdown>
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 ml-0.5 align-text-bottom bg-accent-violet animate-pulse rounded-sm" />
                    )}
                  </div>

                  {displayResult && displayResult.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-outline-variant">
                      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mr-1">Sources:</span>
                      {displayResult.citations.map((c) => (
                        <button
                          key={c}
                          onClick={() => jumpToCitation(c)}
                          className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-full border border-secondary/40 text-secondary hover:bg-secondary/10 transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sources panel (collapsible) — only once retrieval metadata arrives */}
              {displayResult && (
              <div className="border-t border-outline-variant">
                <button
                  onClick={() => setShowSources(!showSources)}
                  aria-expanded={showSources}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-low transition-colors"
                >
                  <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold text-[11px]">
                    Retrieved Sources ({displayResult.results.length})
                  </span>
                  {showSources ? <ChevronUp size={14} className="text-on-surface-variant" /> : <ChevronDown size={14} className="text-on-surface-variant" />}
                </button>

                {showSources && (
                  <div className="divide-y divide-outline-variant border-t border-outline-variant">
                    {displayResult.results.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Zap size={32} className="mx-auto mb-3 text-on-surface-variant/30" />
                        <p className="text-body-sm text-on-surface-variant">No matching results found for this query.</p>
                        <p className="text-[12px] text-on-surface-variant/60 mt-1">Try uploading relevant documents or rephrasing your query.</p>
                      </div>
                    ) : (
                      displayResult.results.map((r, i) => {
                        const marker = `S${i + 1}`;
                        return (
                          <div
                            key={i}
                            id={`source-${marker}`}
                            className={`px-4 py-4 transition-colors ${activeCitation === marker ? 'bg-secondary/10' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-secondary border border-secondary/40 rounded">
                                  {marker}
                                </span>
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                                  style={{ background: strategyColor[r.source] ?? colors.outline }}
                                >
                                  {r.source}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-on-surface-variant">
                                score: {typeof r.score === 'number' ? r.score.toFixed(3) : '-'}
                              </span>
                            </div>
                            <p className="text-body-sm text-on-surface leading-relaxed whitespace-pre-line">{r.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </div>

        {/* History sidebar (desktop) */}
        <div className="hidden lg:flex w-72 border-l border-outline-variant flex-col overflow-hidden bg-surface-container-lowest">
          <div className="px-4 py-3 border-b border-outline-variant bg-background-alt">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Team Query History</h3>
            <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Shared across your organization</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
            <QueryHistoryList
              logs={logs?.logs}
              selectedId={selectedLogId}
              onSelect={(id, text) => { setSelectedLogId(id); setQueryText(text); }}
            />
          </div>
        </div>

        {/* History trigger (mobile/tablet) */}
        <button
          onClick={() => setMobileHistoryOpen(true)}
          aria-label="View query history"
          className="lg:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-secondary-container text-white shadow-lg flex items-center justify-center z-30"
        >
          <History size={20} />
        </button>
      </div>

      <Modal open={mobileHistoryOpen} onClose={() => setMobileHistoryOpen(false)} title="Query History" size="sm">
        <div className="-m-6 divide-y divide-outline-variant max-h-[70vh] overflow-y-auto">
          <QueryHistoryList
            logs={logs?.logs}
            selectedId={selectedLogId}
            onSelect={(id, text) => { setSelectedLogId(id); setQueryText(text); setMobileHistoryOpen(false); }}
          />
        </div>
      </Modal>
    </div>
  );
}

function QueryHistoryList({
  logs,
  selectedId,
  onSelect,
}: {
  logs?: Array<{
    id: string;
    query_text: string;
    routing_strategy?: string | null;
    response_time_ms: number;
    user_full_name?: string | null;
    user_email?: string | null;
  }>;
  selectedId?: string | null;
  onSelect: (id: string, queryText: string) => void;
}) {
  if (!logs?.length) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[12px] text-on-surface-variant">No queries yet.</p>
      </div>
    );
  }

  return (
    <>
      {logs.map((log) => (
        <button
          key={log.id}
          onClick={() => onSelect(log.id, log.query_text)}
          aria-current={selectedId === log.id}
          className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
            selectedId === log.id
              ? 'bg-secondary/10 border-l-secondary'
              : 'border-l-transparent hover:bg-surface-container-low'
          }`}
        >
          <p className="text-body-sm text-primary truncate">{log.query_text}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="neutral" className="text-[10px]">
              {(log.routing_strategy ?? 'auto').replace('_', ' ')}
            </Badge>
            <span className="text-[10px] text-on-surface-variant">{log.response_time_ms}ms</span>
            {(log.user_full_name || log.user_email) && (
              <span className="text-[10px] text-on-surface-variant/70 truncate">
                · {log.user_full_name ?? log.user_email}
              </span>
            )}
          </div>
        </button>
      ))}
    </>
  );
}
