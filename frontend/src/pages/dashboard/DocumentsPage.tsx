import { Link } from 'react-router-dom';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { DocumentUploadZone } from '../../components/features/DocumentUploadZone/DocumentUploadZone';
import { useListDocumentsQuery, useDeleteDocumentMutation, useRetryDocumentMutation } from '../../store/api/documentApi';
import toast from 'react-hot-toast';

const statusVariant: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
  ready: 'success',
  failed: 'error',
  processing: 'warning',
  pending: 'neutral',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { data, isLoading } = useListDocumentsQuery();
  const [deleteDoc] = useDeleteDocumentMutation();
  const [retry] = useRetryDocumentMutation();

  const docs = data?.documents ?? [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove its chunks from the index.`)) return;
    await deleteDoc(id).unwrap().catch(() => toast.error('Delete failed'));
    toast.success('Document deleted');
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Documents" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Documents</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Upload documents to build your RAG knowledge base.</p>
        </div>

        <DocumentUploadZone />

        {isLoading && <SkeletonLoader lines={4} />}

        {!isLoading && docs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-accent-violet/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-accent-violet" />
            </div>
            <p className="text-body-md text-on-surface-variant">No documents yet. Upload one above to get started.</p>
          </div>
        )}

        {!isLoading && docs.length > 0 && (
          <Card padding="sm">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Name</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Type</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Size</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Chunks</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Status</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Added</th>
                  <th className="pb-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low">
                    <td className="py-3.5 px-4">
                      <Link to={`/dashboard/documents/${doc.id}`} className="font-medium text-on-surface hover:text-accent-violet transition-colors">
                        {doc.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant font-code">{doc.file_type.split('/')[1]?.toUpperCase() ?? doc.file_type}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{formatBytes(doc.file_size)}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{doc.chunk_count}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 flex items-center gap-2">
                      {doc.status === 'failed' && (
                        <Button variant="secondary" size="sm" onClick={() => retry(doc.id)}>
                          <RefreshCw size={13} /> Retry
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id, doc.name)}>
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
