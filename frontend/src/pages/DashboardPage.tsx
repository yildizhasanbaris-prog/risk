import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

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
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
  });

  if (isLoading) return <div className="page"><p>Yükleniyor...</p></div>;

  const stats: DashboardStats = data ?? { totalReports: 0, openActions: 0, byStatus: {} };
  const total = stats.totalReports ?? 0;
  const openActions = stats.openActions ?? 0;
  const byStatus = stats.byStatus ?? {};
  const morAlerts = stats.morAlerts ?? [];

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Toplam Rapor</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{total}</p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Açık Aksiyon</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{openActions}</p>
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
      <Link to="/reports" className="btn" style={{ textDecoration: 'none' }}>Raporlara Git</Link>
    </div>
  );
}
