import type { Course } from '../types';
import { cn } from '@/features/shared/lib';
import { API_ORIGIN } from '@/lib/api';

interface CourseCardProps {
  course: Course;
  onClick?: () => void;
}

export const CourseCard = ({ course, onClick }: CourseCardProps) => {
  const semesterLabel = course.semesterId === 1 ? '上半学期' : '下半学期';
  const semesterColor = course.semesterId === 1 ? 'bg-brand-green-pale text-brand-green' : 'bg-brand-orange-pale text-brand-orange';

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div
        className="h-32 flex items-center justify-center text-6xl"
        style={{ backgroundColor: course.color }}
      >
        {course.coverImage ? (
          <img
            src={`${API_ORIGIN}${course.coverImage}`}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : course.coverSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: course.coverSvg }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          course.emoji
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', semesterColor)}>
            {semesterLabel}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-yellow-pale text-[#B07D00]">
            {course.taskGroup.name}
          </span>
        </div>

        <h3 className="font-bold text-base mb-1">{course.title}</h3>
        <p className="text-sm text-text-soft line-clamp-2">{course.description}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-text-muted">{course.grade.name}</span>
          <span className="text-xs text-brand-green font-semibold">查看详情 →</span>
        </div>
      </div>
    </div>
  );
};