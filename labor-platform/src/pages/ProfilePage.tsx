import { useState } from 'react';
import { ProfileHeader, Timeline, EvalCard, BadgesCard } from '@/features/profile/components';
import { EditAchievementModal } from '@/features/profile/components/EditAchievementModal';
import { useProfile } from '@/features/profile/hooks';
import { useUserStore } from '@/features/auth/store/useUserStore';
import { Container } from '@/features/shared/components/layout';
import { Loading, EmptyState } from '@/features/shared/components/common';
import type { Achievement } from '@/features/achievements/types';

export const ProfilePage = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const { data, isLoading, refetch } = useProfile(currentUser?.id || '');
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    refetch();
  };

  if (!currentUser) {
    return (
      <Container className="py-12">
        <EmptyState message="请先登录" icon="🔐" />
      </Container>
    );
  }

  if (isLoading) return <Loading />;

  if (!data) {
    return (
      <Container className="py-12">
        <EmptyState message="加载失败" icon="❌" />
      </Container>
    );
  }

  return (
    <div>
      <ProfileHeader profile={data.profile} />
      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div>
            <h2 className="font-display text-2xl mb-5">📅 我的劳动记录</h2>
            {data.timeline.length > 0 ? (
              <Timeline achievements={data.timeline} onEdit={handleEdit} />
            ) : (
              <div className="text-center py-12 text-text-muted">
                <div className="text-4xl mb-4">📝</div>
                <p>还没有劳动记录</p>
                <p className="text-sm mt-2">快去提交你的第一个成果吧！</p>
              </div>
            )}
          </div>
          <div>
            <EvalCard evalAverage={data.profile.evalAverage} />
            <BadgesCard badges={data.badges} />
          </div>
        </div>
      </Container>

      {editingAchievement && (
        <EditAchievementModal
          key={editingAchievement.id}
          isOpen={showEditModal}
          achievement={editingAchievement}
          onClose={() => {
            setShowEditModal(false);
            setEditingAchievement(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};