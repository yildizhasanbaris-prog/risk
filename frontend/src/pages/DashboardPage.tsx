import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { complianceApi } from '../api/caseApi';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  UNDER_REVIEW: 'İncelemede',
  HIRM_REQUIRED: 'HIRM Gerekli',
  IN_HIRM: 'HIRM Yapılıyor',
  ACTION_PLANNING: 'Aksiyon Planlanıyor',
  ACTION_IN_PROGRESS: 'Aksiyon Uygulanıyor',
  PENDING_EFFECTIVENESS_CHECK: 'Etkililik Bekleniyor',
  CLOSED: 'Kapatıldı',
  NOT_SAFETY_RELATED: 'SMS Dışı',
};

interface DashboardStats {
  totalReports: number;
  openActions: number;
  byStatus: Record<string, number>;
  morAlerts?: { id: number; reportNo: string; title: string; morDeadline: string }[];
  monitoringBacklog?: number;
  pendingApprovals?: number;
  openHazards?: number;
  openHighRisks?: number;
  overdueMitigations?: number;
  averageClosureLeadDays?: number;
  hfRelatedOpen?: number;
  subcontractorRelatedOpen?: number;
  changeRelatedOpen?: number;
  mitigationEffectivenessPassRate?: number | null;
  riskTrendByMonth?: Record<string, number>;
}

interface LessonRow {
  id: number;
  title: string;
  summary: string;
  category?: string | null;
  promotedAt: string;
}

interface FindingRow {
  id: number;
  code: string;
  title: string;
  linkedReportId: number | null;
  safetyImpact?: boolean | null;
}

function isStaff(role: string | undefined) {
  return ['SafetyOfficer', 'Manager', 'Admin'].includes(role ?? '');
}

