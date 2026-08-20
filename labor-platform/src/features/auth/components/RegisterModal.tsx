import { useState } from 'react';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import { useUserStore } from '../store/useUserStore';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) => {
  const [studentId, setStudentId] = useState('');
  const [nickname, setNickname] = useState('');
  const [gradeId, setGradeId] = useState(6);
  const [classCode, setClassCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { register, isLoading, error, clearError } = useUserStore();

  const grades = [
    { id: 6, name: '六年级' },
    { id: 7, name: '七年级' },
  ];

  const classOptions = ['1班', '2班', '3班', '4班', '5班', '6班'];

  const handleSubmit = async () => {
    clearError();
    setLocalError('');
    if (!studentId.trim() || !nickname.trim() || !classCode.trim() || !password) return;
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    const success = await register(studentId.trim(), nickname.trim(), gradeId, classCode, password);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="注册 🌱">
      <p className="text-sm text-text-muted mb-6">
        首次使用？填写学籍号并设置登录密码完成注册。
      </p>

      {(localError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
          {localError || error}
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
          label="昵称"
          placeholder="给自己起个有趣的昵称"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
        />

        <Input
          label="密码"
          type="password"
          placeholder="至少 6 位，不要使用简单密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          label="确认密码"
          type="password"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <div>
          <label className="text-sm font-semibold mb-2 block">年级</label>
          <div className="flex gap-2">
            {grades.map((g) => (
              <Button
                key={g.id}
                variant={gradeId === g.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setGradeId(g.id)}
              >
                {g.name}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold mb-2 block">班级</label>
          <div className="flex gap-2 flex-wrap">
            {classOptions.map((c) => (
              <Button
                key={c}
                variant={classCode === c ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setClassCode(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant="orange"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? '注册中...' : '注册 🎉'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-text-muted">已有账号？</span>
          <button
            className="text-brand-green font-semibold ml-1 cursor-pointer hover:underline"
            onClick={onSwitchToLogin}
          >
            立即登录
          </button>
        </div>
      </div>
    </Modal>
  );
};
