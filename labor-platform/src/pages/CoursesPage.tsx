import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCourses } from '@/features/courses/hooks/useCourses';
import { CourseCard } from '@/features/courses/components/CourseCard';
import { CourseDetail } from '@/features/courses/components/CourseDetail';
import { CourseFilter } from '@/features/courses/components/CourseFilter';
import type { Course, CourseFilters } from '@/features/courses/types';
import { Container } from '@/features/shared/components/layout';
import { api } from '@/lib/api';

interface Grade {
  id: number;
  name: string;
}

interface TaskGroup {
  id: string;
  name: string;
  icon: string;
}

export const CoursesPage = () => {
  const location = useLocation();
  const [filters, setFilters] = useState<CourseFilters>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);

  const { data: courses = [], isLoading } = useCourses(filters);

  useEffect(() => {
    const courseId = (location.state as { courseId?: string } | null)?.courseId;
    if (!courseId || courses.length === 0) return;
    const matched = courses.find((course) => course.id === courseId);
    if (matched) {
      setSelectedCourse(matched);
    }
  }, [courses, location.state]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [gradesRes, taskGroupsRes] = await Promise.all([
          api.get<Grade[]>('/courses/grades'),
          api.get<TaskGroup[]>('/courses/task-groups'),
        ]);
        
        setGrades(gradesRes.data);
        setTaskGroups(taskGroupsRes.data);
      } catch {
        console.error('Failed to fetch filters');
      }
    };

    fetchFilters();
  }, []);

  const handleGradeChange = (gradeId?: number) => {
    setFilters((prev) => ({ ...prev, gradeId }));
  };

  const handleTaskGroupChange = (taskGroupId?: string) => {
    setFilters((prev) => ({ ...prev, taskGroupId }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  };

  const groupedCourses = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach((course) => {
      const gradeName = course.grade.name;
      if (!groups[gradeName]) {
        groups[gradeName] = [];
      }
      groups[gradeName].push(course);
    });
    return groups;
  }, [courses]);

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl mb-2">📚 课程学习</h1>
        <p className="text-text-muted">选择适合你的劳动课程，开始学习之旅吧！</p>
      </div>

      <CourseFilter
        grades={grades}
        taskGroups={taskGroups}
        selectedGradeId={filters.gradeId}
        selectedTaskGroupId={filters.taskGroupId}
        search={filters.search}
        onGradeChange={handleGradeChange}
        onTaskGroupChange={handleTaskGroupChange}
        onSearchChange={handleSearchChange}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="text-text-muted">加载中...</p>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-text-muted">没有找到符合条件的课程</p>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(groupedCourses).map(([gradeName, gradeCourses]) => (
            <div key={gradeName}>
              <h2 className="font-display text-xl mb-4">{gradeName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gradeCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => setSelectedCourse(course)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </Container>
  );
};