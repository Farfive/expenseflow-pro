import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from './storage';

// Import reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import companyReducer from './slices/companySlice';
import expenseReducer from './slices/expenseSlice';
import documentReducer from './slices/documentSlice';
import categoryReducer from './slices/categorySlice';
import notificationReducer from './slices/notificationSlice';
import themeReducer from './slices/themeSlice';
import uiReducer from './slices/uiSlice';

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  company: companyReducer,
  expense: expenseReducer,
  document: documentReducer,
  category: categoryReducer,
  notification: notificationReducer,
  theme: themeReducer,
  ui: uiReducer,
});

// Persist configuration
const persistConfig = {
  key: 'expenseflow-root',
  version: 1,
  storage,
  whitelist: ['auth', 'theme', 'user'], // Only persist these slices
  blacklist: ['ui'], // Don't persist UI state
};

// Create persisted reducer (temporarily disabled for debugging)
// const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: rootReducer, // Use non-persisted reducer temporarily
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['register', 'rehydrate'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks types
export default store; 