import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { ErrorState } from '../../components/ui/ErrorState';
import { useGetDocumentQuery, useRetryDocumentMutation } from '../../store/api/documentApi';

const statusVariant: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
  ready: 'success',
  failed: 'error',
  processing: 'warning',
  pending: 'neutral',
};

function formatBytes(bytes: number): string {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useGetDocumentQuery(id!);
  const [retry] = useRetryDocumentMutation();
  const doc = data?.document;

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/documents" className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-headline-md font-headline font-bold text-on-surface">Document Detail</h1>
        </div>

        {isLoading && <SkeletonLoader lines={6} />}

        {!isLoading && isError && (
          <ErrorState title="Couldn't load document" description="Something went wrong while fetching this document." onRetry={refetch} />
        )}

        {doc && (
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-headline-md font-headline font-semibold text-on-surface">{doc.name}</h2>
                  <p className="text-body-sm text-on-surface-variant mt-1">{formatBytes(doc.file_size)} · {doc.file_type}</p>
                </div>
                <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
              </div>

              {doc.status === 'failed' && doc.error_message && (
                <div className="mt-4 p-3 bg-error-container rounded-lg">
                  <p className="text-body-sm text-on-error-container font-medium">Ingestion failed</p>
                  <p className="text-body-sm text-on-error-container mt-1">{doc.error_message}</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => retry(doc.id)}>
                    <RefreshCw size={13} /> Retry ingestion
                  </Button>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card padding="sm">
                <p className="text-label-caps text-on-surface-variant font-code mb-1">Chunks</p>
                <p className="text-3xl font-headline font-bold text-on-surface">{doc.chunk_count}</p>
              </Card>
              <Card padding="sm">
                <p className="text-label-caps text-on-surface-variant font-code mb-1">Added</p>
                <p className="text-body-md font-medium text-on-surface">{new Date(doc.created_at).toLocaleDateString()}</p>
              </Card>
              <Card padding="sm">
                <p className="text-label-caps text-on-surface-variant font-code mb-1">Status</p>
                <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
