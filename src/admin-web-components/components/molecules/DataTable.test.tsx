import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'

interface TestItem {
  id: string
  name: string
}

const testColumns: ColumnDef<TestItem, any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
]

const testData: TestItem[] = [
  { id: 'item-1', name: 'First Item' },
  { id: 'item-2', name: 'Second Item' },
]

describe('DataTable molecule component', () => {
  it('pins Fix 8: clickable row uses hover:bg-muted/50 design token, with no gray class', () => {
    const handleRowClick = jest.fn()

    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={handleRowClick}
      />
    )

    const rows = screen.getAllByRole('row')
    // Row 0 is header row; Rows 1 and 2 are data rows
    const dataRow1 = rows[1] as HTMLElement
    const dataRow2 = rows[2] as HTMLElement

    // Must use design token hover:bg-muted/50 and cursor-pointer
    expect(dataRow1.className).toContain('cursor-pointer')
    expect(dataRow1.className).toContain('hover:bg-muted/50')
    expect(dataRow2.className).toContain('cursor-pointer')
    expect(dataRow2.className).toContain('hover:bg-muted/50')

    // Must not use raw gray class (e.g. hover:bg-gray-50/50)
    expect(dataRow1.className).not.toMatch(/gray/)
    expect(dataRow2.className).not.toMatch(/gray/)

    // Clicking row calls onRowClick callback with row data
    fireEvent.click(dataRow1)
    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick).toHaveBeenCalledWith(testData[0])
  })

  it('renders non-clickable rows without hover:bg-muted/50 or cursor-pointer when onRowClick is omitted', () => {
    render(
      <DataTable
        columns={testColumns}
        data={testData}
      />
    )

    const rows = screen.getAllByRole('row')
    const dataRow1 = rows[1] as HTMLElement

    expect(dataRow1.className).not.toContain('cursor-pointer')
    expect(dataRow1.className).not.toContain('hover:bg-muted/50')
    expect(dataRow1.className).not.toMatch(/gray/)
  })

  it('renders "No results." empty state when data array is empty', () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
      />
    )

    expect(screen.getByText('No results.')).toBeInTheDocument()
  })
})
