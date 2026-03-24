import { Outlet, NavLink, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';

const tabStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: '10px 14px',
  textDecoration: 'none',
  color: isActive ? 'var(--color-primary, #0d9488)' : 'var(--color-text-muted)',
  fontWeight: isActive ? 600 : 500,
  borderBottom: isActive ? '2px solid var(--color-primary, #0d9488)' : '2px solid transparent',
  marginBottom: -1,
});

export function ReportCaseLayout() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const validId = !isNaN(reportId) && reportId > 0;

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: validId,
  });

  if (!validId) {
    return (
      <div className="page">
        <p style={{ color: '#b91c1c' }}>Geçersiz vaka numarası.</p>
        <Link to="/reports" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Listeye dön</Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page">
        <p style={{ color: '#b91c1c' }}>Vaka yüklenirken hata oluştu.</p>
        <Link to="/reports" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Listeye dön</Link>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="page">
        <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
      </div>
    );
  }

  const base = `/reports/${report.id}`;

  return (
    <div className="page">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link to="/reports" className="btn btn-secondary" style={{ textDecoration: 'none', marginRight: 12 }}>
            ← Listeye
          </Link>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Safety Case</span>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.35rem' }}>{report.reportNo ?? `#${report.id}`} — {report.title}</h1>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {(report as { lifecycleLabel?: string }).lifecycleLabel && (
            <span style={{ fontSize: 13, padding: '4px 10px', background: '#ecfdf5', color: '#047857', borderRadius: 6, fontWeight: 600 }}>
              {(report as { lifecycleLabel?: string }).lifecycleLabel}
            </span>
          )}
          <span style={{ fontSize: 13, padding: '4px 10px', background: '#f1f5f9', borderRadius: 6 }}>{report.status}</span>
        </div>
      </div>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 24,
        }}
      >
        <NavLink to={base} end style={tabStyle}>
          Genel / Ekler
        </NavLink>
        <NavLink to={`${base}/review`} style={tabStyle}>
          Triage / İnceleme
        </NavLink>
        <NavLink to={`${base}/investigation`} style={tabStyle}>
          Soruşturma
        </NavLink>
        <NavLink to={`${base}/hirm`} style={tabStyle}>
          Risk (HIRM)
        </NavLink>
        <NavLink to={`${base}/actions`} style={tabStyle}>
          Mitigasyon
        </NavLink>
        <NavLink to={`${base}/effectiveness`} style={tabStyle}>
          Etkinlik
        </NavLink>
        <NavLink to={`${base}/approvals`} style={tabStyle}>
          Onaylar
        </NavLink>
        <NavLink to={`${base}/comments`} style={tabStyle}>
          Yorum / İz
        </NavLink>
        <NavLink to={`${base}/change`} style={tabStyle}>
          MoC
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
