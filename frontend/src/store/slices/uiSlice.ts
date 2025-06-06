import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  loading: boolean;
  notifications: boolean;
  modalOpen: string | null;
  activeTab: string;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  loading: false,
  notifications: false,
  modalOpen: null,
  activeTab: 'dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    toggleNotifications: (state) => {
      state.notifications = !state.notifications;
    },
    setModalOpen: (state, action: PayloadAction<string | null>) => {
      state.modalOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setLoading,
  toggleNotifications,
  setModalOpen,
  setActiveTab,
} = uiSlice.actions;

export default uiSlice.reducer; 