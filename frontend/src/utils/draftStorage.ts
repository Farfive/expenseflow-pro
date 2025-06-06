/**
 * Draft Storage Utilities
 * 
 * Handles saving and loading expense drafts using localStorage and IndexedDB
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ExpenseDB extends DBSchema {
  drafts: {
    key: string;
    value: {
      id: string;
      data: any;
      files?: any[];
      timestamp: number;
    };
  };
}

const DB_NAME = 'ExpenseFlowDB';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const CURRENT_DRAFT_KEY = 'current_expense_draft';

let dbPromise: Promise<IDBPDatabase<ExpenseDB>>;

// Initialize IndexedDB
const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DRAFT_STORE)) {
          db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Save expense draft to localStorage (for simple data)
export const saveExpenseDraft = async (draftData: any): Promise<void> => {
  try {
    // Save simple data to localStorage
    const simpleDraft = {
      ...draftData,
      uploadedFiles: undefined, // Don't save files to localStorage
      timestamp: Date.now(),
    };
    
    localStorage.setItem(CURRENT_DRAFT_KEY, JSON.stringify(simpleDraft));

    // Save complete data including files to IndexedDB
    if (draftData.uploadedFiles && draftData.uploadedFiles.length > 0) {
      await saveToIndexedDB(draftData);
    }
  } catch (error) {
    console.error('Error saving draft:', error);
  }
};

// Load expense draft from localStorage
export const loadExpenseDraft = (): any | null => {
  try {
    const draft = localStorage.getItem(CURRENT_DRAFT_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      // Check if draft is not too old (7 days)
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed;
      } else {
        clearExpenseDraft();
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};

// Clear expense draft
export const clearExpenseDraft = (): void => {
  try {
    localStorage.removeItem(CURRENT_DRAFT_KEY);
    clearFromIndexedDB();
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
};

// Save to IndexedDB (for files and complete data)
const saveToIndexedDB = async (draftData: any): Promise<void> => {
  try {
    const db = await initDB();
    
    // Convert files to base64 for storage
    const filesData = await Promise.all(
      (draftData.uploadedFiles || []).map(async (file: any) => ({
        id: file.id,
        name: file.file.name,
        type: file.file.type,
        size: file.file.size,
        data: await fileToBase64(file.file),
        preview: file.preview,
        ocrData: file.ocrData,
        validationResults: file.validationResults,
        processingStatus: file.processingStatus,
      }))
    );

    await db.put(DRAFT_STORE, {
      id: CURRENT_DRAFT_KEY,
      data: draftData,
      files: filesData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
};

// Load from IndexedDB
export const loadFromIndexedDB = async (): Promise<any | null> => {
  try {
    const db = await initDB();
    const draft = await db.get(DRAFT_STORE, CURRENT_DRAFT_KEY);
    
    if (draft && draft.files) {
      // Convert base64 back to files
      const uploadedFiles = await Promise.all(
        draft.files.map(async (fileData: any) => ({
          id: fileData.id,
          file: await base64ToFile(fileData.data, fileData.name, fileData.type),
          preview: fileData.preview,
          ocrData: fileData.ocrData,
          validationResults: fileData.validationResults,
          processingStatus: fileData.processingStatus,
        }))
      );

      return {
        ...draft.data,
        uploadedFiles,
      };
    }
    
    return draft?.data || null;
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return null;
  }
};

// Clear from IndexedDB
const clearFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(DRAFT_STORE, CURRENT_DRAFT_KEY);
  } catch (error) {
    console.error('Error clearing from IndexedDB:', error);
  }
};

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Convert base64 to file
const base64ToFile = async (base64: string, name: string, type: string): Promise<File> => {
  const response = await fetch(base64);
  const blob = await response.blob();
  return new File([blob], name, { type });
};

// Get all saved drafts
export const getAllDrafts = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    const drafts = await db.getAll(DRAFT_STORE);
    return drafts.map(draft => ({
      id: draft.id,
      timestamp: draft.timestamp,
      title: draft.data.title || 'Untitled',
      amount: draft.data.amount || 0,
      currency: draft.data.currency || 'PLN',
    }));
  } catch (error) {
    console.error('Error getting all drafts:', error);
    return [];
  }
};

// Load specific draft
export const loadDraft = async (draftId: string): Promise<any | null> => {
  try {
    const db = await initDB();
    const draft = await db.get(DRAFT_STORE, draftId);
    
    if (draft && draft.files) {
      const uploadedFiles = await Promise.all(
        draft.files.map(async (fileData: any) => ({
          id: fileData.id,
          file: await base64ToFile(fileData.data, fileData.name, fileData.type),
          preview: fileData.preview,
          ocrData: fileData.ocrData,
          validationResults: fileData.validationResults,
          processingStatus: fileData.processingStatus,
        }))
      );

      return {
        ...draft.data,
        uploadedFiles,
      };
    }
    
    return draft?.data || null;
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};

// Delete specific draft
export const deleteDraft = async (draftId: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(DRAFT_STORE, draftId);
  } catch (error) {
    console.error('Error deleting draft:', error);
  }
}; 