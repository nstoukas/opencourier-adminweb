import sheetsReducer, {
  openSheet,
  closeSheet,
  closeAllSheets,
  selectSheets,
} from './sheetManagerSlice'
import { AppState } from '@/redux/store'

describe('sheetManagerSlice (row 86 review fix edfe808)', () => {
  it('has an empty sheets array in initial state', () => {
    // Initial state before any sheet is opened
    const state = sheetsReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({ sheets: [] })
  })

  it('openSheet adds a sheet to the sheets array with variant="custom"', () => {
    const initialState = { sheets: [] }
    const sheetPayload = { id: 'delivery-sheet-1', children: 'Delivery facts' }

    const state = sheetsReducer(initialState, openSheet(sheetPayload))
    expect(state.sheets).toHaveLength(1)
    expect(state.sheets[0]).toEqual({
      id: 'delivery-sheet-1',
      variant: 'custom',
      children: 'Delivery facts',
    })
  })

  it('openSheet avoids duplicate sheets when a sheet with the same id is already open', () => {
    const initialState = {
      sheets: [{ id: 'sheet-1', variant: 'custom', children: 'Existing' }],
    }
    const duplicatePayload = { id: 'sheet-1', children: 'New' }

    const state = sheetsReducer(initialState, openSheet(duplicatePayload))
    expect(state.sheets).toHaveLength(1)
    expect(state.sheets[0]?.children).toBe('Existing')
  })

  it('closeSheet removes only the specified sheet by id', () => {
    const initialState = {
      sheets: [
        { id: 'sheet-1', variant: 'custom', children: 'First' },
        { id: 'sheet-2', variant: 'custom', children: 'Second' },
      ],
    }

    const state = sheetsReducer(initialState, closeSheet('sheet-1'))
    expect(state.sheets).toHaveLength(1)
    expect(state.sheets[0]?.id).toBe('sheet-2')
  })

  it('closeAllSheets empties all open sheets so no previous session data remains', () => {
    // State simulating multiple open sheets from an active admin session
    const activeSessionState = {
      sheets: [
        { id: 'delivery-sheet-1', variant: 'custom', children: 'Delivery #1' },
        { id: 'courier-sheet-2', variant: 'custom', children: 'Courier #2' },
      ],
    }

    const nextState = sheetsReducer(activeSessionState, closeAllSheets())
    expect(nextState.sheets).toEqual([])
  })

  it('selectSheets extracts the sheets array from AppState', () => {
    const mockAppState = {
      sheets: {
        sheets: [{ id: 'sheet-1', variant: 'custom', children: 'Content' }],
      },
    } as unknown as AppState

    expect(selectSheets(mockAppState)).toEqual([
      { id: 'sheet-1', variant: 'custom', children: 'Content' },
    ])
  })
})
