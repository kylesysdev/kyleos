export const MemoryBank = {
  save: (data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kyle_history', JSON.stringify(data));
    }
  },
  load: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kyle_history');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  },
  clear: () => localStorage.removeItem('kyle_history')
};
