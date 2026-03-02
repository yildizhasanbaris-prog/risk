import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { actionsApi } from '../api/actions';
import { useAuth } from '../contexts/AuthContext';

export function ReportActionsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reportId = parseInt(id ?? '0', 10);

  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data: report } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['report', reportId, 'actions'],
    queryFn: () => actionsApi.list(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });
  const createMutation = useMutation({
    mutationFn: () => actionsApi.create(reportId, {
      description: newDesc,
      ownerUserId: user?.id ?? 0,
      dueDate: newDueDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId, 'actions'] });
      setNewDesc('');
      setNewDueDate('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ actionId, data }: { actionId: number; data: Parameters<typeof actionsApi.update>[2] }) =>
      actionsApi.update(reportId, actionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId, 'actions'] });
    },
  });

  if (!report) return <div className="page"><p>Yükleniyor...</p></div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Aksiyon Planı: {report.reportNo ?? report.id}</h1>
        <Link to={`/reports/${reportId}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>← Rapor Detayı</Link>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>{report.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Durum: {report.status}</p>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Yeni Aksiyon</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Açıklama</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Ne yapılacak?" />
            </div>
            <div style={{ minWidth: 120 }}>
              <label>Hedef Tarih</label>
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => createMutation.mutate()}
              disabled={!newDesc.trim() || createMutation.isPending}
            >
              Ekle
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Aksiyonlar</h3>
        {isLoading ? <p>Yükleniyor...</p> : actions.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz aksiyon yok.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>#</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Açıklama</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Sorumlu</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Hedef Tarih</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Durum</th>
                {canEdit && <th style={{ padding: 12 }}></th>}
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 12 }}>{a.actionNo}</td>
                  <td style={{ padding: 12 }}>{a.description}</td>
                  <td style={{ padding: 12 }}>{a.owner?.name ?? '-'}</td>
                  <td style={{ padding: 12 }}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString('tr-TR') : '-'}</td>
                  <td style={{ padding: 12 }}>
                    {canEdit ? (
                      <select
                        value={a.status}
                        onChange={(e) => updateMutation.mutate({ actionId: a.id, data: { status: e.target.value } })}
                        style={{ width: 'auto', padding: 4 }}
                      >
                        <option value="PLANNED">Planlandı</option>
                        <option value="IN_PROGRESS">Devam Ediyor</option>
                        <option value="DONE">Tamamlandı</option>
                        <option value="CANCELLED">İptal</option>
                      </select>
                    ) : (
                      a.status
                    )}
                  </td>
                  {canEdit && <td style={{ padding: 12 }}></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
