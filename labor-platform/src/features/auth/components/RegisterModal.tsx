import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import { adminApi } from '@/features/admin/api/adminApi';
import type { RegistrationMode } from '@/features/admin/api/adminApi';
import { useUserStore } from '../store/useUserStore';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const MODE_TEXT: Record<RegistrationMode, string> = {
  OPEN: '填写学籍号并设置登录密码完成注册。',
  ROSTER_ONLY: '当前仅名册内的学生可注册，请填写名册中的真实姓名。',
  CLOSED: '平台暂未开放注册，请联系老师或管理员。',
};

export const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) => {
  const [studentId, setStudentId] = useState('');
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gradeId, setGradeId] = useState(6);
  const [classCode, setClassCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { register, isLoading, error, clearError } = useUserStore();

  // 每次打开时读取最新的注册模式
  const { data: settingsData, isLoading: isSettingsLoading, isError: isSettingsError, refetch: refetchSettings } = useQuery({
    queryKey: ['auth', 'registration-settings'],
    queryFn: adminApi.getRegistrationSettings,
    enabled: isOpen,
  });
  const mode = settingsData?.data.mode;
  const isClosed = mode === 'CLOSED';
  const needsRealName = mode === 'ROSTER_ONLY';

  const grades = [
    { id: 6, name: '六年级' },
    { id: 7, name: '七年级' },
  ];

  const classOptions = ['1班', '2班', '3班', '4班', '5班', '6班'];

  const handleSubmit = async () => {
    clearError();
    setLocalError('');
    if (!mode || isClosed) return;
    if (!studentId.trim() || !nickname.trim() || !password) return;
    if (!needsRealName && !classCode.trim()) return;
    if (needsRealName && !realName.trim()) {
      setLocalError('名册注册需要填写真实姓名');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    const success = await register({
      studentId: studentId.trim(),
      nickname: nickname.trim(),
      gradeId,
      classCode,
      password,
      ...(needsRealName ? { realName: realName.trim() } : {}),
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="注册 🌱">
      {isSettingsLoading ? (
        <div className="py-12 text-center text-sm text-text-muted">正在获取注册信息...</div>
      ) : isSettingsError || !mode ? (
        <div className="py-6 text-center">
          <p className="text-sm text-red-600">暂时无法获取注册信息，请稍后重试。</p>
          <Button variant="ghost" className="mt-4" onClick={() => void refetchSettings()}>
            重新加载
          </Button>
        </div>
      ) : isClosed ? (
        <div className="py-4">
          <div className="rounded-xl bg-brand-yellow-pale px-4 py-6 text-center">
            <div className="mb-2 text-4xl">🔒</div>
            <p className="font-semibold text-text">{MODE_TEXT.CLOSED}</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onClose}>
              返回
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            <span className="text-text-muted">已有账号？</span>
            <button
              className="text-brand-green font-semibold ml-1 cursor-pointer hover:underline"
              onClick={onSwitchToLogin}
            >
              立即登录
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-muted mb-6">
            首次使用？{needsRealName ? '名册内学生' : '填写学籍号'}并设置登录密码完成注册。
          </p>

          {needsRealName && (
            <div className="mb-4 rounded-lg bg-brand-green-pale px-3 py-2 text-xs text-brand-green">
              当前为「仅名册注册」模式：仅名册内的学生可注册，请填写名册中的真实姓名。
            </div>
          )}

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

            {needsRealName && (
              <Input
                label="真实姓名"
                placeholder="请输入名册中的真实姓名"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                maxLength={20}
              />
            )}

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

            {!needsRealName && (
              <>
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
              </>
            )}

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
        </>
      )}
    </Modal>
  );
};
