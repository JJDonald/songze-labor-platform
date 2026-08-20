import { useState } from 'react';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import { useUserStore } from '../store/useUserStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal = ({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, isLoading, error, clearError } = useUserStore();

  const handleSubmit = async () => {
    clearError();
    if (!studentId.trim() || !password.trim()) return;
    
    const success = await login(studentId.trim(), password.trim());
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="登录 🌱">
      <p className="text-sm text-text-muted mb-6">使用学籍号和密码登录</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="学籍号"
          placeholder="请输入学籍号"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />

        <Input
          label="密码"
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          variant="orange"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? '登录中...' : '登录 🎉'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-text-muted">还没有账号？</span>
          <button
            className="text-brand-green font-semibold ml-1 cursor-pointer hover:underline"
            onClick={onSwitchToRegister}
          >
            立即注册
          </button>
        </div>
      </div>
    </Modal>
  );
};