import { Badge } from '../../ui/Badge';
import type { QueryResponse } from '../../../store/api/queryApi';

interface Props {
  result: QueryResponse;
  queryText: string;
}

export function QueryExplainPanel({ result }: Props) {
  const explain = result.explain as Record<string, unknown>;

  const strategyColor: Record<string, 'full-access' | 'info' | 'neutral'> = {
    vector_only: 'info',
    graph_only: 'full-access',
    hybrid: 'neutral',
  };

  return (
    <div className="border border-outline-variant rounded-card overflow-hidden">
      <div className="px-4 py-3 bg-surface-container border-b border-outline-variant flex items-center justify-between">
        <h3 className="text-body-sm font-medium text-on-surface">Query Explain</h3>
        <Badge variant={strategyColor[explain.strategy_final as string] ?? 'neutral'}>
          {String(explain.strategy_final ?? '').replace('_', ' ')}
        </Badge>
      </div>

      <div className="p-4 space-y-3 text-body-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-label-caps text-on-surface-variant mb-1">Classifier</p>
            <p className="font-medium text-on-surface">{String(explain.classifier ?? '-')}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-label-caps text-on-surface-variant mb-1">Confidence</p>
            <p className="font-medium text-on-surface">
              {typeof explain.confidence === 'number' ? `${(explain.confidence * 100).toFixed(0)}%` : '-'}
            </p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-label-caps text-on-surface-variant mb-1">Vector Results</p>
            <p className="font-medium text-on-surface">{String(explain.vector_count ?? 0)}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-label-caps text-on-surface-variant mb-1">Graph Results</p>
            <p className="font-medium text-on-surface">{String(explain.graph_count ?? 0)}</p>
          </div>
        </div>

        {explain.graph_available === false && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-body-sm">
            ⚠ Graph routing was unavailable — results served via vector-only fallback
          </div>
        )}
      </div>
    </div>
  );
}
