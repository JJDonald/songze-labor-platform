import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../api/coursesApi';
import { CourseCard } from './CourseCard';

export const RecommendedCourses = ({ limit = 3 }: { limit?: number }) => {
  const navigate = useNavigate();
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', 'recommended'],
    queryFn: () => coursesApi.getAll({}),
  });

  const displayCourses = courses.slice(0, limit);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm h-64 animate-pulse">
            <div className="h-32 bg-gray-200 rounded-t-xl"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {displayCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onClick={() => navigate('/courses')}
          />
        ))}
      </div>
      
      {courses.length > limit && (
        <div className="text-center">
          <button
            onClick={() => navigate('/courses')}
            className="text-brand-green font-semibold hover:underline"
          >
            查看全部课程 →
          </button>
        </div>
      )}
    </div>
  );
};