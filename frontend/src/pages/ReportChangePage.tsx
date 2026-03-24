import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export function ReportChangePage() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data } = useQuery({
    queryKey: ['change', reportId],
    queryFn: () => caseApi.getChange(reportId),
    enabled: reportId > 0,
  });

  const [form, setForm] = useState({
    changeType: '',
    description: '',
    status: 'DRAFT',
    transitionalRiskNote: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        changeType: data.changeType ?? '',
        description: data.description ?? '',
        status: data.status ?? 'DRAFT',
        transitionalRiskNote: data.transitionalRiskNote ?? '',
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => caseApi.saveChange(reportId, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change', reportId] }),
  });

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>Management of Change (MoC)</h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Yeni capability, tesis, alt yüklenici, süreç değişiklikleri için risk ve geçiş takibi.</p>
      <div style={{ marginBottom: 12 }}>
        <label>Değişiklik tipi</label>
        <input style={{ width: '100%', padding: 8, marginTop: 4 }} value={form.changeType} onChange={(e) => setForm((f) => ({ ...f, changeType: e.target.value }))} disabled={!canEdit} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Açıklama</label>
        <textarea style={{ width: '100%', marginTop: 4 }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={!canEdit} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Durum</label>
        <select style={{ display: 'block', marginTop: 4, padding: 8 }} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} disabled={!canEdit}>
          {['DRAFT', 'ASSESSMENT', 'APPROVAL', 'IMPLEMENTATION', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Geçişsel risk notu</label>
        <textarea style={{ width: '100%', marginTop: 4 }} value={form.transitionalRiskNote} onChange={(e) => setForm((f) => ({ ...f, transitionalRiskNote: e.target.value }))} disabled={!canEdit} />
      </div>
      {canEdit && (
        <>
          <button type="button" className="btn" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Kaydet
          </button>
          {mut.isError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
              İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}
        </>
      )}
    </div>
  );
}
