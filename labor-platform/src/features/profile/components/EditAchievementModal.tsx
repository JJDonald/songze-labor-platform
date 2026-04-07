import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/features/shared/components/ui';
import type { Achievement } from '@/features/achievements/types';
import { achievementsApi } from '@/features/achievements/api';
import { cn } from '@/features/shared/lib';

interface EditAchievementModalProps {
  isOpen: boolean;
  achievement: Achievement | null;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE = 'http://localhost:3001';

export const EditAchievementModal = ({ isOpen, achievement, onClose, onSuccess }: EditAchievementModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reflection, setReflection] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [evalAttitude, setEvalAttitude] = useState(0);
  const [evalSkill, setEvalSkill] = useState(0);
  const [evalResult, setEvalResult] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (achievement) {
      setTitle(achievement.title);
      setDescription(achievement.description);
      setReflection('');
      setImages(achievement.images || []);
      setIsPublic(true);
      setEvalAttitude(achievement.evalAttitude);
      setEvalSkill(achievement.evalSkill);
      setEvalResult(achievement.evalResult);
    }
  }, [achievement]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await achievementsApi.uploadImage(file);
    if (url) {
      setImages([...images, url]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!achievement || !title.trim() || !description.trim()) return;
    
    setIsUpdating(true);
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
        <Input
          label="成果标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <div>
          <label className="block text-sm font-semibold mb-2">成果描述</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">心得体会</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
            rows={2}
            placeholder="记录你的劳动感想..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </div>

        {/* 图片管理 */}
        <div>
          <label className="block text-sm font-semibold mb-2">照片管理</label>
          
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  {img.startsWith('/uploads') ? (
                    <img
                      src={`${API_BASE}${img}`}
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

        {/* 自我评价 */}
        <div>
          <label className="block text-sm font-semibold mb-3">自我评价</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动态度</span>
              {renderStars(evalAttitude, setEvalAttitude)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动技能</span>
              {renderStars(evalSkill, setEvalSkill)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">劳动成果</span>
              {renderStars(evalResult, setEvalResult)}
            </div>
          </div>
        </div>

        {/* 按钮 */}
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