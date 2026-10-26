import { AppState } from '@/redux/store'
import { createSlice } from '@reduxjs/toolkit'
import { ReactNode } from 'react'

type SheetProps = {
  id: string
  isLoading?: boolean
  children: ReactNode
}

export const sheetsSlice = createSlice({
  name: 'sheets',
  initialState: { sheets: [] as SheetProps[] },
  reducers: {
    openSheet: (state, action) => {
      const sheetIndex = state.sheets.findIndex((m) => m.id === action.payload.id)
      if (sheetIndex === -1) {
        state.sheets.push({ variant: 'custom', ...action.payload })
      }
    },
    closeSheet: (state, action) => {
      state.sheets = state.sheets.filter((sheet) => sheet.id !== action.payload)
    },
    // Signing out closes every open sheet, so none of one session's data is left on screen.
    closeAllSheets: (state) => {
      state.sheets = []
    },
  },
})

export const { openSheet, closeSheet, closeAllSheets } = sheetsSlice.actions
export const selectSheets = (state: AppState) => state.sheets.sheets
export default sheetsSlice.reducer
