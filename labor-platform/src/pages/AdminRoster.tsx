import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileDown,
  FileUp,
  Inbox,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { adminApi } from '@/features/admin/api/adminApi';
import type {
  RegistrationMode,
  RosterImportPreview,
  RosterImportRow,
  RosterImportSummary,
  RosterItem,
  RosterStatusFilter,
} from '@/features/admin/api/adminApi';
import { Button, Modal } from '@/features/shared/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/features/shared/lib';

const PAGE_SIZE = 10;
const PREVIEW_ROW_LIMIT = 300;

const MODE_OPTIONS: { value: RegistrationMode; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'OPEN', label: '开放注册', description: '任何学生均可直接注册', icon: UserPlus },
  { value: 'ROSTER_ONLY', label: '仅名册注册', description: '名册内学生可注册，需填写真实姓名', icon: ClipboardList },
  { value: 'CLOSED', label: '关闭注册', description: '暂停新用户注册', icon: ShieldAlert },
];

const STATUS_OPTIONS: { value: RosterStatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'claimed', label: '已认领' },
  { value: 'unclaimed', label: '未认领' },
];

const actionMeta: Record<RosterImportRow['action'], { label: string; className: string }> = {
  create: { label: '新增', className: 'bg-blue-100 text-blue-700' },
  update: { label: '更新', className: 'bg-orange-100 text-orange-700' },
  claimed: { label: '已被认领', className: 'bg-yellow-100 text-yellow-800' },
  existingStudent: { label: '关联已注册', className: 'bg-purple-100 text-purple-700' },
  error: { label: '错误', className: 'bg-red-100 text-red-700' },
};

const getRowNumber = (row: RosterImportRow): number => row.rowNumber ?? row.row ?? 0;

