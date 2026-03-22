import { create } from 'zustand';
import { Theme, Language, ViewType, Toast } from '@/types';

interface UIState {
  theme: Theme;
  language: Language;
  currentView: ViewType;
  toasts: Toast[];
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrentView: (view: ViewType) => void;
  switchView: (view: ViewType) => void;
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UIState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'cyber',
  language: (localStorage.getItem('language') as Language) || 'de',
  currentView: 'timer',
  toasts: [],
  sidebarOpen: true,

  toggleTheme: () => {
    set((state) => {
      const newTheme: Theme = state.theme === 'cyber' ? 'light' : 'cyber';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },

  setLanguage: (language: Language) => {
    localStorage.setItem('language', language);
    set({ language });
  },

  setCurrentView: (view: ViewType) => {
    set({ currentView: view });
  },

  switchView: (view: ViewType) => {
    set({ currentView: view });
  },

  showToast: (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 3000
  ) => {
    const id = `toast_${Date.now()}`;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          message,
          type,
          duration,
        },
      ],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  dismissToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },
}));
