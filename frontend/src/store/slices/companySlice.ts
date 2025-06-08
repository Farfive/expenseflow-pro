import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CompanyState {
  id?: string;
  name?: string;
  settings?: {
    currency?: string;
    timezone?: string;
  };
}

const initialState: CompanyState = {};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setCompany: (state, action: PayloadAction<CompanyState>) => {
      return { ...state, ...action.payload };
    },
    clearCompany: () => {
      return {};
    },
    updateCompanySettings: (state, action: PayloadAction<Partial<CompanyState['settings']>>) => {
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      };
    },
  },
});

export const { setCompany, clearCompany, updateCompanySettings } = companySlice.actions;
export default companySlice.reducer; 