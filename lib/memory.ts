export const MemoryBank = {
  save: (data: any) => {
    if (typeof window !== 'undefined') localStorage.setItem('kyle_v4_history', JSON.stringify(data));
  },
  load: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kyle_v4_history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  },
  clear: () => localStorage.removeItem('kyle_v4_history')
};
