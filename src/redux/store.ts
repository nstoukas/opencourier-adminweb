import { configureStore, ThunkAction, Action, combineReducers } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist'
import { api } from '@/api'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { sheetsSlice } from '@/modules/shared/slices/sheetManagerSlice'
import { setupListeners } from '@reduxjs/toolkit/query'
import { storage } from '../ui-shared-utils'

const rootReducer = combineReducers({
  [authSlice.name]: authSlice.reducer,
  [api.reducerPath]: api.reducer,
  [sheetsSlice.name]: sheetsSlice.reducer,
})

// Options for redux-toolkit's dev-only state checks. Exported so they can be unit-tested.
// The RTK Query cache under `api` holds Date objects (the admin SDK parses every timestamp
// into one), and Dates are not "plain" values — so both checks are told to skip that subtree.
// Safe because the api cache is never persisted: persistConfig.whitelist is ['auth'] below.
export const serializableCheckOptions = {
  // redux-persist's own actions carry non-plain internals — unchanged from before.
  ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
  // 'meta.arg' and 'meta.baseQueryMeta' are RTK's own defaults; listing them here is required
  // because supplying this option replaces the defaults rather than adding to them.
  // 'payload' covers the fulfilled RTK Query actions, whose payload is the parsed DTO.
  ignoredActionPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload'],
  // Exact-match path: skips the whole api.* subtree in one entry.
  ignoredPaths: [api.reducerPath],
}

export const immutableCheckOptions = {
  ignoredPaths: [api.reducerPath],
}

export const makeStore = () => {
  const isServer = typeof window === 'undefined'
  if (isServer) {
    const store = configureStore({
      reducer: rootReducer,
      devTools: true,
    })
    return {
      ...store,
      __persistor: persistStore(store),
    }
  }
  // we need it only on client side
  const persistConfig = {
    key: 'opencourier',
    whitelist: ['auth'], // make sure it does not clash with server keys
    storage,
  }
  const persistedReducer = persistReducer(persistConfig, rootReducer)
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: serializableCheckOptions,
        immutableCheck: immutableCheckOptions,
      }).concat(api.middleware) as any,
    devTools: process.env.NODE_ENV !== 'production',
  })
  setupListeners(store.dispatch)
  return {
    ...store,
    __persistor: persistStore(store),
  }
}

export type AppStore = ReturnType<typeof makeStore>
export type AppState = ReturnType<AppStore['getState']>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>

export const wrapper = createWrapper<AppStore>(makeStore)
