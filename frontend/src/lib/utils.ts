import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn/magicui utility — merges clsx-combined classes through
// tailwind-merge so conflicting Tailwind classes (e.g. two different `p-*`
// utilities) resolve to the last one instead of both applying.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
