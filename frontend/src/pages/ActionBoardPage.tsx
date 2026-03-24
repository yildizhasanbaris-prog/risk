import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface BoardRow {
  id: number;
  mitigationDisplayNo?: string | null;
  description: string;
  status: string;
  dueDate: string | null;
  overdueDays: number;
  report?: { id: number; reportNo: string | null; title: string; currentRiskLevel: string | null };
  owner?: { id: number; name: string };
}

export function ActionBoardPage() {
  const [overdue, setOverdue] = useState(false);
  const [mine, setMine] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['action-board', overdue, mine],
    queryFn: () =>
      api
        .get<BoardRow[]>('/dashboard/action-board', {
          params: { overdue: overdue ? '1' : undefined, mine: mine ? '1' : undefined },
        })
        .then((r) => r.data),
  });

  return (
    <div className="page" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Action Board</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Mitigation takibi: gecikmiş ve bana atanmış filtreleri.
      </p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
          Sadece gecikenler
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Bana atanmış
        </label>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {isLoading ? (
          <p style={{ padding: 24 }}>Yükleniyor...</p>
        ) : rows.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>Mitigation</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Case</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Başlık</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Owner</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Hedef</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Gecikme (gün)</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 13 }}>{r.mitigationDisplayNo ?? r.id}</td>
                  <td style={{ padding: 12 }}>
                    {r.report?.id ? (
                      <Link to={`/reports/${r.report.id}/actions`}>{r.report.reportNo ?? r.report.id}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 12 }}>{r.report?.title ?? '—'}</td>
                  <td style={{ padding: 12 }}>{r.owner?.name ?? '—'}</td>
                  <td style={{ padding: 12 }}>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('tr-TR') : '—'}</td>
                  <td style={{ padding: 12, color: r.overdueDays > 0 ? '#b91c1c' : undefined }}>{r.overdueDays}</td>
                  <td style={{ padding: 12 }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
