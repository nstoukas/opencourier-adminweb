import type { Language } from '@/i18n/language'

// A removal reason's label in the reader's language (spec 0054, AC-7). The request keeps both labels
// as they read when the rider sent it; the Greek one can be missing (a reason written before row 47),
// and so, in principle, can the English one, so each language falls back on the other.
export function removalLabelText(request: { label: string; labelEl?: string | null }, language: Language): string {
  return language === 'el' ? request.labelEl || request.label : request.label || request.labelEl || ''
}
