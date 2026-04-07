import type { ProfileData } from '../types';

export const mockProfileData: ProfileData = {
  profile: {
    id: 'stu-1',
    nickname: '小明同学',
    avatarEmoji: '🌟',
    grade: { id: 6, name: '六年级' },
    classCode: '3班',
    stats: {
      totalAchievements: 8,
      totalLikes: 47,
      totalBadges: 3,
    },
    evalAverage: {
      attitude: 4.8,
      skill: 4.2,
      result: 4.5,
    },
  },

  timeline: [
    {
      id: 'ach-1',
      student: { id: 'stu-1', nickname: '小明同学', avatarEmoji: '🌟', gradeId: 6, classCode: '3班' },
      course: { title: '面包的烘焙', taskGroupId: 'cook' },
      title: '第一次成功烤出软面包！',
      description: '揉面揉了快20分钟，烤出来的面包金黄松软，全家都夸好吃。',
      images: ['🍞'],
      evalAttitude: 5, evalSkill: 4, evalResult: 4,
      likesCount: 14,
      createdAt: '2026-03-20',
      isLikedByMe: false,
    },
    {
      id: 'ach-2',
      student: { id: 'stu-1', nickname: '小明同学', avatarEmoji: '🌟', gradeId: 6, classCode: '3班' },
      course: { title: '金属丝花瓶架的设计与制作', taskGroupId: 'industry' },
      title: '做了一个三脚花瓶架',
      description: '用铝丝弯出三脚架，放上小玻璃瓶插干花，摆在窗台很好看。',
      images: [],
      evalAttitude: 4, evalSkill: 4, evalResult: 4,
      likesCount: 8,
      createdAt: '2026-03-05',
      isLikedByMe: false,
    },
    {
      id: 'ach-3',
      student: { id: 'stu-1', nickname: '小明同学', avatarEmoji: '🌟', gradeId: 6, classCode: '3班' },
      course: { title: '水仙花雕刻及养护', taskGroupId: 'farm' },
      title: '水仙花雕刻完成，开始水养',
      description: '第一次用雕刻刀，刚开始有点紧张，后来越来越顺手！',
      images: ['🌸'],
      evalAttitude: 5, evalSkill: 5, evalResult: 5,
      likesCount: 19,
      createdAt: '2026-02-15',
      isLikedByMe: false,
    },
  ],

  badges: [
    { id: 'badge-1', name: '烹饪新星', emoji: '🍳', description: '完成3个烹饪项目', earned: true, earnedAt: '2026-03-20' },
    { id: 'badge-2', name: '种植达人', emoji: '🌱', description: '完成2个农业项目', earned: true, earnedAt: '2026-02-15' },
    { id: 'badge-3', name: '手工能手', emoji: '✂️', description: '完成3个工艺项目', earned: true, earnedAt: '2026-01-10' },
    { id: 'badge-4', name: '维修小将', emoji: '🔧', description: '完成2个器具维护项目', earned: false },
    { id: 'badge-5', name: '志愿之星', emoji: '🤝', description: '参与5次志愿活动', earned: false },
    { id: 'badge-6', name: '科技先锋', emoji: '💻', description: '完成新技术体验项目', earned: false },
  ],
};