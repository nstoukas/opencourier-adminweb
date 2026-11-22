import React, { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin-web-components'
import { useGetSettingChangesQuery } from '@/api/reviewRequestApi'
import { athensDayTime } from '@/utils/athensMonth'
import { SETTINGS } from '../settingsDiff'
import { SettingsSection } from './SettingsCards'

export const CHANGE_HISTORY_PAGE_SIZE = 20

// A stored value, short enough for a table cell. A removal reason or a shift slot is an object, shown
// as "name: value" pairs; anything else is a number, a word, a switch or a list. "none" stands for a
// create or a removal. The stored names and values are data, shown as stored; only none, on and off are
// the page's own words, so it takes `t` (from useTranslation).
export function describeSettingValue(t: TFunction, value: unknown): string {
  if (value === null || value === undefined || value === '') return t('settings.changeHistory.none')
  if (typeof value === 'boolean') return t(value ? 'settings.changeHistory.on' : 'settings.changeHistory.off')
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map((part) => describeSettingValue(t, part)).join(', ')
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return t('settings.changeHistory.none')
    return entries.map(([name, part]) => `${name}: ${describeSettingValue(t, part)}`).join(', ')
  }
  return String(value)
}

// The backend names only the settings riders see, in English; for the others this page's own labels
// are used. A reader in Greek gets this page's Greek name for any setting it knows (spec 0054), and an
// English reader keeps the backend's name as before.
export function settingLabel(
  t: TFunction,
  language: string,
  change: { key: string; label: string },
): string {
  const known = SETTINGS.find((setting) => setting.key === change.key)
  if (change.label !== change.key && (language === 'en' || !known)) return change.label
  return known ? t(known.labelKey) : change.key
}

// Spec 0038 (AC-13): every change to the co-op's settings, newest first, with the login of the
// person who saved it. Riders see the changes that affect their work, credited to "a representative";
// this list is the admins' full record. It starts on the day spec 0038 shipped.
export function ChangeHistoryCard() {
  // useTranslation gives t (a key to words) and i18n, whose `language` is the reader's.
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isError, isFetching } = useGetSettingChangesQuery({ page, perPage: CHANGE_HISTORY_PAGE_SIZE })
  const rows = data?.data ?? []
  const pagination = data?.pagination

  // athensDayTime writes digits only ("19/11/2026 12:00"), the same in both languages.
  const description = data?.recordedSince
    ? t('settings.changeHistory.recordedSince', { date: athensDayTime(data.recordedSince) })
    : t('settings.changeHistory.noneYet')

  return (
    <SettingsSection id="change-history" title={t('settings.sections.changeHistory')} description={description}>
      {isError ? (
        <p className="text-sm text-destructive">{t('settings.changeHistory.loadFailed')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isFetching ? t('common.loading') : t('settings.changeHistory.empty')}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.changeHistory.when')}</TableHead>
                <TableHead>{t('settings.changeHistory.setting')}</TableHead>
                <TableHead>{t('settings.changeHistory.before')}</TableHead>
                <TableHead>{t('settings.changeHistory.after')}</TableHead>
                <TableHead>{t('settings.changeHistory.savedBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="whitespace-nowrap">{athensDayTime(change.at)}</TableCell>
                  <TableCell>{settingLabel(t, i18n.language, change)}</TableCell>
                  <TableCell className="max-w-xs break-words">{describeSettingValue(t, change.oldValue)}</TableCell>
                  <TableCell className="max-w-xs break-words">{describeSettingValue(t, change.newValue)}</TableCell>
                  <TableCell>{change.changedBy ?? t('settings.changeHistory.removedAdmin')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!pagination.prevPage || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t('settings.changeHistory.newer')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('settings.changeHistory.page', { page: pagination.currentPage, total: pagination.totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={!pagination.nextPage || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                {t('settings.changeHistory.older')}
              </Button>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  )
}
