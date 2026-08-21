import { useState } from 'react';
import { Button, Modal } from '@/features/shared/components/ui';
import { API_ORIGIN } from '@/lib/api';
import type { AdminAchievement } from '../api/adminApi';

type ReviewDecision = {
  status: 'APPROVED' | 'REJECTED';
  reviewComment?: string;
};

interface AchievementReviewModalProps {
  achievement: AdminAchievement | null;
  isOpen: boolean;
  isSubmitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: ReviewDecision) => void;
}

const parseImages = (images: AdminAchievement['images']): string[] => {
  if (Array.isArray(images)) return images;
  if (!images) return [];
  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [images];
  } catch {
    return images.split(',').map((item) => item.trim()).filter(Boolean);
  }
};

const imageSource = (image: string) => image.startsWith('http') || image.startsWith('data:')
  ? image
  : `${API_ORIGIN}${image}`;

export const AchievementReviewModal = ({
  achievement,
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: AchievementReviewModalProps) => {
  const [mode, setMode] = useState<'detail' | 'reject'>('detail');
  const [reason, setReason] = useState('');
  const images = parseImages(achievement?.images);
  const trimmedReason = reason.trim();
  const reasonError = mode === 'reject' && trimmedReason.length > 0 && trimmedReason.length < 5;

  if (!achievement) return null;

  const score = (value?: number) => value ? `${value} / 5` : '未填写';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      title={achievement.title}
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{achievement.student?.avatarEmoji || '👤'}</span>
            <div>
              <div className="font-semibold">{achievement.student?.nickname || '未知提交人'}</div>
              <div className="text-sm text-gray-500">
                {achievement.student?.studentId || '无学号'}
                {achievement.student?.classCode ? ` · ${achievement.student.classCode}` : ''}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(achievement.createdAt).toLocaleString()}
          </div>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <a key={`${image}-${index}`} href={imageSource(image)} target="_blank" rel="noreferrer">
                <img
                  src={imageSource(image)}
                  alt={`成果图片 ${index + 1}`}
                  className="aspect-square w-full rounded-lg border object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">未上传图片</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">成果描述</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{achievement.description || '未填写'}</p>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">劳动反思</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{achievement.reflection || '未填写'}</p>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
          <div><div className="text-gray-500">课程</div><div className="mt-1 font-medium">{achievement.course?.title || '未关联课程'}</div></div>
          <div><div className="text-gray-500">公开意愿</div><div className="mt-1 font-medium">{achievement.isPublic ? '愿意公开' : '不公开'}</div></div>
          <div><div className="text-gray-500">态度自评</div><div className="mt-1 font-medium">{score(achievement.evalAttitude)}</div></div>
          <div>
            <div className="text-gray-500">技能 / 成果自评</div>
            <div className="mt-1 font-medium">{score(achievement.evalSkill)} / {score(achievement.evalResult)}</div>
          </div>
        </div>

      {achievement.reviewComment && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">审核意见：</span>{achievement.reviewComment}
        </div>
      )}

        {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {mode === 'reject' && (
          <div>
            <label htmlFor="review-reason" className="mb-2 block text-sm font-semibold">驳回理由（5–500 字）</label>
            <textarea
              id="review-reason"
              autoFocus
              rows={4}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full resize-none rounded-lg border-2 border-brand-sand bg-brand-cream px-4 py-3 text-sm outline-none focus:border-brand-green focus:bg-white"
              placeholder="请说明需要修改的具体内容"
            />
            <div className={`mt-1 flex justify-between text-xs ${reasonError ? 'text-red-600' : 'text-gray-500'}`}>
              <span>{reasonError ? '驳回理由至少需要 5 个字' : '理由会展示给提交人'}</span>
              <span>{reason.length}/500</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          <Button variant="ghost" onClick={mode === 'reject' ? () => setMode('detail') : onClose} disabled={isSubmitting}>
            {mode === 'reject' ? '返回' : '关闭'}
          </Button>
          {mode === 'detail' ? (
            <>
              <Button variant="orange" onClick={() => setMode('reject')} disabled={isSubmitting}>驳回</Button>
              <Button onClick={() => onSubmit({ status: 'APPROVED' })} disabled={isSubmitting}>
                {isSubmitting ? '处理中...' : '通过'}
              </Button>
            </>
          ) : (
            <Button
              variant="orange"
              onClick={() => onSubmit({ status: 'REJECTED', reviewComment: trimmedReason })}
              disabled={isSubmitting || trimmedReason.length < 5 || trimmedReason.length > 500}
            >
              {isSubmitting ? '处理中...' : '确认驳回'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
