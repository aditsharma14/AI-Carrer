import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges conditional classNames (clsx) and resolves conflicting Tailwind
// utilities (twMerge) so a consumer can override a default class without
// both ending up in the DOM, e.g. cn('px-4', props.className) with
// className="px-6" correctly keeps only px-6.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
