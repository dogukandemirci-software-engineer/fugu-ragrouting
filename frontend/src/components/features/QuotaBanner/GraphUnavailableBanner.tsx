import { Wifi } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setGraphUnavailable } from '../../../store/uiSlice';

export function GraphUnavailableBanner({ visible }: { visible: boolean }) {
  const dispatch = useDispatch();
  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 bg-surface-container border-b border-outline-variant text-body-sm text-on-surface-variant font-body">
      <Wifi size={15} className="text-accent-violet shrink-0" />
      <span className="flex-1">
        Graph routing is temporarily unavailable. Queries are being served via vector search only.
        Results may be less complete for relationship queries.
      </span>
      <button
        onClick={() => dispatch(setGraphUnavailable(false))}
        className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
