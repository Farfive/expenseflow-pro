import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DocumentState {
  documents: any[];
  loading: boolean;
  error: string | null;
}

const initialState: DocumentState = {
  documents: [],
  loading: false,
  error: null,
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setDocuments: (state, action: PayloadAction<any[]>) => {
      state.documents = action.payload;
    },
    addDocument: (state, action: PayloadAction<any>) => {
      state.documents.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setDocuments, addDocument, setLoading, setError } = documentSlice.actions;
export default documentSlice.reducer; 