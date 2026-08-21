import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AchievementReviewModal } from '@/features/admin/components/AchievementReviewModal';
import { adminApi } from '@/features/admin/api/adminApi';
import type {
  AchievementReviewInput,
  AchievementReviewStatus,
  AdminAchievement,
  AdminAchievementPage,
  BatchAchievementReviewInput,
} from '@/features/admin/api/adminApi';
import { Button, Modal } from '@/features/shared/components/ui';
import { ApiError } from '@/lib/api';

type StatusFilter = AchievementReviewStatus | 'ALL';

const PAGE_SIZE = 10;
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'ALL', label: '全部' },
];

const statusMeta: Record<AchievementReviewStatus, { label: string; className: string }> = {
  PENDING: { label: '待审核', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '已通过', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: '已驳回', className: 'bg-red-100 text-red-700' },
};

const getStatus = (achievement: AdminAchievement): AchievementReviewStatus => achievement.reviewStatus || 'PENDING';

const normalizePage = (
  payload: AdminAchievementPage | AdminAchievement[] | undefined,
  status: StatusFilter,
  page: number,
): AdminAchievementPage => {
  if (Array.isArray(payload)) {
    const filtered = status === 'ALL' ? payload : payload.filter((item) => getStatus(item) === status);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    return {
      data: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
    };
  }

  return {
    data: payload?.data || [],
    total: payload?.total || 0,
    page: payload?.page || page,
    pageSize: payload?.pageSize || PAGE_SIZE,
    totalPages: Math.max(1, payload?.totalPages || 1),
  };
};

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError && error.code === 409) return '该成果已被其他管理员处理，列表已刷新。';
  return error instanceof Error ? error.message : fallback;
};

