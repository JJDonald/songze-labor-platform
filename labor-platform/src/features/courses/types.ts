export interface Course {
  id: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  objectives: string[];
  materials: string[];
  steps: {
    title: string;
    desc: string;
    icon: string;
  }[];
  safetyTips: string;
  coverSvg?: string;
  grade: {
    id: number;
    name: string;
  };
  taskGroup: {
    id: string;
    name: string;
    icon: string;
    type?: string;
  };
  semesterId: number;
}

export interface CourseFilters {
  gradeId?: number;
  taskGroupId?: string;
  semesterId?: number;
  search?: string;
}