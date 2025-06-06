/**
 * Offline Queue Utilities
 * 
 * Handles offline submission queue and sync when online
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  queue: {
    key: string;
    value: {
      id: string;
      action: string;
      data: any;
      timestamp: number;
      retryCount: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
  };
}

const DB_NAME = 'ExpenseFlowOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'queue';

let dbPromise: Promise<IDBPDatabase<OfflineDB>>;

// Initialize IndexedDB for offline queue
const initOfflineDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

class OfflineQueue {
  private isProcessing = false;

  // Add item to offline queue
  async addToQueue(action: string, data: any): Promise<string> {
    try {
      const db = await initOfflineDB();
      const id = `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const queueItem = {
        id,
        action,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const,
      };

      await db.put(QUEUE_STORE, queueItem);
      
      // Try to process immediately if online
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }

      return id;
    } catch (error) {
      console.error('Error adding to offline queue:', error);
      throw error;
    }
  }

  // Process all pending items in queue
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    try {
      const db = await initOfflineDB();
      const pendingItems = await db.getAllFromIndex(QUEUE_STORE, 'status', 'pending');
      
      console.log(`Processing ${pendingItems.length} offline queue items`);

      for (const item of pendingItems) {
        try {
          // Mark as processing
          await db.put(QUEUE_STORE, { ...item, status: 'processing' });
          
          // Process the item based on action type
          await this.processItem(item);
          
          // Mark as completed
          await db.put(QUEUE_STORE, { ...item, status: 'completed' });
          
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          
          // Increment retry count
          const updatedItem = {
            ...item,
            retryCount: item.retryCount + 1,
            status: item.retryCount >= 3 ? 'failed' as const : 'pending' as const,
          };
          
          await db.put(QUEUE_STORE, updatedItem);
        }
      }

      // Clean up completed items older than 24 hours
      await this.cleanupCompletedItems();

    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual queue item
  private async processItem(item: any): Promise<void> {
    switch (item.action) {
      case 'submitExpense':
        await this.submitExpense(item.data);
        break;
      case 'updateExpense':
        await this.updateExpense(item.data);
        break;
      case 'deleteExpense':
        await this.deleteExpense(item.data);
        break;
      default:
        console.warn(`Unknown action type: ${item.action}`);
    }
  }

  // Submit expense when back online
  private async submitExpense(data: any): Promise<void> {
    const formData = new FormData();
    
    // Append form data
    Object.entries(data.data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });

    // Append files
    if (data.files && data.files.length > 0) {
      data.files.forEach((uploadedFile: any, index: number) => {
        formData.append(`files`, uploadedFile.file);
        formData.append(`fileData_${index}`, JSON.stringify({
          ocrData: uploadedFile.ocrData,
          validationResults: uploadedFile.validationResults
        }));
      });
    }

    const response = await fetch('/api/expenses', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to submit expense');
    }

    // Show success notification if possible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Expense submitted successfully', {
        body: 'Your offline expense has been submitted.',
        icon: '/icon-192x192.png',
      });
    }
  }

  // Update expense when back online
  private async updateExpense(data: any): Promise<void> {
    const response = await fetch(`/api/expenses/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.data),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to update expense');
    }
  }

  // Delete expense when back online
  private async deleteExpense(data: any): Promise<void> {
    const response = await fetch(`/api/expenses/${data.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to delete expense');
    }
  }

  // Get queue status
  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const db = await initOfflineDB();
      const allItems = await db.getAll(QUEUE_STORE);
      
      const status = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      allItems.forEach(item => {
        status[item.status]++;
      });

      return status;
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }

  // Get all queue items
  async getAllQueueItems(): Promise<any[]> {
    try {
      const db = await initOfflineDB();
      return await db.getAll(QUEUE_STORE);
    } catch (error) {
      console.error('Error getting queue items:', error);
      return [];
    }
  }

  // Retry failed items
  async retryFailedItems(): Promise<void> {
    try {
      const db = await initOfflineDB();
      const failedItems = await db.getAllFromIndex(QUEUE_STORE, 'status', 'failed');
      
      for (const item of failedItems) {
        await db.put(QUEUE_STORE, {
          ...item,
          status: 'pending',
          retryCount: 0,
        });
      }

      // Process the queue
      if (navigator.onLine) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Error retrying failed items:', error);
    }
  }

  // Clear completed items
  async clearCompletedItems(): Promise<void> {
    try {
      const db = await initOfflineDB();
      const completedItems = await db.getAllFromIndex(QUEUE_STORE, 'status', 'completed');
      
      for (const item of completedItems) {
        await db.delete(QUEUE_STORE, item.id);
      }
    } catch (error) {
      console.error('Error clearing completed items:', error);
    }
  }

  // Clean up old completed items
  private async cleanupCompletedItems(): Promise<void> {
    try {
      const db = await initOfflineDB();
      const completedItems = await db.getAllFromIndex(QUEUE_STORE, 'status', 'completed');
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      for (const item of completedItems) {
        if (item.timestamp < twentyFourHoursAgo) {
          await db.delete(QUEUE_STORE, item.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up completed items:', error);
    }
  }

  // Remove specific item from queue
  async removeFromQueue(itemId: string): Promise<void> {
    try {
      const db = await initOfflineDB();
      await db.delete(QUEUE_STORE, itemId);
    } catch (error) {
      console.error('Error removing item from queue:', error);
    }
  }
}

// Create singleton instance
export const offlineQueue = new OfflineQueue();

// Service Worker registration and sync
export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('Service Worker registered:', registration);

      // Listen for sync events
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        registration.addEventListener('sync', (event: any) => {
          if (event.tag === 'offline-sync') {
            offlineQueue.processQueue();
          }
        });
      }

      // Listen for online events to trigger sync
      window.addEventListener('online', () => {
        offlineQueue.processQueue();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<void> => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
  }
}; 