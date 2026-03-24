import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function RegistersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['registers'],
    queryFn: () =>
      api
        .get<{
          cases: { id: number; reportNo: string | null; title: string; status: string; lifecycleStatus: string | null }[];
          riskRegister: unknown[];
          mitigationRegister: unknown[];
          changeRegister: { id: number; reportNo: string | null; title: string }[];
        }>('/dashboard/registers')
        .then((r) => r.data),
  });

  if (isLoading) return <div className="page" style={{ padding: 24 }}>Yükleniyor...</div>;
  if (error) return <div className="page" style={{ padding: 24 }}>Erişim reddedildi veya hata oluştu.</div>;

  return (
    <div className="page" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Registers</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Case, risk, mitigation ve change özet listeleri.</p>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Case register</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>No</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Başlık</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Lifecycle</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.cases ?? []).map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 8 }}>
                  <Link to={`/reports/${c.id}`}>{c.reportNo ?? c.id}</Link>
                </td>
                <td style={{ padding: 8 }}>{c.title}</td>
                <td style={{ padding: 8 }}>{c.lifecycleStatus ?? '—'}</td>
                <td style={{ padding: 8 }}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Change register</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {(data?.changeRegister ?? []).map((c) => (
            <li key={c.id} style={{ marginBottom: 8 }}>
              <Link to={`/reports/${c.id}`}>{c.reportNo ?? c.id}</Link> — {c.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Risk register (özet)</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {(data?.riskRegister ?? []).length} satır — detay için case ekranına gidin.
        </p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Mitigation register (özet)</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {(data?.mitigationRegister ?? []).length} satır — Action Board veya case aksiyon sekmesi.
        </p>
      </div>
    </div>
  );
}
