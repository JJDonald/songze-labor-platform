import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Container } from '@/features/shared';
import { useUserStore } from '@/features/auth';
import { achievementsApi } from '@/features/achievements/api';
import { API_ORIGIN } from '@/lib/api';
import { cn } from '@/features/shared/lib';
import { api } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  emoji: string;
  taskGroupId: string;
}

interface Step {
  id: number;
  title: string;
}

const steps: Step[] = [
  { id: 1, title: '填写成果' },
  { id: 2, title: '上传图片' },
  { id: 3, title: '自我评价' },
  { id: 4, title: '确认提交' },
];

export const SubmitPage = () => {
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.currentUser);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reflection, setReflection] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [evalAttitude, setEvalAttitude] = useState(0);
  const [evalSkill, setEvalSkill] = useState(0);
  const [evalResult, setEvalResult] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get<Course[]>('/courses');
      if (response.code === 0 && response.data) {
        setCourses(response.data);
      }
    } catch (e) {
      console.error('Failed to fetch courses');
    }
  };

  if (!currentUser) {
    return (
      <Container className="py-12">
        <div className="text-center text-text-muted">请先登录</div>
      </Container>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await achievementsApi.uploadImage(file);
    if (url) {
      setImages([...images, url]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const success = await achievementsApi.create({
      title,
      description,
      reflection,
      images,
      isPublic,
      evalAttitude,
      evalSkill,
      evalResult,
      courseId,
      courseTitle,
    });

    setIsSubmitting(false);
    
    if (success) {
      setSubmitSuccess(true);
    }
  };

  const renderStars = (value: number, onChange: (v: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={cn(
            'text-2xl cursor-pointer transition-transform hover:scale-110',
            star <= value ? 'text-brand-yellow' : 'text-gray-300'
          )}
        >
          ★
        </button>
      ))}
    </div>
  );

  if (submitSuccess) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-display text-3xl mb-2">成果提交成功！</h1>
          <p className="text-text-muted mb-6">你的劳动成果已经提交，快去看看吧！</p>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" onClick={() => navigate('/achievements')}>
              查看成果墙
            </Button>
            <Button variant="ghost" onClick={() => navigate('/profile')}>
              我的档案
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="font-display text-3xl mb-1">✍️ 提交劳动成果</h1>
      <p className="text-text-muted text-sm mb-6">记录你的劳动过程和成果</p>

      {/* 步骤指示器 */}
      <div className="flex items-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  currentStep === step.id
                    ? 'bg-brand-orange text-white'
                    : currentStep > step.id
                    ? 'bg-brand-green text-white'
                    : 'bg-brand-sand text-text-muted'
                )}
              >
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <span className="text-xs text-text-muted mt-1">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  currentStep > step.id ? 'bg-brand-green' : 'bg-brand-sand'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* 表单内容 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* 劳动项目选择 */}
            <div>
              <label className="block text-sm font-semibold mb-2">选择劳动项目</label>
              <select
                value={courseId}
                onChange={(e) => {
                  const selected = courses.find(c => c.id === e.target.value);
                  setCourseId(e.target.value);
                  setCourseTitle(selected?.title || '');
                }}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white"
              >
                <option value="">请选择劳动项目（可选）</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.emoji} {course.title}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="成果标题"
              placeholder="给你的成果起个名字"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <label className="block text-sm font-semibold mb-2">成果描述</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
                rows={4}
                placeholder="描述一下你的劳动过程、遇到的困难、学到的东西..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">心得体会（选填）</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream font-body text-sm text-text outline-none transition-colors focus:border-brand-green focus:bg-white resize-none"
                rows={3}
                placeholder="这次劳动让你有什么感想？"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">上传照片（选填，最多5张）</label>
              <div className="border-2 border-dashed border-brand-sand rounded-xl p-8 text-center bg-brand-cream">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={images.length >= 5}
                />
                <label htmlFor="image-upload" className={images.length >= 5 ? 'cursor-not-allowed' : 'cursor-pointer'}>
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm text-text-muted">
                    {images.length >= 5 ? '已达到最大数量' : '点击上传照片'}
                    <br />
                    <span className="text-brand-green font-semibold">支持 JPG / PNG，每张不超过 5MB</span>
                  </div>
                </label>
              </div>
            </div>

            {images.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-2">已上传照片</label>
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
src={`${API_ORIGIN}${img}`}
                        alt={`照片 ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg bg-brand-sand"
                      />
                      <button
                        onClick={() => setImages(images.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">是否公开展示</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <span className="text-sm">公开（展示在成果墙上）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <span className="text-sm">仅自己可见</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-text-muted">
              认真地给自己的这次劳动打个分吧！诚实的评价能帮助你更好地进步。
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">劳动态度</span>
                  {renderStars(evalAttitude, setEvalAttitude)}
                </div>
                <p className="text-xs text-text-muted">
                  {evalAttitude === 0 && '点击星星评分'}
                  {evalAttitude === 1 && '继续加油！'}
                  {evalAttitude === 2 && '还不错哦~'}
                  {evalAttitude === 3 && '做得挺好！'}
                  {evalAttitude === 4 && '非常棒！'}
                  {evalAttitude === 5 && '超级棒！👏'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">劳动技能</span>
                  {renderStars(evalSkill, setEvalSkill)}
                </div>
                <p className="text-xs text-text-muted">
                  {evalSkill === 0 && '点击星星评分'}
                  {evalSkill === 1 && '继续加油！'}
                  {evalSkill === 2 && '还不错哦~'}
                  {evalSkill === 3 && '做得挺好！'}
                  {evalSkill === 4 && '非常棒！'}
                  {evalSkill === 5 && '超级棒！👏'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">劳动成果</span>
                  {renderStars(evalResult, setEvalResult)}
                </div>
                <p className="text-xs text-text-muted">
                  {evalResult === 0 && '点击星星评分'}
                  {evalResult === 1 && '继续加油！'}
                  {evalResult === 2 && '还不错哦~'}
                  {evalResult === 3 && '做得挺好！'}
                  {evalResult === 4 && '非常棒！'}
                  {evalResult === 5 && '超级棒！👏'}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="font-display text-xl">确认提交</h3>

            {courseTitle && (
              <div className="bg-brand-cream rounded-xl p-4">
                <div className="text-xs text-text-muted mb-1">劳动项目</div>
                <div className="font-semibold">{courseTitle}</div>
              </div>
            )}

            <div className="bg-brand-cream rounded-xl p-4">
              <div className="text-xs text-text-muted mb-1">成果标题</div>
              <div className="font-semibold">{title || '（未填写）'}</div>
            </div>

            <div className="bg-brand-cream rounded-xl p-4">
              <div className="text-xs text-text-muted mb-1">成果描述</div>
              <div className="text-sm">{description || '（未填写）'}</div>
            </div>

            {images.length > 0 && (
              <div className="bg-brand-cream rounded-xl p-4">
                <div className="text-xs text-text-muted mb-2">照片（{images.length}张）</div>
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, index) => (
                    <img
                      key={index}
                      src={`${API_ORIGIN}${img}`}
                      alt={`照片 ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-brand-cream rounded-xl p-4">
              <div className="text-xs text-text-muted mb-2">自我评价</div>
              <div className="flex gap-6 text-sm">
                <span>态度 {'★'.repeat(evalAttitude)}{'☆'.repeat(5 - evalAttitude)}</span>
                <span>技能 {'★'.repeat(evalSkill)}{'☆'.repeat(5 - evalSkill)}</span>
                <span>成果 {'★'.repeat(evalResult)}{'☆'.repeat(5 - evalResult)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            上一步
          </Button>
          
          {currentStep < 4 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button
              variant="orange"
              onClick={handleSubmit}
              disabled={isSubmitting || !title || !description}
            >
              {isSubmitting ? '提交中...' : '🎉 提交成果'}
            </Button>
          )}
        </div>
      </div>
    </Container>
  );
};