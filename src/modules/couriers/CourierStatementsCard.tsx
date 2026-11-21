import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from '@/admin-web-components'
import type { StatementFormat, StatementLang } from '@/backend-admin-sdk'
import { downloadStatement, refreshCourierStatements, useGetCourierStatementsQuery } from '@/api/statementApi'
import useAppSelector from '@/hooks/useAppSelector'
import { useDispatch } from 'react-redux'
import { formatDate } from '@/ui-shared-utils'

// Spec 0050 (AC-9, cross check 14): a rider's monthly statements, the same file the rider downloads. Every
// download is recorded on the server and shown to the rider in "Changes by the co-op"; the list below is the
// record. No count or comparison of riders anywhere (value 5).

// Saves a Blob as a file in the browser.
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function CourierStatementsCard({ courierId }: { courierId: string }) {
  const query = useGetCourierStatementsQuery({ id: courierId })
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const dispatch = useDispatch()
  const [month, setMonth] = useState('')
  const [lang, setLang] = useState<StatementLang>('el')
  const [busy, setBusy] = useState<StatementFormat | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const months = query.data?.months ?? []
  const chosen = month || months[0] || ''
  const downloads = query.data?.downloads ?? []

  const download = async (format: StatementFormat) => {
    if (!chosen || busy) return
    setBusy(format)
    setProblem(null)
    try {
      const blob = await downloadStatement(accessToken || '', { id: courierId, month: chosen, format, lang })
      saveBlob(blob, `statement-${chosen}.${format}`)
    } catch {
      setProblem('The statement could not be downloaded. Please try again.')
    } finally {
      setBusy(null)
      dispatch(refreshCourierStatements())
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Statements</CardTitle>
        <p className="text-sm text-muted-foreground">
          The rider&apos;s own monthly record, as they download it: every job with its pay parts, the totals and the
          hours. Each download is recorded and the rider sees it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {query.isError ? (
          <p className="text-destructive">Could not load the statements.</p>
        ) : months.length === 0 && !query.isLoading ? (
          <p className="text-muted-foreground">No complete month yet.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="statement-month">Month</Label>
              <select
                id="statement-month"
                className="block h-9 rounded-md border border-input bg-background px-2"
                value={chosen}
                onChange={(e) => setMonth(e.target.value)}
              >
                {months.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="statement-lang">Language</Label>
              <select
                id="statement-lang"
                className="block h-9 rounded-md border border-input bg-background px-2"
                value={lang}
                onChange={(e) => setLang(e.target.value === 'en' ? 'en' : 'el')}
              >
                <option value="el">Greek</option>
                <option value="en">English</option>
              </select>
            </div>
            <Button type="button" variant="outline" disabled={!chosen || busy !== null} onClick={() => void download('pdf')}>
              {busy === 'pdf' ? 'Downloading…' : 'PDF'}
            </Button>
            <Button type="button" variant="outline" disabled={!chosen || busy !== null} onClick={() => void download('csv')}>
              {busy === 'csv' ? 'Downloading…' : 'CSV'}
            </Button>
          </div>
        )}
        {problem ? (
          <p role="alert" className="font-medium text-destructive">
            {problem}
          </p>
        ) : null}
        <div>
          <h3 className="mb-2 font-medium">Downloaded by admins</h3>
          {downloads.length === 0 ? (
            <p className="text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-1">
              {downloads.map((row) => (
                <li key={row.id}>
                  <span className="text-muted-foreground">{formatDate(row.createdAt)}</span> · {row.month}{' '}
                  {row.format.toUpperCase()}
                  {row.adminEmail ? <span className="text-muted-foreground"> by {row.adminEmail}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
