import { useState } from 'react';
import { cn } from '@/features/shared/lib';

interface Grade {
  id: number;
  name: string;
}

interface TaskGroup {
  id: string;
  name: string;
  icon: string;
}

interface CourseFilterProps {
  grades: Grade[];
  taskGroups: TaskGroup[];
  selectedGradeId?: number;
  selectedTaskGroupId?: string;
  search?: string;
  onGradeChange: (gradeId?: number) => void;
  onTaskGroupChange: (taskGroupId?: string) => void;
  onSearchChange: (search: string) => void;
}

export const CourseFilter = ({
  grades,
  taskGroups,
  selectedGradeId,
  selectedTaskGroupId,
  search,
  onGradeChange,
  onTaskGroupChange,
  onSearchChange,
}: CourseFilterProps) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索课程..."
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            showFilters ? 'bg-brand-green text-white' : 'bg-gray-100 text-text-soft hover:bg-gray-200'
          )}
        >
          🔍 筛选
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-muted mb-2">年级</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onGradeChange(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  !selectedGradeId
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-text-soft hover:bg-gray-200'
                )}
              >
                全部
              </button>
              {grades.map((grade) => (
                <button
                  key={grade.id}
                  onClick={() => onGradeChange(grade.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedGradeId === grade.id
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-text-soft hover:bg-gray-200'
                  )}
                >
                  {grade.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">劳动类型</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onTaskGroupChange(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  !selectedTaskGroupId
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-text-soft hover:bg-gray-200'
                )}
              >
                全部
              </button>
              {taskGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onTaskGroupChange(group.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedTaskGroupId === group.id
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-text-soft hover:bg-gray-200'
                  )}
                >
                  {group.icon} {group.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};