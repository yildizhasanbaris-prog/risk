import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { actionsApi } from '../api/actions';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';

export function ReportActionsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reportId = parseInt(id ?? '0', 10);

  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [riskAssessmentId, setRiskAssessmentId] = useState<number | ''>('');
  const [actionTypeId, setActionTypeId] = useState<number | ''>('');

  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data: report } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const { data: actionTypes = [] } = useQuery({
    queryKey: ['lookups', 'action-types'],
    queryFn: () => lookupsApi.actionTypes().then((r) => r.data),
    enabled: canEdit && reportId > 0,
  });

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['report', reportId, 'actions'],
    queryFn: () => actionsApi.list(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const riskRows = report?.riskAssessments ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      actionsApi.create(reportId, {
        description: newDesc,
        ownerUserId: user?.id ?? 0,
        dueDate: newDueDate,
        riskAssessmentId: riskAssessmentId === '' ? 0 : riskAssessmentId,
        ...(actionTypeId !== '' ? { actionTypeId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId, 'actions'] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
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

  if (!report) return <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>;

  const canSubmit =
    newDesc.trim() && newDueDate && riskAssessmentId !== '' && (user?.id ?? 0) > 0 && !createMutation.isPending;

  return (
    <>
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>{report.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Durum: {report.status}
          {report.lifecycleLabel ? ` · Yaşam döngüsü: ${report.lifecycleLabel}` : ''}
        </p>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Yeni mitigation</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>
            Her aksiyon bir risk kalemine bağlanmalıdır; hedef tarih ve aksiyon tipi zorunludur.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label>Risk kalemi (HIRM)</label>
              <select
                value={riskAssessmentId === '' ? '' : String(riskAssessmentId)}
                onChange={(e) => setRiskAssessmentId(e.target.value ? parseInt(e.target.value, 10) : '')}
                style={{ width: '100%', maxWidth: 480 }}
              >
                <option value="">Seçin…</option>
                {riskRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} {r.riskIndex ?? ''} {r.riskLevel ? `(${r.riskLevel})` : ''}{' '}
                    {r.hazardDescription ? `— ${r.hazardDescription.slice(0, 60)}` : ''}
                  </option>
                ))}
              </select>
              {riskRows.length === 0 && (
                <p style={{ fontSize: 12, color: '#b45309' }}>Önce HIRM sekmesinde risk değerlendirmesi oluşturun.</p>
              )}
            </div>
            <div>
              <label>Aksiyon tipi</label>
              <select
                value={actionTypeId === '' ? '' : String(actionTypeId)}
                onChange={(e) => setActionTypeId(e.target.value ? parseInt(e.target.value, 10) : '')}
                style={{ width: '100%', maxWidth: 320 }}
              >
                <option value="">Varsayılan (ilk aktif tip)</option>
                {actionTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.description}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Açıklama</label>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Ne yapılacak?" />
              </div>
              <div style={{ minWidth: 140 }}>
                <label>Hedef tarih (zorunlu)</label>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
              <button type="button" className="btn" onClick={() => createMutation.mutate()} disabled={!canSubmit}>
                Ekle
              </button>
            </div>
            {createMutation.isError && (
              <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
                İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Mitigation / aksiyonlar</h3>
        {isLoading ? (
          <p>Yükleniyor...</p>
        ) : actions.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz aksiyon yok.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>Kod</th>
                <th style={{ textAlign: 'left', padding: 12 }}>#</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Açıklama</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Sorumlu</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Hedef Tarih</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 13 }}>{a.mitigationDisplayNo ?? '—'}</td>
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
                        <option value="OPEN">Açık</option>
                        <option value="IN_PROGRESS">Devam ediyor</option>
                        <option value="DONE">Tamamlandı</option>
                        <option value="VERIFIED">Doğrulandı</option>
                        <option value="CANCELLED">İptal</option>
                      </select>
                    ) : (
                      a.status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {updateMutation.isError && (
          <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
            İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
          </p>
        )}
      </div>
    </>
  );
}
