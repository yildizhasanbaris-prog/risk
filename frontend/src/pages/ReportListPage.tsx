import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsApi } from '../api/reports';
import { api } from '../api/client';

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'NEW', label: 'Yeni' },
  { value: 'UNDER_REVIEW', label: 'İncelemede' },
  { value: 'HIRM_REQUIRED', label: 'HIRM Gerekli' },
  { value: 'IN_HIRM', label: 'HIRM Yapılıyor' },
  { value: 'ACTION_PLANNING', label: 'Aksiyon Planlanıyor' },
  { value: 'ACTION_IN_PROGRESS', label: 'Aksiyon Uygulanıyor' },
  { value: 'PENDING_EFFECTIVENESS_CHECK', label: 'Etkililik Bekleniyor' },
  { value: 'CLOSED', label: 'Kapatıldı' },
  { value: 'NOT_SAFETY_RELATED', label: 'SMS Dışı' },
];

export function ReportListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: () => reportsApi.list(statusFilter ? { status: statusFilter } : undefined).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
      </div>
    );
  }

  const reports = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="page">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <h1 style={{ margin: 0 }}>Raporlar</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 180 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || '_all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const { data } = await api.get('/reports/export/excel', { responseType: 'blob' });
                const url = URL.createObjectURL(data as Blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'raporlar.xlsx';
                a.click();
                URL.revokeObjectURL(url);
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </button>
          <Link to="/reports/new" className="btn" style={{ textDecoration: 'none' }}>
            Yeni Rapor
          </Link>
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>No</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>Başlık</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>Tarih</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>Departman</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>Risk</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>Durum</th>
              <th style={{ textAlign: 'right', padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 20px', fontSize: 14 }}>{r.reportNo ?? r.id}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 500 }}>{r.title}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td style={{ padding: '16px 20px', fontSize: 14 }}>{r.department?.name ?? '-'}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    background: r.currentRiskLevel === 'INTOLERABLE' ? '#fef2f2' : r.currentRiskLevel === 'TOLERABLE' ? '#fffbeb' : '#f0fdf4',
                    color: r.currentRiskLevel === 'INTOLERABLE' ? '#dc2626' : r.currentRiskLevel === 'TOLERABLE' ? '#d97706' : '#059669',
                  }}>
                    {r.currentRiskLevel ?? '-'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--color-text-muted)' }}>{r.status}</td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <Link to={`/reports/${r.id}`} style={{ fontWeight: 500, fontSize: 14 }}>Detay</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Henüz rapor yok. Yeni rapor eklemek için yukarıdaki butonu kullanın.
          </div>
        )}
      </div>
    </div>
  );
}
