import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export function ReportInvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data } = useQuery({
    queryKey: ['investigation', reportId],
    queryFn: () => caseApi.getInvestigation(reportId),
    enabled: reportId > 0,
  });

  const [form, setForm] = useState({
    chronology: '',
    contributoryFactors: '',
    hfFactors: '',
    organisationalFactors: '',
    subcontractorFactors: '',
    rootCause: '',
    lessonsLearned: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        chronology: data.chronology ?? '',
        contributoryFactors: data.contributoryFactors ?? '',
        hfFactors: data.hfFactors ?? '',
        organisationalFactors: data.organisationalFactors ?? '',
        subcontractorFactors: data.subcontractorFactors ?? '',
        rootCause: data.rootCause ?? '',
        lessonsLearned: data.lessonsLearned ?? '',
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => caseApi.saveInvestigation(reportId, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investigation', reportId] }),
  });

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>Investigation workspace (ICAO 9824)</h3>
      {!canEdit && <p style={{ color: 'var(--color-text-muted)' }}>Salt okunur.</p>}
      {Object.entries({
        chronology: 'Kronoloji',
        contributoryFactors: 'Katkıda bulunan faktörler',
        hfFactors: 'İnsan faktörleri',
        organisationalFactors: 'Örgütsel faktörler',
        subcontractorFactors: 'Alt yüklenici / arayüz',
        rootCause: 'Kök neden',
        lessonsLearned: 'Öğrenilen dersler',
      }).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>{label}</label>
          <textarea
            style={{ width: '100%', minHeight: 80, padding: 10 }}
            value={form[key as keyof typeof form]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
      ))}
      {canEdit && (
        <button type="button" className="btn" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      )}
    </div>
  );
}