export const AdminAchievements = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailAchievement, setDetailAchievement] = useState<AdminAchievement | null>(null);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchReason, setBatchReason] = useState('');
  const [actionError, setActionError] = useState('');

  const achievementsQuery = useQuery({
    queryKey: ['admin', 'achievements', { status, page, pageSize: PAGE_SIZE }],
    queryFn: () => adminApi.getAchievements({
      status: status === 'ALL' ? undefined : status,
      page,
      pageSize: PAGE_SIZE,
    }),
  });

  const result = useMemo(
    () => normalizePage(achievementsQuery.data?.data, status, page),
    [achievementsQuery.data?.data, page, status],
  );
  const currentIds = result.data.map((achievement) => achievement.id);
  const allCurrentSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id));

  const refreshRelatedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      queryClient.invalidateQueries({ queryKey: ['achievements'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ]);
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AchievementReviewInput }) =>
      adminApi.reviewAchievement(id, input),
    onMutate: () => setActionError(''),
    onSuccess: async () => {
      const shouldMoveBack = page > 1 && result.data.length <= 1;
      setDetailAchievement(null);
      setSelectedIds(new Set());
      if (shouldMoveBack) setPage((value) => value - 1);
      await refreshRelatedQueries();
    },
    onError: async (error) => {
      setActionError(errorMessage(error, '审核失败，请稍后重试。'));
      if (error instanceof ApiError && error.code === 409) {
        setDetailAchievement(null);
        setSelectedIds(new Set());
        await refreshRelatedQueries();
      }
    },
  });

  const batchMutation = useMutation({
    mutationFn: (input: BatchAchievementReviewInput) => adminApi.batchReviewAchievements(input),
    onMutate: () => setActionError(''),
    onSuccess: async () => {
      const shouldMoveBack = page > 1 && selectedIds.size >= result.data.length;
      setBatchRejectOpen(false);
      setBatchReason('');
      setSelectedIds(new Set());
      if (shouldMoveBack) setPage((value) => value - 1);
      await refreshRelatedQueries();
    },
    onError: async (error) => {
      setActionError(errorMessage(error, '批量审核失败，请稍后重试。'));
      if (error instanceof ApiError && error.code === 409) {
        setBatchRejectOpen(false);
        setSelectedIds(new Set());
        await refreshRelatedQueries();
      }
    },
  });

  const toggleAllCurrent = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allCurrentSelected) currentIds.forEach((id) => next.delete(id));
      else currentIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selected = Array.from(selectedIds);
  const selectedItems = result.data
    .filter((achievement) => selectedIds.has(achievement.id))
    .map((achievement) => ({ id: achievement.id, expectedUpdatedAt: achievement.updatedAt }));
  const isMutating = reviewMutation.isPending || batchMutation.isPending;
  const batchReasonTrimmed = batchReason.trim();

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">成果审核</h1>
            <p className="mt-1 text-sm text-gray-600">共 {result.total} 条{statusOptions.find((item) => item.value === status)?.label}成果</p>
          </div>
          <label className="text-sm font-semibold text-gray-700">
            审核状态
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
                setSelectedIds(new Set());
                setActionError('');
              }}
              className="ml-2 rounded-lg border bg-white px-3 py-2 font-normal outline-none focus:border-brand-green"
            >
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {actionError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{actionError}</span>
            <button type="button" className="font-semibold underline" onClick={() => setActionError('')}>关闭</button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-semibold">已选择当前页 {selected.length} 条</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="orange"
                disabled={isMutating}
                onClick={() => {
                  setBatchReason('');
                  setBatchRejectOpen(true);
                }}
              >批量驳回</Button>
              <Button
                size="sm"
                disabled={isMutating}
                onClick={() => batchMutation.mutate({ items: selectedItems, status: 'APPROVED' })}
              >{batchMutation.isPending ? '处理中...' : '批量通过'}</Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {achievementsQuery.isLoading ? (
            <div className="py-16 text-center text-gray-500">正在加载审核队列...</div>
          ) : achievementsQuery.isError ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-red-600">{errorMessage(achievementsQuery.error, '加载审核队列失败。')}</p>
              <Button variant="ghost" onClick={() => achievementsQuery.refetch()}>重新加载</Button>
            </div>
          ) : result.data.length === 0 ? (
            <div className="py-16 text-center text-gray-500">当前筛选条件下没有成果</div>
          ) : (
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 text-sm text-gray-700">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input aria-label="选择当前页全部成果" type="checkbox" checked={allCurrentSelected} onChange={toggleAllCurrent} />
                    </th>
                    <th className="px-4 py-3 text-left">成果</th>
                    <th className="px-4 py-3 text-left">提交人</th>
                    <th className="px-4 py-3 text-left">课程</th>
                    <th className="px-4 py-3 text-left">公开意愿</th>
                    <th className="px-4 py-3 text-left">状态</th>
                    <th className="px-4 py-3 text-left">提交时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((achievement) => {
                    const itemStatus = getStatus(achievement);
                    return (
                      <tr key={achievement.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            aria-label={`选择成果 ${achievement.title}`}
                            type="checkbox"
                            checked={selectedIds.has(achievement.id)}
                            onChange={() => toggleOne(achievement.id)}
                          />
                        </td>
                        <td className="max-w-xs px-4 py-3">
                          <button type="button" onClick={() => setDetailAchievement(achievement)} className="text-left font-semibold text-brand-green hover:underline">
                            {achievement.title}
                          </button>
                          <p className="mt-1 truncate text-sm text-gray-500">{achievement.description || '无描述'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{achievement.student?.nickname || '未知'}</div>
                          <div className="text-gray-500">{achievement.student?.studentId || '无学号'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{achievement.course?.title || '未关联'}</td>
                        <td className="px-4 py-3 text-sm">{achievement.isPublic ? '愿意公开' : '不公开'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta[itemStatus].className}`}>
                            {statusMeta[itemStatus].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(achievement.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setDetailAchievement(achievement)}>查看详情</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!achievementsQuery.isLoading && !achievementsQuery.isError && result.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-gray-500">第 {result.page} / {result.totalPages} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page <= 1 || achievementsQuery.isFetching} onClick={() => {
                  setPage((value) => value - 1);
                  setSelectedIds(new Set());
                  setActionError('');
                }}>上一页</Button>
                <Button size="sm" variant="ghost" disabled={page >= result.totalPages || achievementsQuery.isFetching} onClick={() => {
                  setPage((value) => value + 1);
                  setSelectedIds(new Set());
                  setActionError('');
                }}>下一页</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {detailAchievement && (
        <AchievementReviewModal
          key={detailAchievement.id}
          achievement={detailAchievement}
          isOpen
          isSubmitting={reviewMutation.isPending}
          error={actionError || undefined}
          onClose={() => {
            setDetailAchievement(null);
            setActionError('');
          }}
          onSubmit={(input) => reviewMutation.mutate({
            id: detailAchievement.id,
            input: { ...input, expectedUpdatedAt: detailAchievement.updatedAt },
          })}
        />
      )}

      <Modal
        isOpen={batchRejectOpen}
        onClose={batchMutation.isPending ? undefined : () => setBatchRejectOpen(false)}
        title={`批量驳回 ${selected.length} 条成果`}
      >
        <label htmlFor="batch-review-reason" className="mb-2 block text-sm font-semibold">驳回理由（5–500 字）</label>
        <textarea
          id="batch-review-reason"
          autoFocus
          rows={5}
          maxLength={500}
          value={batchReason}
          onChange={(event) => setBatchReason(event.target.value)}
          className="w-full resize-none rounded-lg border-2 border-brand-sand bg-brand-cream px-4 py-3 text-sm outline-none focus:border-brand-green focus:bg-white"
          placeholder="请填写适用于这些成果的统一驳回理由"
        />
        <div className={`mt-1 text-right text-xs ${batchReasonTrimmed.length > 0 && batchReasonTrimmed.length < 5 ? 'text-red-600' : 'text-gray-500'}`}>
          {batchReason.length}/500
        </div>
        {actionError && <div role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" disabled={batchMutation.isPending} onClick={() => setBatchRejectOpen(false)}>取消</Button>
          <Button
            variant="orange"
            disabled={batchMutation.isPending || batchReasonTrimmed.length < 5 || batchReasonTrimmed.length > 500}
            onClick={() => batchMutation.mutate({ items: selectedItems, status: 'REJECTED', reviewComment: batchReasonTrimmed })}
          >{batchMutation.isPending ? '处理中...' : '确认驳回'}</Button>
        </div>
      </Modal>
    </div>
  );
};
