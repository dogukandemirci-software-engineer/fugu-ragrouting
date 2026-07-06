import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, RefreshCw, Trash2, Upload, AlertCircle, AlertTriangle } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Badge } from '../../components/ui/Badge';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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
  const { data, isLoading, isError, refetch } = useListDocumentsQuery();
  const [deleteDoc, { isLoading: deleting }] = useDeleteDocumentMutation();
  const [retry] = useRetryDocumentMutation();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const docs = data?.documents ?? [];

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDoc(pendingDelete.id).unwrap();
      toast.success('Document deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Documents" />

      <div className="flex-1 px-6 md:px-12 py-6 space-y-6 max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-headline-md font-bold text-primary">Documents</h1>
            <p className="text-on-surface-variant text-body-sm mt-1">
              Upload and manage your knowledge base documents.
            </p>
          </div>
        </div>

        {/* Upload zone */}
        <DocumentUploadZone />

        {/* Loading */}
        {isLoading && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6">
            <SkeletonLoader lines={4} />
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div className="bg-error-container border border-error/30 rounded-[10px] p-8 text-center">
            <AlertTriangle size={24} className="text-error mx-auto mb-3" />
            <h3 className="text-body-md font-semibold text-on-error-container mb-1">Couldn't load documents</h3>
            <p className="text-body-sm text-on-error-container/80 mb-4">
              Something went wrong while fetching your documents.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-body-sm font-medium text-error border border-error/30 rounded-lg hover:bg-error/10 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && docs.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-violet/10 flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-accent-violet" />
            </div>
            <h3 className="text-body-md font-semibold text-primary mb-2">No documents yet</h3>
            <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto">
              Upload PDF, DOCX, TXT, CSV, XLSX, or JSON files above to build your RAG knowledge base.
            </p>
          </div>
        )}

        {/* Documents table */}
        {!isLoading && !isError && docs.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] overflow-hidden">
            <div className="bg-background-alt border-b border-outline-variant px-4 py-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
                {docs.length} document{docs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left bg-background-alt">
                    <th className="py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Name</th>
                    <th className="hidden sm:table-cell py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Type</th>
                    <th className="hidden md:table-cell py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Size</th>
                    <th className="hidden lg:table-cell py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Chunks</th>
                    <th className="py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Status</th>
                    <th className="hidden lg:table-cell py-3 px-4 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">Added</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/dashboard/documents/${doc.id}`}
                          className="flex items-center gap-2 font-medium text-primary hover:text-secondary transition-colors"
                        >
                          <FileText size={14} className="text-on-surface-variant shrink-0" />
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">{doc.name}</span>
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell py-3.5 px-4">
                        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                          {doc.file_type.split('/')[1]?.toUpperCase() ?? doc.file_type}
                        </span>
                      </td>
                      <td className="hidden md:table-cell py-3.5 px-4 text-on-surface-variant whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                      <td className="hidden lg:table-cell py-3.5 px-4 text-on-surface-variant">{doc.chunk_count}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusVariant[doc.status] ?? 'neutral'}>{doc.status}</Badge>
                          {doc.status === 'failed' && doc.error_message && (
                            <span title={doc.error_message}>
                              <AlertCircle size={13} className="text-error cursor-help" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell py-3.5 px-4 text-on-surface-variant text-[12px] whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {doc.status === 'failed' && (
                            <button
                              onClick={() => retry(doc.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-secondary border border-secondary/30 rounded-md hover:bg-secondary/10 transition-colors"
                            >
                              <RefreshCw size={11} /> Retry
                            </button>
                          )}
                          <button
                            onClick={() => setPendingDelete({ id: doc.id, name: doc.name })}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete document"
        description={`Delete "${pendingDelete?.name}"? This will also remove its chunks from the index. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