export function DashboardPage() {
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const qc = useQueryClient();
  const [srbIds, setSrbIds] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonCategory, setLessonCategory] = useState('');
  const [findingCode, setFindingCode] = useState('');
  const [findingTitle, setFindingTitle] = useState('');
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});
  const [srbDownloadError, setSrbDownloadError] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons-learned'],
    queryFn: () => api.get<LessonRow[]>('/dashboard/lessons-learned').then((r) => r.data),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['compliance-findings'],
    queryFn: () => complianceApi.listFindings() as Promise<FindingRow[]>,
    enabled: staff,
  });

  const promoteLesson = useMutation({
    mutationFn: () =>
      api.post('/dashboard/lessons-learned', {
        title: lessonTitle,
        summary: lessonSummary,
        category: lessonCategory || undefined,
      }),
    onSuccess: () => {
      setLessonTitle('');
      setLessonSummary('');
      setLessonCategory('');
      qc.invalidateQueries({ queryKey: ['lessons-learned'] });
    },
  });

  const createFinding = useMutation({
    mutationFn: () => complianceApi.createFinding({ code: findingCode, title: findingTitle }),
    onSuccess: () => {
      setFindingCode('');
      setFindingTitle('');
      qc.invalidateQueries({ queryKey: ['compliance-findings'] });
    },
  });

  const linkFinding = useMutation({
    mutationFn: ({ id, linkedReportId }: { id: number; linkedReportId: number | null }) =>
      complianceApi.linkFinding(id, linkedReportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-findings'] }),
  });

  const downloadSrb = async () => {
    setSrbDownloadError(false);
    try {
      const ids = srbIds
        .split(/[\s,]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      if (!ids.length) return;
      const { data: pack } = await api.get('/dashboard/srb-pack', { params: { ids: ids.join(',') } });
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `srb-pack-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSrbDownloadError(true);
    }
  };

  if (isLoading) return <div className="page"><p>Yükleniyor...</p></div>;

  const stats: DashboardStats = data ?? { totalReports: 0, openActions: 0, byStatus: {} };
  const total = stats.totalReports ?? 0;
  const openActions = stats.openActions ?? 0;
  const byStatus = stats.byStatus ?? {};
  const morAlerts = stats.morAlerts ?? [];
  const trend = stats.riskTrendByMonth ?? {};
  const trendKeys = Object.keys(trend).sort().slice(-12);

  return (
    <div className="page">
      <h1 style={{ marginBottom: 32 }}>Dashboard</h1>
      {morAlerts.length > 0 && (
        <div style={{ marginBottom: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)' }}>
          <h3 style={{ margin: '0 0 12px', color: '#dc2626' }}>MOR Uyarıları (24 saat içinde)</h3>
          {morAlerts.map((m: { id: number; reportNo: string; title: string; morDeadline: string }) => (
            <Link key={m.id} to={`/reports/${m.id}`} style={{ display: 'block', marginBottom: 8, color: '#dc2626' }}>
              {m.reportNo} - {m.title} ({m.morDeadline ? new Date(m.morDeadline).toLocaleString('tr-TR') : ''})
            </Link>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Toplam vaka</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{total}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Açık aksiyon</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{openActions}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Kayıtlı hazard</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.openHazards ?? 0}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Açık yüksek risk</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.openHighRisks ?? 0}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Geciken mitigasyon</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.overdueMitigations ?? 0}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>İzleme / etkililik kuyruğu</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.monitoringBacklog ?? 0}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Bekleyen onay</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.pendingApprovals ?? 0}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Ort. kapanış (gün)</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{stats.averageClosureLeadDays ?? '—'}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Etkinlik geçiş oranı</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>
            {stats.mitigationEffectivenessPassRate != null ? `${stats.mitigationEffectivenessPassRate}%` : '—'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ margin: '0 0 12px' }}>Özel kayıt sayıları</h4>
          <p style={{ margin: '4px 0', fontSize: 14 }}>HF / açık: <strong>{stats.hfRelatedOpen ?? 0}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 14 }}>Alt yüklenici / açık: <strong>{stats.subcontractorRelatedOpen ?? 0}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 14 }}>Değişiklik ilişkili / açık: <strong>{stats.changeRelatedOpen ?? 0}</strong></p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ margin: '0 0 12px' }}>Raporlama trendi (ay)</h4>
          {trendKeys.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Veri yok.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {trendKeys.map((k) => (
                <li key={k}>{k}: {trend[k]}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Duruma Göre</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(byStatus).map(([status, count]: [string, number]) => (
            <div key={status} style={{ padding: '12px 20px', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: 500 }}>{STATUS_LABELS[status] ?? status}:</span> {count}
            </div>
          ))}
        </div>
      </div>

      {staff && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>SRB paketi (JSON dışa aktarım)</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>Virgül veya boşlukla ayrılmış vaka ID’leri.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input
              style={{ flex: 1, minWidth: 200, padding: 8 }}
              placeholder="örn. 1, 2, 3"
              value={srbIds}
              onChange={(e) => setSrbIds(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={() => void downloadSrb()}>
              İndir
            </button>
          </div>
          {srbDownloadError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
              İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Öğrenilen dersler</h3>
        <ul style={{ margin: '0 0 16px', paddingLeft: 20, maxHeight: 220, overflow: 'auto' }}>
          {lessons.map((l) => (
            <li key={l.id} style={{ marginBottom: 8 }}>
              <strong>{l.title}</strong>
              {l.category && <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>({l.category})</span>}
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{l.summary}</div>
            </li>
          ))}
        </ul>
        {staff && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 12px' }}>Yeni ders kaydı</h4>
            <input style={{ width: '100%', marginBottom: 8, padding: 8 }} placeholder="Başlık" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            <textarea style={{ width: '100%', marginBottom: 8 }} placeholder="Özet" rows={3} value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} />
            <input style={{ width: '100%', marginBottom: 8, padding: 8 }} placeholder="Kategori (opsiyonel)" value={lessonCategory} onChange={(e) => setLessonCategory(e.target.value)} />
            <button type="button" className="btn" disabled={!lessonTitle.trim() || !lessonSummary.trim() || promoteLesson.isPending} onClick={() => promoteLesson.mutate()}>
              Kaydet
            </button>
            {promoteLesson.isError && (
              <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
                İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
              </p>
            )}
          </div>
        )}
      </div>

      {staff && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Uyumluluk bulguları → vaka bağlantısı</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12 }}>Kod</label>
              <input style={{ display: 'block', padding: 8 }} value={findingCode} onChange={(e) => setFindingCode(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 12 }}>Başlık</label>
              <input style={{ display: 'block', width: '100%', padding: 8 }} value={findingTitle} onChange={(e) => setFindingTitle(e.target.value)} />
            </div>
            <button type="button" className="btn btn-secondary" disabled={!findingCode.trim() || !findingTitle.trim() || createFinding.isPending} onClick={() => createFinding.mutate()}>
              Bulgu ekle
            </button>
          </div>
          {createFinding.isError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
              İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Kod</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Başlık</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Bağlı vaka</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 8 }}>{f.code}</td>
                  <td style={{ padding: 8 }}>{f.title}</td>
                  <td style={{ padding: 8 }}>
                    {f.linkedReportId != null ? (
                      <Link to={`/reports/${f.linkedReportId}`}>#{f.linkedReportId}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      style={{ width: 72, padding: 4 }}
                      placeholder="ID"
                      value={linkDrafts[f.id] ?? ''}
                      onChange={(e) => setLinkDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginLeft: 6, padding: '4px 10px' }}
                      onClick={() => {
                        const v = linkDrafts[f.id]?.trim();
                        if (!v) return;
                        const n = parseInt(v, 10);
                        if (isNaN(n)) return;
                        linkFinding.mutate({ id: f.id, linkedReportId: n });
                      }}
                    >
                      Bağla
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginLeft: 4, padding: '4px 10px' }}
                      onClick={() => linkFinding.mutate({ id: f.id, linkedReportId: null })}
                    >
                      Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linkFinding.isError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
              İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}
        </div>
      )}

      <Link to="/reports" className="btn" style={{ textDecoration: 'none' }}>Raporlara Git</Link>
    </div>
  );
}
