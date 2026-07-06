import {
  Key, FileText, Users, Webhook, CreditCard, Shield, UserCircle, LogIn,
  Building2, type LucideIcon,
} from 'lucide-react';

interface ActionMeta {
  icon: LucideIcon;
  colorClass: string;
  label: string;
}

// Maps an audit action's namespace prefix (e.g. "document.uploaded" → "document")
// to a distinct icon + accent color, so the activity feed reads as categorized
// events instead of a flat list of identical bullet points.
const CATEGORY_META: Record<string, Omit<ActionMeta, 'label'>> = {
  api_key: { icon: Key, colorClass: 'text-accent-violet bg-accent-violet/10' },
  document: { icon: FileText, colorClass: 'text-accent-teal-glow bg-accent-teal-glow/10' },
  team: { icon: Users, colorClass: 'text-secondary bg-secondary/10' },
  webhook: { icon: Webhook, colorClass: 'text-accent-magenta bg-accent-magenta/10' },
  subscription: { icon: CreditCard, colorClass: 'text-accent-teal-glow bg-accent-teal-glow/10' },
  security: { icon: Shield, colorClass: 'text-error bg-error-container' },
  profile: { icon: UserCircle, colorClass: 'text-secondary bg-secondary/10' },
  auth: { icon: LogIn, colorClass: 'text-error bg-error-container' },
  org: { icon: Building2, colorClass: 'text-accent-violet bg-accent-violet/10' },
  gdpr: { icon: Shield, colorClass: 'text-error bg-error-container' },
};

const DEFAULT_META: Omit<ActionMeta, 'label'> = {
  icon: Building2,
  colorClass: 'text-on-surface-variant bg-surface-container-high',
};

export function getActionMeta(action: string): ActionMeta {
  const prefix = action.split('.')[0];
  const meta = CATEGORY_META[prefix] ?? DEFAULT_META;
  return { ...meta, label: formatActionLabel(action) };
}

export function formatActionLabel(action: string): string {
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' › ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