export const AdminRoster = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gradeId, setGradeId] = useState<number | ''>('');
  const [classCode, setClassCode] = useState('');
  const [status, setStatus] = useState<RosterStatusFilter>('all');

  const [templateLoading, setTemplateLoading] = useState(false);
  const [modeError, setModeError] = useState('');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [importAborted, setImportAborted] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<RosterImportSummary | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const settingsQuery = useQuery({
    queryKey: ['auth', 'registration-settings'],
    queryFn: adminApi.getRegistrationSettings,
  });

  const gradesQuery = useQuery({
    queryKey: ['admin', 'grades'],
    queryFn: adminApi.getGrades,
  });

  const rosterQuery = useQuery({
    queryKey: ['admin', 'roster', { page, pageSize: PAGE_SIZE, search: debouncedSearch, gradeId, classCode, status }],
    queryFn: () =>
      adminApi.getRoster({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        gradeId: gradeId === '' ? undefined : gradeId,
        classCode: classCode.trim() || undefined,
        status,
      }),
  });

  const updateModeMutation = useMutation({
    mutationFn: (mode: RegistrationMode) => adminApi.updateRegistrationSettings({ mode }),
    onSuccess: () => {
      setModeError('');
      queryClient.invalidateQueries({ queryKey: ['auth', 'registration-settings'] });
    },
    onError: (error) => setModeError(error instanceof Error ? error.message : '更新注册模式失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteRosterItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roster'] });
      if (page > 1 && (rosterQuery.data?.data.data.length ?? 0) <= 1) {
        setPage((value) => value - 1);
      }
    },
    onError: (error) => alert(error instanceof Error ? error.message : '删除失败'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importRoster(file),
    onSuccess: async (response) => {
      setImportResult(response.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'roster'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
    },
    onError: async (error) => {
      // 服务端对含错误行的导入返回 400 并携带 data（预检结果），此时展示明细
      if (error instanceof ApiError && error.code === 400 && error.data && typeof error.data === 'object') {
        const data = error.data as Partial<RosterImportPreview>;
        if (data.summary || Array.isArray(data.rows)) {
          setPreview({
            summary: data.summary ?? { total: 0, create: 0, update: 0, claimed: 0, existingStudent: 0, errors: 1 },
            rows: Array.isArray(data.rows) ? data.rows : [],
          });
          setImportAborted(error.message);
          return;
        }
      }
      setPreviewError(error instanceof Error ? error.message : '导入失败，请稍后重试');
      setImportResult(null);
      setPickedFile(null);
    },
  });

  const currentMode = settingsQuery.data?.data.mode ?? 'OPEN';
  const grades = gradesQuery.data?.data ?? [];
  const gradeMap = new Map(grades.map((grade) => [grade.id, grade.name]));
  const roster = rosterQuery.data?.data;
  const items = roster?.data ?? [];
  // 服务端未返回 stats 时，基于当前页数据计算（仅作参考值）
  const claimedCount = roster?.stats?.claimed ?? items.filter((item) => item.claimedStudent).length;
  const unclaimedCount = roster?.stats?.unclaimed ?? items.length - claimedCount;
  const hasFilters =
    debouncedSearch.trim() !== '' || gradeId !== '' || classCode.trim() !== '' || status !== 'all';

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFilePicked(file);
    }
    event.target.value = '';
  };

  const handleFilePicked = async (file: File) => {
    setPreviewError('');
    setImportResult(null);
    setImportAborted(null);
    setPickedFile(file);
    setPreview(null);
    setPreviewOpen(true);
    try {
      const response = await adminApi.previewRosterImport(file);
      setPreview(response.data);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : '文件解析失败，请检查文件格式');
      setPickedFile(null);
    }
  };

  const closePreview = () => {
    if (importMutation.isPending) return;
    setPreviewOpen(false);
    setPickedFile(null);
    setPreview(null);
    setPreviewError('');
    setImportAborted(null);
    setImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      await adminApi.downloadRosterTemplate();
    } catch (error) {
      alert(error instanceof Error ? error.message : '模板下载失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleDelete = (item: RosterItem) => {
    if (confirm(`确定要删除名册记录「${item.name}（${item.studentId}）」吗？`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const statCards = [
    { label: '名册总数', value: roster?.stats?.total ?? items.length, icon: Users, iconBg: 'bg-blue-50 text-blue-600' },
    { label: '已认领', value: claimedCount, icon: CheckCircle2, iconBg: 'bg-green-50 text-brand-green' },
    { label: '未认领', value: unclaimedCount, icon: Clock, iconBg: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">学生名册</h1>
            <p className="mt-1 text-sm text-gray-600">维护可注册学生名单，并控制平台注册模式</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => void handleDownloadTemplate()} disabled={templateLoading}>
              <FileDown size={16} />
              {templateLoading ? '下载中...' : '下载模板'}
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={16} />
              导入名册
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Registration mode control */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold sm:text-lg">注册模式</h2>
              <p className="mt-0.5 text-sm text-gray-500">控制注册入口的开放方式，切换后立即生效</p>
            </div>
            <span className="rounded-full bg-brand-green-pale px-3 py-1 text-xs font-semibold text-brand-green">
              当前：{settingsQuery.isError
                ? '未知（加载失败）'
                : MODE_OPTIONS.find((option) => option.value === currentMode)?.label ?? currentMode}
            </span>
          </div>

          {settingsQuery.isError && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <span>注册模式加载失败，上方显示的模式可能不准确，请重试</span>
              <button type="button" onClick={() => void settingsQuery.refetch()} className="shrink-0 font-semibold underline">
                重试
              </button>
            </div>
          )}

          {modeError && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <span>{modeError}</span>
              <button type="button" onClick={() => setModeError('')} className="shrink-0 font-semibold underline">
                关闭
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = currentMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateModeMutation.mutate(option.value)}
                  disabled={updateModeMutation.isPending}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                    active
                      ? 'border-brand-green bg-brand-green-pale/60 shadow-sm'
                      : 'border-brand-sand bg-white hover:border-brand-green-light',
                    updateModeMutation.isPending && 'cursor-wait opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      active ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-text">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{option.description}</span>
                  </span>
                  {active && <CheckCircle2 size={18} className="ml-auto mt-1 shrink-0 text-brand-green" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm sm:p-5">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', stat.iconBg)}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-xl font-bold sm:text-2xl">{stat.value}</div>
                  <div className="truncate text-xs text-gray-500 sm:text-sm">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="搜索学籍号或姓名"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-green"
            />
          </div>
          <select
            value={gradeId}
            onChange={(event) => {
              setGradeId(event.target.value === '' ? '' : Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          >
            <option value="">全部年级</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={classCode}
            onChange={(event) => {
              setClassCode(event.target.value);
              setPage(1);
            }}
            placeholder="班级，如 1班"
            className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green sm:w-32"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as RosterStatusFilter);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setGradeId('');
                setClassCode('');
                setStatus('all');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={14} />
              清空筛选
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {rosterQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-gray-500">正在加载名册...</div>
          ) : rosterQuery.isError ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-sm text-red-600">
                {rosterQuery.error instanceof Error ? rosterQuery.error.message : '加载名册失败'}
              </p>
              <Button variant="ghost" size="sm" onClick={() => rosterQuery.refetch()}>
                重新加载
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">{hasFilters ? '没有符合条件的名册记录' : '名册为空，请先导入学生名册'}</p>
            </div>
          ) : (
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-gray-50 text-sm text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">学籍号</th>
                    <th className="px-4 py-3 text-left">姓名</th>
                    <th className="px-4 py-3 text-left">年级</th>
                    <th className="px-4 py-3 text-left">班级</th>
                    <th className="px-4 py-3 text-left">认领状态</th>
                    <th className="px-4 py-3 text-left">认领时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.studentId}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-sm">{gradeMap.get(item.gradeId) ?? `年级 ${item.gradeId}`}</td>
                      <td className="px-4 py-3 text-sm">{item.classCode}</td>
                      <td className="px-4 py-3">
                        {item.claimedStudent ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                              已认领
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.claimedStudent.nickname} · {item.claimedStudent.studentId}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            未认领
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.claimedAt ? new Date(item.claimedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!item.claimedStudent && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!rosterQuery.isLoading && !rosterQuery.isError && items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-gray-500">
                第 {roster?.page ?? 1} / {roster?.totalPages ?? 1} 页 · 共 {roster?.total ?? 0} 条
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1 || rosterQuery.isFetching}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft size={16} />
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={(roster?.totalPages ?? 1) <= page || rosterQuery.isFetching}
                  onClick={() => setPage((value) => value + 1)}
                >
                  下一页
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import preview modal */}
      <Modal
        isOpen={previewOpen}
        onClose={importMutation.isPending ? undefined : closePreview}
        title="导入名册预检"
        className="max-w-3xl"
      >
        {previewError ? (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-700">文件预检失败</p>
                <p className="mt-1 text-sm text-red-600">{previewError}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" size="sm" onClick={closePreview}>
                关闭
              </Button>
            </div>
          </>
        ) : importResult ? (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-700">导入完成</p>
                <p className="mt-1 text-sm text-green-700">
                  新增 {importResult.create} 条，更新 {importResult.update} 条
                  {importResult.existingStudent > 0 ? `，关联已注册学生 ${importResult.existingStudent} 条` : ''}
                  {importResult.claimed > 0 ? `，跳过已认领 ${importResult.claimed} 条` : ''}
                  {importResult.errors > 0 ? `，失败 ${importResult.errors} 行` : ''}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="sm" onClick={closePreview}>
                完成
              </Button>
            </div>
          </>
        ) : preview === null ? (
          <div className="py-12 text-center text-sm text-gray-500">
            {importMutation.isPending ? '正在导入...' : '正在解析文件...'}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: '共读取', value: preview.summary.total, className: 'bg-gray-100 text-gray-700' },
                { label: '新增', value: preview.summary.create, className: 'bg-blue-100 text-blue-700' },
                { label: '更新', value: preview.summary.update, className: 'bg-orange-100 text-orange-700' },
                { label: '关联已注册', value: preview.summary.existingStudent, className: 'bg-purple-100 text-purple-700' },
                { label: '跳过已认领', value: preview.summary.claimed, className: 'bg-yellow-100 text-yellow-800' },
                { label: '错误', value: preview.summary.errors, className: 'bg-red-100 text-red-700' },
              ].map((chip) => (
                <div key={chip.label} className={cn('rounded-lg px-3 py-2 text-center', chip.className)}>
                  <div className="text-lg font-bold leading-tight">{chip.value}</div>
                  <div className="text-xs">{chip.label}</div>
                </div>
              ))}
            </div>

            {importAborted && (
              <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {importAborted}，本次未写入任何数据，请修正错误行后重新导入。
              </div>
            )}

            {preview.summary.errors > 0 && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                有 {preview.summary.errors} 行数据存在错误，错误行不会导入，请修正后重新上传。
              </div>
            )}

            <div className="table-scroll max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600">行号</th>
                    <th className="px-3 py-2 text-left text-gray-600">学籍号</th>
                    <th className="px-3 py-2 text-left text-gray-600">姓名</th>
                    <th className="px-3 py-2 text-left text-gray-600">年级</th>
                    <th className="px-3 py-2 text-left text-gray-600">班级</th>
                    <th className="px-3 py-2 text-left text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                    <tr key={`${getRowNumber(row)}-${row.studentId}`} className={cn('border-t', row.action === 'error' && 'bg-red-50')}>
                      <td className="px-3 py-2 text-gray-500">{getRowNumber(row)}</td>
                      <td className="px-3 py-2">{row.studentId}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.gradeName || row.gradeId || '—'}</td>
                      <td className="px-3 py-2">{row.classCode}</td>
                      <td className="px-3 py-2">
                        {row.action === 'error' ? (
                          <span className="text-xs font-medium text-red-600">{row.error || '数据错误'}</span>
                        ) : (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              actionMeta[row.action].className
                            )}
                          >
                            {actionMeta[row.action].label}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > PREVIEW_ROW_LIMIT && (
              <p className="mt-2 text-xs text-gray-500">
                文件共 {preview.rows.length} 行，仅展示前 {PREVIEW_ROW_LIMIT} 行。
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="max-w-[40%] truncate text-xs text-gray-500">文件名：{pickedFile?.name}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={importMutation.isPending} onClick={closePreview}>
                  {importAborted ? '关闭' : '取消'}
                </Button>
                <Button
                  size="sm"
                  disabled={importMutation.isPending || preview.summary.total === 0 || Boolean(importAborted)}
                  onClick={() => {
                    if (pickedFile) {
                      importMutation.mutate(pickedFile);
                    }
                  }}
                >
                  <FileUp size={15} />
                  {importMutation.isPending
                    ? '导入中...'
                    : `确认导入（${preview.summary.create + preview.summary.update + preview.summary.existingStudent} 条）`}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
