import { Avatar } from '@/features/shared/components/ui';
import type { StudentProfile } from '../types';

interface ProfileHeaderProps {
  profile: StudentProfile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  return (
    <div className="bg-gradient-to-br from-[#3d2b1f] to-brand-brown py-10 px-6">
      <div className="max-w-[1100px] mx-auto flex items-center gap-6">
        <Avatar
          emoji={profile.avatarEmoji}
          size="lg"
          className="bg-brand-orange border-4 border-white/30"
        />
        <div>
          <h1 className="font-display text-3xl text-white mb-1">{profile.nickname}</h1>
          <p className="text-sm text-white/65">
            {profile.grade.name} {profile.classCode}
          </p>

          <div className="flex gap-6 mt-4 pt-4 border-t border-white/15">
            <div className="text-white">
              <div className="font-display text-2xl text-brand-yellow">
                {profile.stats.totalAchievements}
              </div>
              <div className="text-xs text-white/60">完成项目</div>
            </div>
            <div className="text-white">
              <div className="font-display text-2xl text-brand-yellow">
                {profile.stats.totalLikes}
              </div>
              <div className="text-xs text-white/60">获得点赞</div>
            </div>
            <div className="text-white">
              <div className="font-display text-2xl text-brand-yellow">
                {profile.stats.totalBadges}
              </div>
              <div className="text-xs text-white/60">获得徽章</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
