import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  studentId: string;
  nickname: string;
  avatarEmoji: string;
  gradeId: number;
  classCode: string;
  totalAchievements?: number;
  totalLikes?: number;
}

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  register: (studentId: string, nickname: string, gradeId: number, classCode: string) => Promise<boolean>;
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
      isLoading: false,
      error: null,

      register: async (studentId, nickname, gradeId, classCode) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ token: string; student: User }>('/auth/register', {
            studentId,
            nickname,
            gradeId,
            classCode,
          });

          if (response.code === 0 && response.data) {
            api.setAuthToken(response.data.token);
            set({
              currentUser: response.data.student,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ error: response.message, isLoading: false });
            return false;
          }
        } catch (error) {
          set({ error: '注册失败，请检查网络连接', isLoading: false });
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

          if (response.code === 0 && response.data) {
            api.setAuthToken(response.data.token);
            set({
              currentUser: response.data.student,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ error: response.message, isLoading: false });
            return false;
          }
        } catch (error) {
          set({ error: '登录失败，请检查网络连接', isLoading: false });
          return false;
        }
      },

      logout: () => {
        api.clearAuthToken();
        set({ currentUser: null, isAuthenticated: false });
      },

      fetchCurrentUser: async () => {
        try {
          const response = await api.get<User>('/auth/me');
          if (response.code === 0 && response.data) {
            set({ currentUser: response.data, isAuthenticated: true });
          }
        } catch (error) {
          set({ currentUser: null, isAuthenticated: false });
        }
      },

      updateAvatar: async (avatar: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        // 先更新本地状态
        set({ currentUser: { ...currentUser, avatarEmoji: avatar } });

        try {
          const response = await api.post<User>('/auth/update-avatar', { avatar });
          if (response.code === 0 && response.data) {
            set({ currentUser: response.data });
            return true;
          }
          // 如果失败，回滚
          set({ currentUser });
          return false;
        } catch (error) {
          // 如果失败，回滚
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
      }),
    }
  )
);