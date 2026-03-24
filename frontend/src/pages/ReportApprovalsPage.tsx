import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const TYPES = ['SCREENING', 'RISK_ACCEPTANCE', 'MITIGATION_VERIFICATION', 'EFFECTIVENESS', 'CLOSURE'] as const;

export function ReportApprovalsPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data: rows = [] } = useQuery({
    queryKey: ['approvals', reportId],
    queryFn: () => caseApi.listApprovals(reportId),
    enabled: reportId > 0,
  });

  const [type, setType] = useState<string>('SCREENING');
  const [hint, setHint] = useState('');

  const createMut = useMutation({
    mutationFn: () => caseApi.createApproval(reportId, { approvalType: type, requiredRoleHint: hint || undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', reportId] }),
  });

  const signMut = useMutation({
    mutationFn: ({ aid, status }: { aid: number; status: string }) =>
      caseApi.signApproval(reportId, aid, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', reportId] }),
  });

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>Onaylar (e-sign workflow)</h3>
      {canEdit && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12 }}>Tip</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: 'block', padding: 8 }}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12 }}>Rol ipucu</label>
            <input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Accountable Manager" style={{ padding: 8 }} />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            Onay kaydı ekle
          </button>
          {createMut.isError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
              İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((a: { id: number; approvalType: string; status: string; signedAt?: string; signedBy?: { name: string } }) => (
          <li key={a.id} style={{ padding: 12, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{a.approvalType}</strong> — {a.status}
              {a.signedBy && <span style={{ marginLeft: 8, color: 'var(--color-text-muted)' }}>{a.signedBy.name} {a.signedAt ? new Date(a.signedAt).toLocaleString('tr-TR') : ''}</span>}
            </div>
            {canEdit && a.status === 'PENDING' && (
              <div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn" style={{ padding: '4px 12px' }} onClick={() => signMut.mutate({ aid: a.id, status: 'APPROVED' })}>
                    Onayla
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => signMut.mutate({ aid: a.id, status: 'REJECTED' })}>
                    Reddet
                  </button>
                </div>
                {signMut.isError && (
                  <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
                    İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}
    </div>
  );
}
