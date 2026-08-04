import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TablePagination } from './Table'

describe('TablePagination component & DOM nesting', () => {
  let consoleSpy: jest.SpyInstance

  const defaultProps = {
    canPreviousPage: true,
    canNextPage: true,
    previousPage: jest.fn(),
    nextPage: jest.fn(),
    pageIndex: 0,
    pageCount: 3,
    setPageIndex: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Spy on console.error to capture DOM nesting validation warnings from React
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  // Structural assertions (querySelectorAll) below cover the <li>-in-<li> defect.
  // Note: console.error spying for validateDOMNesting was removed because React de-duplicates
  // validateDOMNesting warnings process-wide, making console-based assertions order-dependent false guards.
  it('5. renders no <li> nested inside another <li> element', () => {
    // Render pagination table control
    const { container } = render(<TablePagination {...defaultProps} />)

    // Assert there are zero nested li elements (li li selector)
    const nestedListItems = container.querySelectorAll('li li')
    expect(nestedListItems).toHaveLength(0)
  })

  it('6. has exactly one top-level <li> per control (Previous + 3 pages + Next = 5 list items)', () => {
    // For pageCount=3, total list items must equal 5 (Previous button, 3 page buttons, Next button)
    const { container } = render(<TablePagination {...defaultProps} pageCount={3} />)

    const listItems = container.querySelectorAll('li')
    expect(listItems).toHaveLength(5)
  })

  it('8. handles paging interactions correctly and respects disabled states', () => {
    const setPageIndexMock = jest.fn()
    const nextPageMock = jest.fn()
    const previousPageMock = jest.fn()

    // Render with Previous disabled and Next enabled
    render(
      <TablePagination
        {...defaultProps}
        canPreviousPage={false}
        canNextPage={true}
        setPageIndex={setPageIndexMock}
        nextPage={nextPageMock}
        previousPage={previousPageMock}
      />
    )

    // Click page number button '2' -> calls setPageIndex with 0-based index 1
    const page2Button = screen.getByRole('button', { name: '2' })
    fireEvent.click(page2Button)
    expect(setPageIndexMock).toHaveBeenCalledWith(1)

    // Click Next button -> calls nextPage callback
    const nextButton = screen.getByLabelText('Go to next page')
    expect(nextButton).not.toBeDisabled()
    fireEvent.click(nextButton)
    expect(nextPageMock).toHaveBeenCalledTimes(1)

    // Attempt to click disabled Previous button -> callback must NOT be invoked (failure/edge case handling)
    const prevButton = screen.getByLabelText('Go to previous page')
    expect(prevButton).toBeDisabled()
    fireEvent.click(prevButton)
    expect(previousPageMock).not.toHaveBeenCalled()
  })

  it('9. marks the active page with aria-current="page"', () => {
    // Render with pageIndex=0 (page 1 active)
    render(<TablePagination {...defaultProps} pageIndex={0} />)

    const page1Button = screen.getByRole('button', { name: '1' })
    const page2Button = screen.getByRole('button', { name: '2' })

    // Active page button 1 has aria-current="page", inactive page button 2 does not
    expect(page1Button).toHaveAttribute('aria-current', 'page')
    expect(page2Button).not.toHaveAttribute('aria-current')
  })

  it('10. preserves accessible labels for navigation buttons', () => {
    // Render component and verify accessibility aria-labels
    render(<TablePagination {...defaultProps} />)

    const prevButton = screen.getByLabelText('Go to previous page')
    const nextButton = screen.getByLabelText('Go to next page')

    expect(prevButton.tagName.toLowerCase()).toBe('button')
    expect(nextButton.tagName.toLowerCase()).toBe('button')
  })
})
