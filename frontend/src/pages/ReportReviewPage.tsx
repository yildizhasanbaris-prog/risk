import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  UNDER_REVIEW: 'İncelemede',
  NOT_SAFETY_RELATED: 'SMS Kapsamı Dışı',
  HIRM_REQUIRED: 'HIRM Gerekli',
  IN_HIRM: 'HIRM Yapılıyor',
  ACTION_PLANNING: 'Aksiyon Planlanıyor',
  ACTION_IN_PROGRESS: 'Aksiyon Uygulanıyor',
  PENDING_EFFECTIVENESS_CHECK: 'Etkililik Kontrolü Bekleniyor',
  CLOSED: 'Kapatıldı',
};

export function ReportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reportId = parseInt(id ?? '0', 10);

  const [isSafetyRelated, setIsSafetyRelated] = useState(false);
  const [isMor, setIsMor] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [closureSummary, setClosureSummary] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  useEffect(() => {
    if (report) {
      setIsSafetyRelated(report.isSafetyRelated ?? false);
      setIsMor(report.isMor ?? false);
      setClosureSummary((report as { closureSummary?: string }).closureSummary ?? '');
    }
  }, [report]);

  const reviewMutation = useMutation({
    mutationFn: (data: Parameters<typeof reportsApi.review>[1]) => reportsApi.review(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${reportId}`);
    },
  });

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Parameters<typeof reportsApi.review>[1] = {
      isSafetyRelated,
      isMor,
      comment: comment || undefined,
      closureSummary: closureSummary || undefined,
    };
    if (newStatus) data.status = newStatus;
    reviewMutation.mutate(data);
  };

  const handleResetForm = () => {
    if (report) {
      setIsSafetyRelated(report.isSafetyRelated ?? false);
      setIsMor(report.isMor ?? false);
      setNewStatus('');
      setComment('');
    }
  };

  if (isLoading || !report) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
      </div>
    );
  }

  const allowed = report.allowedStatuses ?? [];

  return (
    <div className="page">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ margin: 0 }}>Rapor İnceleme: {report.reportNo ?? report.id}</h1>
        <Link to={`/reports/${reportId}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          ← Detaya Dön
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>{report.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{report.description ?? '-'}</p>
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text)' }}>
          <strong>Mevcut durum:</strong> {STATUS_LABELS[report.status] ?? report.status}
        </p>
      </div>

      <form onSubmit={handleSaveReview}>
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>SMS / QA Kararları</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={isSafetyRelated}
                onChange={(e) => setIsSafetyRelated(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>SMS kapsamına giriyor</span>
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={isMor}
                onChange={(e) => setIsMor(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>MOR (Mandatory Occurrence Report) adayı</span>
            </label>
          </div>
          {isMor && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              MOR işaretlendiğinde 72 saatlik süre otomatik hesaplanır.
            </p>
          )}
        </div>

        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Durum Değiştir</h3>
          <div style={{ marginBottom: 20 }}>
            <label>Yeni durum</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">-- Değiştirme --</option>
              {allowed.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
            {allowed.length === 0 && (
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Bu durumda ({STATUS_LABELS[report.status] ?? report.status}) değişiklik yapılamaz.
              </p>
            )}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Açıklama (opsiyonel)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </div>
          {(allowed.includes('CLOSED') || report.status === 'PENDING_EFFECTIVENESS_CHECK') && (
            <div style={{ marginBottom: 0 }}>
              <label>Kapanış Özeti (CLOSED için)</label>
              <textarea value={closureSummary} onChange={(e) => setClosureSummary(e.target.value)} rows={3} placeholder="Lesson learned, kapanış notu..." />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={reviewMutation.isPending} className="btn">
            {reviewMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button type="button" onClick={handleResetForm} className="btn btn-secondary">
            Formu Sıfırla
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            İptal
          </button>
        </div>
        {reviewMutation.isError && (
          <p style={{
            color: 'var(--color-danger)',
            marginTop: 16,
            padding: 12,
            background: '#fef2f2',
            borderRadius: 'var(--radius-sm)',
          }}>
            {(reviewMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata'}
          </p>
        )}
      </form>
    </div>
  );
}
