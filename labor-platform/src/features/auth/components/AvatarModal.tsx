import { useState, useEffect } from 'react';
import { Modal, Button } from '@/features/shared/components/ui';
import { useUserStore } from '../store/useUserStore';
import { cn } from '@/features/shared/lib';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const avatarOptions = [
  '🌟', '⭐', '🌙', '☀️', '🌈', '🦋', '🌸', '🌺', '🌻', '🍀',
  '🧑', '👧', '👦', '🧒', '👶', '👱', '👩', '👨', '🧔', '👴',
  '🐶', '🐱', '🐼', '🐨', '🦊', '🐰', '🐻', '🐯', '🦁', '🐮',
];

export const AvatarModal = ({ isOpen, onClose }: AvatarModalProps) => {
  const { currentUser, updateAvatar } = useUserStore();
  const [selectedAvatar, setSelectedAvatar] = useState('🌟');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser?.avatarEmoji) {
      setSelectedAvatar(currentUser.avatarEmoji);
    }
  }, [isOpen, currentUser?.avatarEmoji]);

  const handleSave = async () => {
    if (!selectedAvatar) return;
    
    setError(null);
    setIsUpdating(true);
    
    try {
      const success = await updateAvatar(selectedAvatar);
      if (success) {
        onClose();
      } else {
        setError('保存失败，请重试');
      }
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改头像 🎨">
      <p className="text-sm text-text-muted mb-4">选择一个你喜欢的头像</p>

      <div className="grid grid-cols-6 gap-2 mb-6">
        {avatarOptions.map((avatar) => (
          <button
            key={avatar}
            onClick={() => setSelectedAvatar(avatar)}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer',
              selectedAvatar === avatar
                ? 'bg-brand-green-pale ring-2 ring-brand-green'
                : 'bg-brand-cream hover:bg-brand-green-pale'
            )}
          >
            {avatar}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">当前选择：</span>
          <span className="text-3xl">{selectedAvatar}</span>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? '保存中...' : '保存'}
        </Button>
      </div>
    </Modal>
  );
};