import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { useUploadDocumentMutation } from '../../../store/api/documentApi';
import toast from 'react-hot-toast';

export function DocumentUploadZone() {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadDocumentMutation();

  const handleFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await upload(form).unwrap();
      toast.success(`"${file.name}" uploaded — processing started`);
    } catch (err: any) {
      const msg = err?.data?.error?.message ?? err?.error ?? 'Upload failed. Please try again.';
      toast.error(msg);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a document — click or press Enter to browse, or drag and drop a file here"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={clsx(
        'flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed rounded-card cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet',
        dragging
          ? 'border-accent-violet bg-accent-violet/5'
          : 'border-outline-variant hover:border-accent-violet/50 hover:bg-surface-container-low',
        isLoading && 'opacity-50 pointer-events-none'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.json,.csv,.docx,.xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <div className="w-14 h-14 rounded-full bg-accent-violet/10 flex items-center justify-center">
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload size={24} className="text-accent-violet" />
        )}
      </div>
      <div className="text-center">
        <p className="text-body-md font-medium text-on-surface mb-1">
          {isLoading ? 'Uploading...' : 'Drop your document here'}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          or <span className="text-accent-violet font-medium">browse</span> — PDF, DOCX, TXT, MD, CSV, XLSX, JSON (max 50 MB)
        </p>
      </div>
    </div>
  );
}
