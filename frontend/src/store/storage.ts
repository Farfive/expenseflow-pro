import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

// Create a noop storage for server-side rendering
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Safe storage that works in both server and client environments
const storage = (() => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return createWebStorage('local');
    }
  } catch (error) {
    // localStorage is not available, fall back to noop
    console.warn('localStorage is not available, using noop storage');
  }
  
  // Fallback to noop storage for SSR or when localStorage is not available
  return createNoopStorage();
})();

export default storage; 