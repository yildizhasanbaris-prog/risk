import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

function BoolSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <select
        value={value === null ? '' : value ? 'true' : 'false'}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : v === 'true');
        }}
        disabled={disabled}
        style={{ padding: 8, minWidth: 120 }}
      >
        <option value="">—</option>
        <option value="true">Evet</option>
        <option value="false">Hayır</option>
      </select>
    </div>
  );
}

export function ReportEffectivenessPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data } = useQuery({
    queryKey: ['effectiveness', reportId],
    queryFn: () => caseApi.getEffectiveness(reportId),
    enabled: reportId > 0,
  });

  const [form, setForm] = useState({
    implementationVerified: null as boolean | null,
    controlEffective: null as boolean | null,
    repeatEvent: null as boolean | null,
    spiTrendNote: '',
    residualRiskReduced: null as boolean | null,
    furtherActionRequired: null as boolean | null,
    reviewerComment: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        implementationVerified: data.implementationVerified ?? null,
        controlEffective: data.controlEffective ?? null,
        repeatEvent: data.repeatEvent ?? null,
        spiTrendNote: data.spiTrendNote ?? '',
        residualRiskReduced: data.residualRiskReduced ?? null,
        furtherActionRequired: data.furtherActionRequired ?? null,
        reviewerComment: data.reviewerComment ?? '',
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      caseApi.saveEffectiveness(reportId, {
        implementationVerified: form.implementationVerified ?? undefined,
        controlEffective: form.controlEffective ?? undefined,
        repeatEvent: form.repeatEvent ?? undefined,
        spiTrendNote: form.spiTrendNote || undefined,
        residualRiskReduced: form.residualRiskReduced ?? undefined,
        furtherActionRequired: form.furtherActionRequired ?? undefined,
        reviewerComment: form.reviewerComment || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['effectiveness', reportId] }),
  });

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>Effectiveness review</h3>
      {!canEdit && <p style={{ color: 'var(--color-text-muted)' }}>Salt okunur.</p>}
      <BoolSelect label="Uygulama doğrulandı mı?" value={form.implementationVerified} onChange={(v) => setForm((f) => ({ ...f, implementationVerified: v }))} disabled={!canEdit} />
      <BoolSelect label="Kontrol etkin mi?" value={form.controlEffective} onChange={(v) => setForm((f) => ({ ...f, controlEffective: v }))} disabled={!canEdit} />
      <BoolSelect label="Tekrarlayan olay?" value={form.repeatEvent} onChange={(v) => setForm((f) => ({ ...f, repeatEvent: v }))} disabled={!canEdit} />
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 500 }}>SPI / trend notu</label>
        <textarea style={{ width: '100%', marginTop: 4 }} value={form.spiTrendNote} onChange={(e) => setForm((f) => ({ ...f, spiTrendNote: e.target.value }))} disabled={!canEdit} />
      </div>
      <BoolSelect label="Artık risk azaldı mı?" value={form.residualRiskReduced} onChange={(v) => setForm((f) => ({ ...f, residualRiskReduced: v }))} disabled={!canEdit} />
      <BoolSelect label="İlave aksiyon gerekli mi?" value={form.furtherActionRequired} onChange={(v) => setForm((f) => ({ ...f, furtherActionRequired: v }))} disabled={!canEdit} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500 }}>Reviewer yorumu</label>
        <textarea style={{ width: '100%', marginTop: 4 }} value={form.reviewerComment} onChange={(e) => setForm((f) => ({ ...f, reviewerComment: e.target.value }))} disabled={!canEdit} />
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
