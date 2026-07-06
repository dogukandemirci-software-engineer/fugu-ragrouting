import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Couldn't load data",
  description = 'Something went wrong while fetching this page. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="bg-error-container border border-error/30 rounded-[10px] p-8 text-center">
      <AlertTriangle size={24} className="text-error mx-auto mb-3" />
      <h3 className="text-body-md font-semibold text-on-error-container mb-1">{title}</h3>
      <p className="text-body-sm text-on-error-container/80 mb-4">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-body-sm font-medium text-error border border-error/30 rounded-lg hover:bg-error/10 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
