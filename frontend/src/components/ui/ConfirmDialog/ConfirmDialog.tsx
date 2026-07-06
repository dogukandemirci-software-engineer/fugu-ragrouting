import { AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'brand';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {variant === 'destructive' && (
            <div className="w-9 h-9 rounded-full bg-error-container flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-error" />
            </div>
          )}
          <div>
            <h2 className="text-headline-sm font-headline font-bold text-on-surface">{title}</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'brand'}
            className="flex-1 justify-center"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
