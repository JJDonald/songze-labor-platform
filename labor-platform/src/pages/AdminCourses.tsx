import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { AdminCourse } from '@/features/admin/api/adminApi';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { API_ORIGIN } from '@/lib/api';

export const AdminCourses = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectives: [''] as string[],
    materials: [''] as string[],
    steps: [{ title: '', desc: '', icon: '📝' }] as { title: string; desc: string; icon: string }[],
    safetyTips: '',
    gradeId: 6,
    semesterId: 1,
    taskGroupId: '',
    emoji: '🌱',
    color: '#E8F5E9',
    coverImage: '',
  });

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: adminApi.getCourses,
  });

  const { data: taskGroupsData } = useQuery({
    queryKey: ['admin', 'task-groups'],
    queryFn: adminApi.getTaskGroups,
  });

  const { data: gradesData } = useQuery({
    queryKey: ['admin', 'grades'],
    queryFn: adminApi.getGrades,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateCourse>[1] }) =>
      adminApi.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
    },
  });

  const courses = coursesData?.data || [];
  const taskGroups = taskGroupsData?.data || [];
  const grades = gradesData?.data || [];

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      objectives: [''],
      materials: [''],
      steps: [{ title: '', desc: '', icon: '📝' }],
      safetyTips: '',
      gradeId: 6,
      semesterId: 1,
      taskGroupId: taskGroups[0]?.id || '',
      emoji: '🌱',
      color: '#E8F5E9',
      coverImage: '',
    });
    setShowModal(true);
  };

  const openEditModal = (course: AdminCourse) => {
    setEditingCourse(course);
    let objectives: string[] = [];
    let materials: string[] = [];
    let steps: { title: string; desc: string; icon: string }[] = [];
    
    try {
      objectives = JSON.parse(course.objectives);
      materials = JSON.parse(course.materials);
      steps = JSON.parse(course.steps);
    } catch {
      objectives = [];
      materials = [];
      steps = [];
    }

    setFormData({
      title: course.title,
      description: course.description,
      objectives: objectives.length > 0 ? objectives : [''],
      materials: materials.length > 0 ? materials : [''],
      steps: steps.length > 0 ? steps : [{ title: '', desc: '', icon: '📝' }],
      safetyTips: course.safetyTips,
      gradeId: course.gradeId,
      semesterId: course.semesterId,
      taskGroupId: course.taskGroupId,
      emoji: course.emoji,
      color: course.color,
      coverImage: course.coverImage || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: formData.title,
      description: formData.description,
      objectives: JSON.stringify(formData.objectives.filter(o => o.trim())),
      materials: JSON.stringify(formData.materials.filter(m => m.trim())),
      steps: JSON.stringify(formData.steps.filter(s => s.title.trim())),
      safetyTips: formData.safetyTips,
      gradeId: formData.gradeId,
      semesterId: formData.semesterId,
      taskGroupId: formData.taskGroupId,
      emoji: formData.emoji,
      color: formData.color,
      coverImage: formData.coverImage || undefined,
    };

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (course: AdminCourse) => {
    if (confirm(`确定要删除课程 "${course.title}" 吗？`)) {
      deleteMutation.mutate(course.id);
    }
  };

  const addObjective = () => setFormData({ ...formData, objectives: [...formData.objectives, ''] });
  const removeObjective = (index: number) => setFormData({ ...formData, objectives: formData.objectives.filter((_, i) => i !== index) });
  
  const addMaterial = () => setFormData({ ...formData, materials: [...formData.materials, ''] });
  const removeMaterial = (index: number) => setFormData({ ...formData, materials: formData.materials.filter((_, i) => i !== index) });
  
  const addStep = () => setFormData({ ...formData, steps: [...formData.steps, { title: '', desc: '', icon: '📝' }] });
  const removeStep = (index: number) => setFormData({ ...formData, steps: formData.steps.filter((_, i) => i !== index) });

  if (coursesLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">📚 课程管理</h1>
          <button
            onClick={openCreateModal}
            className="bg-brand-green text-white px-6 py-2 rounded-lg hover:bg-brand-green-light"
          >
            + 添加课程
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                className="h-32 flex items-center justify-center text-5xl"
                style={{ backgroundColor: course.color }}
              >
                {course.coverImage ? (
                  <img 
                    src={`${API_ORIGIN}${course.coverImage}`} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  course.emoji
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 bg-brand-green-pale text-brand-green rounded">
                    {course.taskGroup?.name}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {course.grade?.name}
                  </span>
                </div>
                <h3 className="font-bold mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => openEditModal(course)}
                    className="px-3 py-1 text-brand-green hover:bg-brand-green-pale rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl my-8">
            <h2 className="text-xl font-bold mb-4">{editingCourse ? '编辑课程' : '添加课程'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* 基本信息 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">课程标题 *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">任务群 *</label>
                    <select
                      value={formData.taskGroupId}
                      onChange={(e) => setFormData({ ...formData, taskGroupId: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      {taskGroups.map((tg) => (
                        <option key={tg.id} value={tg.id}>{tg.icon} {tg.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">课程描述 *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">年级</label>
                    <select
                      value={formData.gradeId}
                      onChange={(e) => setFormData({ ...formData, gradeId: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">学期</label>
                    <select
                      value={formData.semesterId}
                      onChange={(e) => setFormData({ ...formData, semesterId: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value={1}>上半学期</option>
                      <option value={2}>下半学期</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Emoji</label>
                    <input
                      type="text"
                      value={formData.emoji}
                      onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">颜色</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 封面图片 */}
                <div>
                  <label className="block text-sm font-medium mb-1">封面图片</label>
                  <ImageUploader
                    value={formData.coverImage ? `${API_ORIGIN}${formData.coverImage}` : undefined}
                    onChange={(url) => setFormData({ ...formData, coverImage: url })}
                  />
                </div>

                {/* 学习目标 */}
                <div>
                  <label className="block text-sm font-medium mb-1">学习目标</label>
                  {formData.objectives.map((obj, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => {
                          const newObjectives = [...formData.objectives];
                          newObjectives[i] = e.target.value;
                          setFormData({ ...formData, objectives: newObjectives });
                        }}
                        className="flex-1 border rounded-lg px-3 py-2"
                        placeholder={`目标 ${i + 1}`}
                      />
                      {formData.objectives.length > 1 && (
                        <button type="button" onClick={() => removeObjective(i)} className="text-red-500 px-2">删除</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addObjective} className="text-brand-green text-sm">+ 添加目标</button>
                </div>

                {/* 材料清单 */}
                <div>
                  <label className="block text-sm font-medium mb-1">材料清单</label>
                  {formData.materials.map((mat, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={mat}
                        onChange={(e) => {
                          const newMaterials = [...formData.materials];
                          newMaterials[i] = e.target.value;
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                        className="flex-1 border rounded-lg px-3 py-2"
                        placeholder={`材料 ${i + 1}`}
                      />
                      {formData.materials.length > 1 && (
                        <button type="button" onClick={() => removeMaterial(i)} className="text-red-500 px-2">删除</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addMaterial} className="text-brand-green text-sm">+ 添加材料</button>
                </div>

                {/* 步骤 */}
                <div>
                  <label className="block text-sm font-medium mb-1">操作步骤</label>
                  {formData.steps.map((step, i) => (
                    <div key={i} className="border rounded-lg p-3 mb-2">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={step.icon}
                          onChange={(e) => {
                            const newSteps = [...formData.steps];
                            newSteps[i] = { ...newSteps[i], icon: e.target.value };
                            setFormData({ ...formData, steps: newSteps });
                          }}
                          className="w-20 border rounded px-2 py-1"
                          placeholder="图标"
                        />
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...formData.steps];
                            newSteps[i] = { ...newSteps[i], title: e.target.value };
                            setFormData({ ...formData, steps: newSteps });
                          }}
                          className="flex-1 border rounded px-2 py-1"
                          placeholder="步骤标题"
                        />
                        {formData.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(i)} className="text-red-500 px-2">删除</button>
                        )}
                      </div>
                      <textarea
                        value={step.desc}
                        onChange={(e) => {
                          const newSteps = [...formData.steps];
                          newSteps[i] = { ...newSteps[i], desc: e.target.value };
                          setFormData({ ...formData, steps: newSteps });
                        }}
                        className="w-full border rounded px-2 py-1"
                        placeholder="步骤描述"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button type="button" onClick={addStep} className="text-brand-green text-sm">+ 添加步骤</button>
                </div>

                {/* 安全提示 */}
                <div>
                  <label className="block text-sm font-medium mb-1">安全提示</label>
                  <textarea
                    value={formData.safetyTips}
                    onChange={(e) => setFormData({ ...formData, safetyTips: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-light"
                >
                  {editingCourse ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};