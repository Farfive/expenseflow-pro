import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExpenseState {
  expenses: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  expenses: [],
  loading: false,
  error: null,
};

const expenseSlice = createSlice({
  name: 'expense',
  initialState,
  reducers: {
    setExpenses: (state, action: PayloadAction<any[]>) => {
      state.expenses = action.payload;
    },
    addExpense: (state, action: PayloadAction<any>) => {
      state.expenses.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setExpenses, addExpense, setLoading, setError } = expenseSlice.actions;
export default expenseSlice.reducer; 