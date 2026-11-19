import React, { useState } from 'react'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin-web-components'
import { useGetSettingChangesQuery } from '@/api/reviewRequestApi'
import { athensDayTime } from '@/utils/athensMonth'
import { SETTINGS } from '../settingsDiff'
import { SettingsSection } from './SettingsCards'

export const CHANGE_HISTORY_PAGE_SIZE = 20

// A stored value, short enough for a table cell. A removal reason or a shift slot is an object, shown
// as "name: value" pairs; anything else is a number, a word, a switch or a list. "none" stands for a
// create or a removal.
export function describeSettingValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'none'
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(describeSettingValue).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, part]) => `${name}: ${describeSettingValue(part)}`)
      .join(', ')
  }
  return String(value)
}

// The backend names only the settings riders see; for the others this page's own labels are used.
export function settingLabel(change: { key: string; label: string }): string {
  if (change.label !== change.key) return change.label
  return SETTINGS.find((setting) => setting.key === change.key)?.label ?? change.key
}

// Spec 0038 (AC-13): every change to the co-op's settings, newest first, with the login of the
// person who saved it. Riders see the changes that affect their work, credited to "a representative";
// this list is the admins' full record. It starts on the day spec 0038 shipped.
export function ChangeHistoryCard() {
  const [page, setPage] = useState(1)
  const { data, isError, isFetching } = useGetSettingChangesQuery({ page, perPage: CHANGE_HISTORY_PAGE_SIZE })
  const rows = data?.data ?? []
  const pagination = data?.pagination

  const description = data?.recordedSince
    ? `Recorded since ${athensDayTime(data.recordedSince)} (Athens time). Riders see the changes that affect their work, without names.`
    : 'Every saved change will be listed here. Riders see the changes that affect their work, without names.'

  return (
    <SettingsSection id="change-history" title="Change history" description={description}>
      {isError ? (
        <p className="text-sm text-destructive">The change history could not be loaded. Try again in a moment.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{isFetching ? 'Loading…' : 'No change recorded yet.'}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Setting</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Saved by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="whitespace-nowrap">{athensDayTime(change.at)}</TableCell>
                  <TableCell>{settingLabel(change)}</TableCell>
                  <TableCell className="max-w-xs break-words">{describeSettingValue(change.oldValue)}</TableCell>
                  <TableCell className="max-w-xs break-words">{describeSettingValue(change.newValue)}</TableCell>
                  <TableCell>{change.changedBy ?? 'a removed admin'}</TableCell>
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
                Newer
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={!pagination.nextPage || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Older
              </Button>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  )
}
