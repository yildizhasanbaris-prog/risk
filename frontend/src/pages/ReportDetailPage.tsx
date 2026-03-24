import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { attachmentsApi } from '../api/attachments';
import { useAuth } from '../contexts/AuthContext';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reportId = parseInt(id ?? '0', 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['report', reportId, 'attachments'],
    queryFn: () => attachmentsApi.list(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(reportId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report', reportId, 'attachments'] }),
  });

  const morDeadline = (report as { morDeadline?: string })?.morDeadline;
  const morDeadlineMs = morDeadline ? new Date(morDeadline).getTime() : 0;
  const in24h = Date.now() + 24 * 60 * 60 * 1000;
  const morWarning = report?.isMor && morDeadline && morDeadlineMs > Date.now() && morDeadlineMs < in24h;

  const canReview = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  if (isLoading || !report) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>;
  }

  return (
    <>
      {morWarning && (
        <div style={{ marginBottom: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626' }}>
          <strong>MOR uyarısı:</strong> Son teslim tarihi yaklaşıyor ({morDeadline ? new Date(morDeadline).toLocaleString('tr-TR') : ''})
        </div>
      )}

      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Genel Bilgiler</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px 24px', margin: 0 }}>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Başlık</dt>
          <dd style={{ margin: 0 }}>{report.title}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Açıklama</dt>
          <dd style={{ margin: 0 }}>{report.description ?? '-'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Departman</dt>
          <dd style={{ margin: 0 }}>{report.department?.name ?? '-'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Konum</dt>
          <dd style={{ margin: 0 }}>{(report as { location?: string }).location ?? '-'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Kategori</dt>
          <dd style={{ margin: 0 }}>{report.category?.description ?? '-'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Raporlayan</dt>
          <dd style={{ margin: 0 }}>{report.reportedBy?.name ?? '-'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Tarih</dt>
          <dd style={{ margin: 0 }}>{new Date(report.createdAt).toLocaleString('tr-TR')}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Durum</dt>
          <dd style={{ margin: 0 }}><strong>{report.status}</strong></dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Risk Seviyesi</dt>
          <dd style={{ margin: 0 }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 600,
              background: report.currentRiskLevel === 'INTOLERABLE' ? '#fef2f2' : report.currentRiskLevel === 'TOLERABLE' ? '#fffbeb' : '#f0fdf4',
              color: report.currentRiskLevel === 'INTOLERABLE' ? '#dc2626' : report.currentRiskLevel === 'TOLERABLE' ? '#d97706' : '#059669',
            }}>
              {report.currentRiskLevel ?? '-'}
            </span>
          </dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>SMS Kapsamı</dt>
          <dd style={{ margin: 0 }}>{report.isSafetyRelated ? 'Evet' : 'Hayır'}</dd>
          <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>MOR</dt>
          <dd style={{ margin: 0 }}>{report.isMor ? 'Evet' : 'Hayır'}</dd>
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Ek Dosyalar</h3>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadMutation.mutate(f);
          e.target.value = '';
        }} />
        {canReview && (
          <button type="button" className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Yükleniyor...' : 'Dosya Ekle'}
          </button>
        )}
        {uploadMutation.isError && (
          <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
            İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
          </p>
        )}
        {attachments.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Henüz dosya yok.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {attachments.map((a) => (
              <li key={a.id} style={{ marginBottom: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => attachmentsApi.download(reportId, a.id, a.fileName)}>
                  {a.fileName}
                </button>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {a.uploader?.name} - {new Date(a.uploadedAt).toLocaleString('tr-TR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canReview && (
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          İnceleme, risk ve aksiyonlar için üstteki sekmeleri kullanın.
        </p>
      )}
    </>
  );
}
