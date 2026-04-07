import { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { AvatarModal } from './AvatarModal';
import { PasswordModal } from './PasswordModal';

export const AccountMenu = () => {
  const { currentUser, isAuthenticated, logout } = useUserStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogin(true)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand-green hover:bg-brand-green-pale transition-all cursor-pointer"
          >
            登录
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-brand-orange text-white hover:bg-brand-orange-light transition-all cursor-pointer"
          >
            注册
          </button>
        </div>

        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
        <RegisterModal
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-brand-green-pale transition-all cursor-pointer"
        >
          <span className="text-2xl">{currentUser.avatarEmoji}</span>
          <span className="text-sm font-semibold">{currentUser.nickname}</span>
          <span className="text-text-muted text-xs">▼</span>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-brand-sand overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-brand-sand">
                <div className="text-sm font-semibold">{currentUser.nickname}</div>
                <div className="text-xs text-text-muted">{currentUser.studentId}</div>
              </div>
              
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowAvatar(true);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-green-pale transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🎨</span> 修改头像
              </button>
              
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowPassword(true);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-green-pale transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🔐</span> 修改密码
              </button>
              
              <div className="border-t border-brand-sand" />
              
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🚪</span> 退出登录
              </button>
            </div>
          </>
        )}
      </div>

      <AvatarModal isOpen={showAvatar} onClose={() => setShowAvatar(false)} />
      <PasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
    </>
  );
};