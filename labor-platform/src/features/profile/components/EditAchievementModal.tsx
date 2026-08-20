import { useEffect, useState } from 'react';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import type { Achievement } from '@/features/achievements/types';
import { achievementsApi } from '@/features/achievements/api';
import { cn } from '@/features/shared/lib';
import { API_ORIGIN } from '@/lib/api';

interface EditAchievementModalProps {
  isOpen: boolean;
  achievement: Achievement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAchievementModal = ({ isOpen, achievement, onClose, onSuccess }: EditAchievementModalProps) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    reflection: '',
    images: [] as string[],
    isPublic: true,
    evalAttitude: 0,
    evalSkill: 0,
    evalResult: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!achievement) return;
    setForm({
      title: achievement.title,
      description: achievement.description,
      reflection: achievement.reflection || '',
      images: achievement.images ?? [],
      isPublic: achievement.isPublic !== false,
      evalAttitude: achievement.evalAttitude ?? 0,
      evalSkill: achievement.evalSkill ?? 0,
      evalResult: achievement.evalResult ?? 0,
    });
    setError('');
  }, [achievement]);

  const { title, description, reflection, images, isPublic, evalAttitude, evalSkill, evalResult } = form;
  const updateForm = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await achievementsApi.uploadImage(file);
    if (url) {
      updateForm('images', [...images, url]);
    } else {
      setError('图片上传失败，请重试');
    }
  };

  const handleRemoveImage = (index: number) => {
    updateForm('images', images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!achievement || !title.trim() || !description.trim()) return;
    
    setIsUpdating(true);
    setError('');
    const success = await achievementsApi.update(achievement.id, {
      title,
      description,
      reflection,
      images,
      isPublic,
      evalAttitude,
      evalSkill,
      evalResult,
    });
    setIsUpdating(false);

    if (success) {
      onSuccess();
      onClose();
    } else {
      setError('保存失败，请稍后重试');
    }
  };

  const handleDelete = async () => {
    if (!achievement) return;
    
    if (!confirm('确定要删除这条成果吗？删除后无法恢复。')) return;
    
    setIsDeleting(true);
    const success = await achievementsApi.delete(achievement.id);
    setIsDeleting(false);

    if (success) {
      onSuccess();
      onClose();
    } else {
      setError('删除失败，请稍后重试');
    }
  };

  const renderStars = (value: number, onChange: (v: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={cn(
            'text-xl cursor-pointer transition-transform hover:scale-110',
            star <= value ? 'text-brand-yellow' : 'text-gray-300'
          )}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="编辑成果 ✏️">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <Input
          label="成果标题"
          value={title}
          onChange={(e) => updateForm('title', e.target.value)}
        />
        
        <div>
          <label className="block text-sm font-semibold mb-2">成果描述</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
            rows={3}
            value={description}
            onChange={(e) => updateForm('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">心得体会</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
            rows={2}
            placeholder="记录你的劳动感想..."
            value={reflection}
            onChange={(e) => updateForm('reflection', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">是否公开展示</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={isPublic} onChange={() => updateForm('isPublic', true)} />
              <span className="text-sm">公开</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!isPublic} onChange={() => updateForm('isPublic', false)} />
              <span className="text-sm">仅自己可见</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">照片管理</label>
          
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  {img.startsWith('/uploads') ? (
                    <img
                      src={`${API_ORIGIN}${img}`}
                      alt={`照片 ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg bg-brand-sand"
                    />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center text-2xl bg-brand-sand rounded-lg">
                      {img}
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 5 && (
            <div className="border-2 border-dashed border-brand-sand rounded-xl p-4 text-center bg-brand-cream">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="edit-image-upload"
              />
              <label htmlFor="edit-image-upload" className="cursor-pointer">
                <div className="text-2xl mb-1">📷</div>
                <div className="text-xs text-text-muted">点击添加照片</div>
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3">自我评价</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动态度</span>
              {renderStars(evalAttitude, (value) => updateForm('evalAttitude', value))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动技能</span>
              {renderStars(evalSkill, (value) => updateForm('evalSkill', value))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动成果</span>
              {renderStars(evalResult, (value) => updateForm('evalResult', value))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            className="text-red-500 hover:bg-red-50"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '删除中...' : '删除'}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isUpdating || !title.trim() || !description.trim()}
          >
            {isUpdating ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
