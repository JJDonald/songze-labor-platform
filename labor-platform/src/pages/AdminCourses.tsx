import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { AdminCourse } from '@/features/admin/api/adminApi';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { FileUploader } from '@/features/admin/components/FileUploader';
import { API_ORIGIN } from '@/lib/api';

export const AdminCourses = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [error, setError] = useState('');
  
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
    demoVideo: '',
    demoImages: [] as string[],
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
    onError: (err) => setError(err instanceof Error ? err.message : '创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateCourse>[1] }) =>
      adminApi.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof Error ? err.message : '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : '删除失败'),
  });

  const courses = coursesData?.data || [];
  const taskGroups = taskGroupsData?.data || [];
  const grades = gradesData?.data || [];

  const openCreateModal = () => {
    setError('');
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
      demoVideo: '',
      demoImages: [],
    });
    setShowModal(true);
  };

  const openEditModal = (course: AdminCourse) => {
    setError('');
    setEditingCourse(course);
    let objectives: string[] = [];
    let materials: string[] = [];
    let steps: { title: string; desc: string; icon: string }[] = [];
    let demoImages: string[] = [];
    
    try {
      objectives = JSON.parse(course.objectives);
      materials = JSON.parse(course.materials);
      steps = JSON.parse(course.steps);
      demoImages = course.demoImages ? JSON.parse(course.demoImages) : [];
    } catch {
      objectives = [];
      materials = [];
      steps = [];
      demoImages = [];
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
      demoVideo: course.demoVideo || '',
      demoImages,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setError('');
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
      demoVideo: formData.demoVideo || undefined,
      demoImages: JSON.stringify(formData.demoImages),
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
  const removeDemoImage = (index: number) => setFormData({ ...formData, demoImages: formData.demoImages.filter((_, i) => i !== index) });

  if (coursesLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">📚 课程管理</h1>
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-brand-green px-5 py-2.5 text-white hover:bg-brand-green-light sm:px-6"
          >
            + 添加课程
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 py-0 sm:items-start sm:py-8">
          <div className="my-0 max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-4 safe-bottom sm:my-8 sm:rounded-xl sm:p-6">
            <h2 className="mb-4 text-xl font-bold">{editingCourse ? '编辑课程' : '添加课程'}</h2>
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 sm:pr-2">
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

                {/* 演示视频与图片 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium mb-2">演示视频</label>
                  <FileUploader
                    accept="video/mp4,video/webm,video/ogg"
                    label="上传演示视频"
                    preview={formData.demoVideo}
                    onChange={(url) => setFormData({ ...formData, demoVideo: url })}
                  />
                  <input
                    type="url"
                    value={formData.demoVideo}
                    onChange={(e) => setFormData({ ...formData, demoVideo: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-2"
                    placeholder="也可以直接粘贴视频 URL"
                  />

                  <label className="block text-sm font-medium mt-4 mb-2">演示图片</label>
                  <FileUploader
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    label="上传演示图片"
                    onChange={(url) => setFormData({ ...formData, demoImages: [...formData.demoImages, url] })}
                  />
                  {formData.demoImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {formData.demoImages.map((image, i) => (
                        <div key={`${image}-${i}`} className="relative">
                          <img
                            src={image.startsWith('http') ? image : `${API_ORIGIN}${image}`}
                            alt={`演示图片 ${i + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeDemoImage(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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