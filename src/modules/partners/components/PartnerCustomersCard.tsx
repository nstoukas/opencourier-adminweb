import React, { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
// date-fns's Greek words for "3 days ago"; English uses date-fns's own default, as before.
import { el } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/useFormat'
import { MagnifyingGlass, PencilSimple, Trash } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/admin-web-components'
import type { SavedCustomerAdminDto } from '@/backend-admin-sdk'
import { useLazyGetPartnerCustomersQuery } from '@/api/savedCustomersApi'
import { EditSavedCustomerDialog } from './EditSavedCustomerDialog'
import { DeleteSavedCustomerDialog } from './DeleteSavedCustomerDialog'

// Rows per page, the search's pause and its minimum (spec 0005, adminweb design).
const CUSTOMERS_PAGE_SIZE = 20
const SEARCH_PAUSE_MS = 300
const MIN_SEARCH_LENGTH = 2

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: SavedCustomerAdminDto[]; total: number; page: number }

interface PartnerCustomersCardProps {
  partnerId: string
  restaurantName: string
}

/**
 * A restaurant's saved customers on its admin page (spec 0005, AC-6): search, edit and delete, so the
 * co-op can correct a customer or honour a request to be deleted. No add: restaurants save their own.
 */
export const PartnerCustomersCard: React.FC<PartnerCustomersCardProps> = ({ partnerId, restaurantName }) => {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // f.language is the reader's language ('el' or 'en').
  const f = useFormat()
  const [fetchPage] = useLazyGetPartnerCustomersQuery()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [editing, setEditing] = useState<SavedCustomerAdminDto | null>(null)
  const [deleting, setDeleting] = useState<SavedCustomerAdminDto | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  // Each load gets a number; an answer to an older one is ignored, so the latest search wins.
  const loadId = useRef(0)
  const tableRef = useRef<HTMLDivElement>(null)
  // The row button that opened the dialog: focus goes back to it when the dialog closes.
  const openedFrom = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    const timer = setTimeout(() => setSearch(trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : ''), SEARCH_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const id = ++loadId.current
    setList({ status: 'loading' })
    fetchPage({ partnerId, q: search || undefined, page: 1, perPage: CUSTOMERS_PAGE_SIZE })
      .unwrap()
      .then((result) => {
        if (id === loadId.current) setList({ status: 'ready', items: result.items, total: result.total, page: 1 })
      })
      .catch(() => {
        if (id === loadId.current) setList({ status: 'error' })
      })
  }, [fetchPage, partnerId, search, reloadCount])

  const showMore = useCallback(async () => {
    if (list.status !== 'ready') return
    // A first page load (a new search, Try again) after this started makes its answer stale.
    const id = loadId.current
    setIsLoadingMore(true)
    try {
      const next = await fetchPage({
        partnerId,
        q: search || undefined,
        page: list.page + 1,
        perPage: CUSTOMERS_PAGE_SIZE,
      }).unwrap()
      if (id !== loadId.current) return
      setList((current) => {
        if (current.status !== 'ready') return current
        // A customer used between two pages moves up the list; never show it twice.
        const shown = new Set(current.items.map((item) => item.id))
        const added = next.items.filter((item) => !shown.has(item.id))
        return { status: 'ready', items: [...current.items, ...added], total: next.total, page: current.page + 1 }
      })
    } catch {
      toast({
        title: t('partners.customers.loadMoreFailed'),
        description: t('partners.customers.tryInAMoment'),
        variant: 'destructive',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [fetchPage, list, partnerId, search, toast, t])

  const removeRow = (id: string) => {
    setList((current) =>
      current.status === 'ready'
        ? { ...current, items: current.items.filter((item) => item.id !== id), total: Math.max(0, current.total - 1) }
        : current,
    )
    // The button that opened the dialog went with the row: moveFocusAfterClose sends focus to the table.
  }

  // Radix's close hook, run as the dialog lets go of focus. Radix's own return of focus does not happen
  // here (checked in Chrome: focus fell to the page after every close), so preventDefault switches it off
  // and the card does it: back to the row's button, or to the table when that row went away.
  const moveFocusAfterClose = (event: Event) => {
    event.preventDefault()
    const button = openedFrom.current
    openedFrom.current = null
    if (button?.isConnected) button.focus()
    else tableRef.current?.focus()
  }

  const total = list.status === 'ready' ? list.total : null

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">
          {total !== null ? t('partners.customers.titleWithCount', { total }) : t('partners.customers.title')}
        </CardTitle>
        <div className="relative max-w-sm">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('partners.customers.searchPlaceholder')}
            aria-label={t('partners.customers.searchLabel', { name: restaurantName })}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* tabIndex -1: focus can be moved here after a delete, without adding a tab stop. */}
        <div ref={tableRef} tabIndex={-1} className="outline-none" aria-busy={list.status === 'loading'}>
          {list.status === 'loading' ? (
            <div className="space-y-2" aria-label={t('partners.customers.loading')}>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-10 w-full" />
              ))}
            </div>
          ) : list.status === 'error' ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{t('partners.customers.loadFailed')}</span>
                <Button variant="outline" size="sm" onClick={() => setReloadCount((count) => count + 1)}>
                  {t('common.tryAgain')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : list.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {search ? t('partners.customers.noMatch') : t('partners.customers.none')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('partners.customers.columns.name')}</TableHead>
                  <TableHead>{t('partners.customers.columns.phone')}</TableHead>
                  <TableHead>{t('partners.customers.columns.address')}</TableHead>
                  <TableHead>{t('partners.customers.columns.lastUsed')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('partners.customers.columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{customer.phone}</TableCell>
                    <TableCell className="max-w-[16rem] truncate" title={customer.formattedAddress || customer.addressLine1}>
                      {customer.formattedAddress || customer.addressLine1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {/* <time> gives the exact moment to assistive tech; the text is the friendly form. */}
                      <time dateTime={customer.lastUsedAt}>
                        {formatDistanceToNow(new Date(customer.lastUsedAt), {
                          addSuffix: true,
                          locale: f.language === 'el' ? el : undefined,
                        })}
                      </time>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          openedFrom.current = event.currentTarget
                          setEditing(customer)
                        }}
                        aria-label={t('partners.customers.editLabel', { name: customer.name })}
                      >
                        <PencilSimple className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          openedFrom.current = event.currentTarget
                          setDeleting(customer)
                        }}
                        aria-label={t('partners.customers.deleteLabel', { name: customer.name })}
                      >
                        <Trash className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {list.status === 'ready' && list.items.length > 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            {list.items.length < list.total ? (
              <Button variant="outline" size="sm" onClick={showMore} disabled={isLoadingMore}>
                {isLoadingMore ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {t('partners.customers.showMore')}
              </Button>
            ) : null}
            {/* aria-live: a screen reader hears the new count after Show more, without moving focus. */}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('partners.customers.shownOfTotal', { shown: list.items.length, total: list.total })}
            </p>
          </div>
        ) : null}
      </CardContent>

      {editing ? (
        <EditSavedCustomerDialog
          partnerId={partnerId}
          restaurantName={restaurantName}
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            // An edit is not a use, so the order stays; replace the row where it is.
            setList((current) =>
              current.status === 'ready'
                ? { ...current, items: current.items.map((item) => (item.id === saved.id ? saved : item)) }
                : current,
            )
            setEditing(null)
            toast({ title: t('partners.customers.saved'), description: saved.name })
          }}
          onCloseAutoFocus={moveFocusAfterClose}
          onGone={(id) => {
            setEditing(null)
            removeRow(id)
            toast({ title: t('partners.customers.alreadyDeleted') })
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteSavedCustomerDialog
          partnerId={partnerId}
          customer={deleting}
          onClose={() => setDeleting(null)}
          onCloseAutoFocus={moveFocusAfterClose}
          onDeleted={(id) => {
            setDeleting(null)
            removeRow(id)
            toast({ title: t('partners.customers.deleted') })
          }}
        />
      ) : null}
    </Card>
  )
}
