import { useNavigate } from 'react-router-dom';
import type { Course } from '../types';
import { cn } from '@/features/shared/lib';
import { Button } from '@/features/shared/components/ui';
import { Modal } from '@/features/shared/components/ui';
import { API_ORIGIN } from '@/lib/api';
import { SafeSvg } from '@/features/shared/components/SafeSvg';

interface CourseDetailProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseDetail = ({ course, isOpen, onClose }: CourseDetailProps) => {
  const navigate = useNavigate();
  const semesterLabel = course.semesterId === 1 ? '上半学期' : '下半学期';
  const semesterColor = course.semesterId === 1 ? 'bg-brand-green-pale text-brand-green' : 'bg-brand-orange-pale text-brand-orange';

  const handleSubmitAchievement = () => {
    onClose();
    navigate('/achievements/submit', { state: { courseId: course.id, courseTitle: course.title } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div
          className="h-48 flex items-center justify-center text-8xl rounded-t-2xl"
          style={{ backgroundColor: course.color }}
        >
          {course.coverImage ? (
            <img
              src={`${API_ORIGIN}${course.coverImage}`}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : course.coverSvg ? (
            <SafeSvg markup={course.coverSvg} className="h-full w-full" />
          ) : (
            course.emoji
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', semesterColor)}>
              {semesterLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-brand-yellow-pale text-[#B07D00]">
              {course.taskGroup.icon} {course.taskGroup.name}
            </span>
          </div>

          <h2 className="font-display text-2xl mb-2">{course.title}</h2>
          <p className="text-text-muted text-sm mb-4">{course.description}</p>

          {(course.demoVideo || (course.demoImages && course.demoImages.length > 0)) && (
            <div className="mb-6">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <span className="text-lg">🎬</span> 演示视频与图片
              </h3>
              {course.demoVideo && (
                <video
                  src={course.demoVideo.startsWith('http') ? course.demoVideo : `${API_ORIGIN}${course.demoVideo}`}
                  controls
                  className="w-full rounded-xl bg-black mb-3"
                />
              )}
              {course.demoImages && course.demoImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {course.demoImages.map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image.startsWith('http') ? image : `${API_ORIGIN}${image}`}
                      alt={`${course.title} 演示图片 ${index + 1}`}
                      className="w-full h-28 object-cover rounded-lg border border-gray-100"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-brand-cream/50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <span className="text-lg">🎯</span> 学习目标
            </h3>
            <ul className="space-y-1.5">
              {course.objectives.map((obj, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-text-soft">
                  <span className="text-brand-green mt-0.5">✓</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <span className="text-lg">🛠️</span> 所需材料
            </h3>
            <div className="flex flex-wrap gap-2">
              {course.materials.map((material, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-text-soft"
                >
                  {material}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <span className="text-lg">📝</span> 操作步骤
            </h3>
            <div className="space-y-3">
              {course.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-sm text-text-muted">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {course.safetyTips && (
            <div className="bg-brand-orange/10 rounded-xl p-4 mb-6 border border-brand-orange/20">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5 text-brand-orange">
                <span className="text-lg">⚠️</span> 安全提示
              </h3>
              <p className="text-sm text-text-soft">{course.safetyTips}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              关闭
            </Button>
            <Button variant="primary" onClick={handleSubmitAchievement} className="flex-1">
              ✍️ 提交我的成果
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};