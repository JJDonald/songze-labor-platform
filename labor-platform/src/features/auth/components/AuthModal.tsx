import { useState } from 'react';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import { useUserStore } from '../store/useUserStore';

type AuthMode = 'login' | 'register';

export const AuthModal = () => {
  const [mode, setMode] = useState<AuthMode>('register');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [gradeId, setGradeId] = useState(6);
  const [classCode, setClassCode] = useState('');
  
  const { isAuthenticated, isLoading, error, register, login, clearError } = useUserStore();

  if (isAuthenticated) return null;

  const grades = [
    { id: 6, name: '六年级' },
    { id: 7, name: '七年级' },
  ];

  const classOptions = ['1班', '2班', '3班', '4班', '5班', '6班'];

  const handleSubmit = async () => {
    clearError();
    
    if (mode === 'register') {
      if (!studentId.trim() || !nickname.trim() || !classCode.trim()) {
        return;
      }
      await register(studentId.trim(), nickname.trim(), gradeId, classCode);
    } else {
      if (!studentId.trim() || !password.trim()) {
        return;
      }
      await login(studentId.trim(), password.trim());
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
    setStudentId('');
    setPassword('');
    setNickname('');
    setClassCode('');
  };

  return (
    <Modal isOpen={!isAuthenticated} title={mode === 'login' ? '登录 🌱' : '欢迎来到劳动课堂 🌱'}>
      <p className="text-sm text-text-muted mb-6">
        {mode === 'login' 
          ? '使用学籍号和密码登录' 
          : '首次使用？填写信息完成注册，初始密码为 123456'}
      </p>

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

        {mode === 'login' && (
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码（初始密码：123456）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {mode === 'register' && (
          <>
            <Input
              label="昵称"
              placeholder="给自己起个有趣的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
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
          </>
        )}

        <Button
          variant="orange"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? '处理中...' : mode === 'login' ? '登录 🎉' : '注册 🎉'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-text-muted">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
          </span>
          <button
            className="text-brand-green font-semibold ml-1 cursor-pointer hover:underline"
            onClick={switchMode}
          >
            {mode === 'login' ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </Modal>
  );
};