import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOMAIN_PALETTE = [
  { name: 'Indigo', hex: '#6366F1', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500' },
  { name: 'Pink', hex: '#EC4899', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500' },
  { name: 'Emerald', hex: '#10B981', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500' },
  { name: 'Amber', hex: '#F59E0B', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500' },
  { name: 'Blue', hex: '#3B82F6', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500' },
  { name: 'Purple', hex: '#8B5CF6', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500' },
  { name: 'Rose', hex: '#EF4444', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500' },
  { name: 'Teal', hex: '#14B8A6', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500' },
  { name: 'Cyan', hex: '#06B6D4', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500' },
  { name: 'Orange', hex: '#F97316', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500' },
];

export function getDomainColor(domain: string): (typeof DOMAIN_PALETTE)[0] {
  if (!domain) return DOMAIN_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return DOMAIN_PALETTE[hash % DOMAIN_PALETTE.length];
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
