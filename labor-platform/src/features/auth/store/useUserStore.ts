import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, ApiError } from '@/lib/api';

interface User {
  id: string;
  studentId: string;
  nickname: string;
  avatarEmoji: string;
  gradeId: number;
  classCode: string;
  totalAchievements?: number;
  totalLikes?: number;
  role?: 'STUDENT' | 'ADMIN';
}

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  register: (studentId: string, nickname: string, gradeId: number, classCode: string, password: string) => Promise<boolean>;
  login: (studentId: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateAvatar: (avatar: string) => Promise<boolean>;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      token: null,
      isLoading: false,
      error: null,

      register: async (studentId, nickname, gradeId, classCode, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ token: string; student: User }>('/auth/register', {
            studentId,
            nickname,
            gradeId,
            classCode,
            password,
          });

          api.setAuthToken(response.data.token);
          set({
            currentUser: response.data.student,
            isAuthenticated: true,
            token: response.data.token,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof ApiError ? error.message : '注册失败，请检查网络连接',
            isLoading: false,
          });
          return false;
        }
      },

      login: async (studentId, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ token: string; student: User }>('/auth/login', {
            studentId,
            password,
          });

          api.setAuthToken(response.data.token);
          set({
            currentUser: response.data.student,
            isAuthenticated: true,
            token: response.data.token,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof ApiError ? error.message : '登录失败，请检查网络连接',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        api.clearAuthToken();
        set({ currentUser: null, isAuthenticated: false, token: null });
      },

      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) {
          api.clearAuthToken();
          set({ currentUser: null, isAuthenticated: false, token: null });
          return;
        }

        api.setAuthToken(token);
        try {
          const response = await api.get<User>('/auth/me');
          set({ currentUser: response.data, isAuthenticated: true });
        } catch {
          api.clearAuthToken();
          set({ currentUser: null, isAuthenticated: false, token: null });
        }
      },

      updateAvatar: async (avatar: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        set({ currentUser: { ...currentUser, avatarEmoji: avatar } });

        try {
          const response = await api.post<User>('/auth/update-avatar', { avatar });
          set({ currentUser: response.data });
          return true;
        } catch {
          set({ currentUser });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'labor-user-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setAuthToken(state.token);
        }
        void useUserStore.getState().fetchCurrentUser();
      },
    }
  )
);

api.onUnauthorized(() => {
  useUserStore.getState().logout();
});
