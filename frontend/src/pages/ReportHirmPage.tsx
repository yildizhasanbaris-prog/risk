import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { riskAssessmentsApi } from '../api/riskAssessments';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';

export function ReportHirmPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reportId = parseInt(id ?? '0', 10);

  const [form, setForm] = useState({
    assessmentType: 'INITIAL' as 'INITIAL' | 'RESIDUAL' | 'INTERMEDIATE',
    hazardDescription: '',
    consequences: '',
    existingControls: '',
    proposedControls: '',
    severityCode: '' as '' | 'A' | 'B' | 'C' | 'D' | 'E',
    likelihoodCode: 0 as number,
  });
  const [previewRisk, setPreviewRisk] = useState<{ riskIndex: string; riskLevel: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    hazardDescription: '',
    existingControls: '',
    proposedControls: '',
    severityCode: '' as '' | 'A' | 'B' | 'C' | 'D' | 'E',
    likelihoodCode: 0 as number,
  });

  const canEdit = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ['report', reportId, 'risk-assessments'],
    queryFn: () => riskAssessmentsApi.list(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const { data: severityLevels = [] } = useQuery({
    queryKey: ['severity'],
    queryFn: () => lookupsApi.severity().then((r) => r.data),
  });
  const { data: likelihoodLevels = [] } = useQuery({
    queryKey: ['likelihood'],
    queryFn: () => lookupsApi.likelihood().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof riskAssessmentsApi.create>[1]) =>
      riskAssessmentsApi.create(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId, 'risk-assessments'] });
      setForm({
        assessmentType: 'INITIAL',
        hazardDescription: '',
        consequences: '',
        existingControls: '',
        proposedControls: '',
        severityCode: '',
        likelihoodCode: 0,
      });
      setPreviewRisk(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      assessmentId,
      data,
    }: {
      assessmentId: number;
      data: Parameters<typeof riskAssessmentsApi.update>[2];
    }) => riskAssessmentsApi.update(reportId, assessmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId, 'risk-assessments'] });
      setEditingId(null);
    },
  });

  const handleCalculate = async () => {
    if (!form.severityCode || !form.likelihoodCode) return;
    try {
      const { data } = await lookupsApi.riskCalculate(form.severityCode, form.likelihoodCode);
      setPreviewRisk(data);
    } catch {
      setPreviewRisk(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.severityCode || !form.likelihoodCode) return;
    createMutation.mutate({
      assessmentType: form.assessmentType,
      hazardDescription: form.hazardDescription || undefined,
      consequences: form.consequences || undefined,
      existingControls: form.existingControls || undefined,
      proposedControls: form.proposedControls || undefined,
      severityCode: form.severityCode,
      likelihoodCode: form.likelihoodCode,
    });
  };

  if (reportLoading || !report) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>{report.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{report.description ?? '-'}</p>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          <strong>Mevcut risk seviyesi:</strong>{' '}
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 600,
              background:
                report.currentRiskLevel === 'INTOLERABLE'
                  ? '#fef2f2'
                  : report.currentRiskLevel === 'TOLERABLE'
                    ? '#fffbeb'
                    : '#f0fdf4',
              color:
                report.currentRiskLevel === 'INTOLERABLE'
                  ? '#dc2626'
                  : report.currentRiskLevel === 'TOLERABLE'
                    ? '#d97706'
                    : '#059669',
            }}
          >
            {report.currentRiskLevel ?? '-'}
          </span>
        </p>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Yeni Risk Değerlendirmesi</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label>Değerlendirme tipi</label>
              <select
                value={form.assessmentType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assessmentType: e.target.value as 'INITIAL' | 'RESIDUAL' | 'INTERMEDIATE' }))
                }
              >
                <option value="INITIAL">Initial (İlk)</option>
                <option value="RESIDUAL">Residual (Kalan)</option>
                <option value="INTERMEDIATE">Intermediate (Ara)</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Tehlike tanımı</label>
              <textarea
                value={form.hazardDescription}
                onChange={(e) => setForm((f) => ({ ...f, hazardDescription: e.target.value }))}
                rows={2}
                placeholder="HIRM formundaki hazard tanımı"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Olası sonuçlar</label>
              <textarea
                value={form.consequences}
                onChange={(e) => setForm((f) => ({ ...f, consequences: e.target.value }))}
                rows={2}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Mevcut kontroller</label>
              <textarea
                value={form.existingControls}
                onChange={(e) => setForm((f) => ({ ...f, existingControls: e.target.value }))}
                rows={2}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Önerilen kontroller</label>
              <textarea
                value={form.proposedControls}
                onChange={(e) => setForm((f) => ({ ...f, proposedControls: e.target.value }))}
                rows={2}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label>Severity (A-E)</label>
                <select
                  value={form.severityCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, severityCode: (e.target.value || '') as '' | 'A' | 'B' | 'C' | 'D' | 'E' }))
                  }
                >
                  <option value="">Seçin</option>
                  {severityLevels.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.code} - {s.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Likelihood (1-5)</label>
                <select
                  value={form.likelihoodCode || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, likelihoodCode: e.target.value ? parseInt(e.target.value, 10) : 0 }))
                  }
                >
                  <option value="">Seçin</option>
                  {likelihoodLevels.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" onClick={handleCalculate} className="btn btn-secondary">
                Risk Hesapla
              </button>
              {previewRisk && (
                <span
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    background:
                      previewRisk.riskLevel === 'INTOLERABLE'
                        ? '#fef2f2'
                        : previewRisk.riskLevel === 'TOLERABLE'
                          ? '#fffbeb'
                          : '#f0fdf4',
                    color:
                      previewRisk.riskLevel === 'INTOLERABLE'
                        ? '#dc2626'
                        : previewRisk.riskLevel === 'TOLERABLE'
                          ? '#d97706'
                          : '#059669',
                  }}
                >
                  {previewRisk.riskIndex} - {previewRisk.riskLevel}
                </span>
              )}
            </div>
            <button type="submit" disabled={createMutation.isPending || !form.severityCode || !form.likelihoodCode} className="btn">
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {createMutation.isError && (
              <p style={{ color: 'var(--color-danger)', marginTop: 12 }}>
                {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata'}
              </p>
            )}
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Geçmiş Değerlendirmeler</h3>
        {assessmentsLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
        ) : assessments.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz risk değerlendirmesi yok.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assessments.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <div
                  key={a.id}
                  style={{
                    padding: 16,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                    <strong>{a.assessmentType}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            a.riskLevel === 'INTOLERABLE'
                              ? '#fef2f2'
                              : a.riskLevel === 'TOLERABLE'
                                ? '#fffbeb'
                                : '#f0fdf4',
                          color:
                            a.riskLevel === 'INTOLERABLE'
                              ? '#dc2626'
                              : a.riskLevel === 'TOLERABLE'
                                ? '#d97706'
                                : '#059669',
                        }}
                      >
                        {a.riskIndex ?? '-'} - {a.riskLevel ?? '-'}
                      </span>
                      {canEdit && !isEditing && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 13, padding: '6px 12px' }}
                          onClick={() => {
                            setEditingId(a.id);
                            setEditForm({
                              hazardDescription: a.hazardDescription ?? '',
                              existingControls: a.existingControls ?? '',
                              proposedControls: a.proposedControls ?? '',
                              severityCode: (a.severityCode as '' | 'A' | 'B' | 'C' | 'D' | 'E') || '',
                              likelihoodCode: a.likelihoodCode ?? 0,
                            });
                            updateMutation.reset();
                          }}
                        >
                          Düzenle
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <label>Severity (A-E)</label>
                          <select
                            value={editForm.severityCode}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                severityCode: (e.target.value || '') as '' | 'A' | 'B' | 'C' | 'D' | 'E',
                              }))
                            }
                          >
                            <option value="">Seçin</option>
                            {severityLevels.map((s) => (
                              <option key={s.id} value={s.code}>
                                {s.code} - {s.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label>Likelihood (1-5)</label>
                          <select
                            value={editForm.likelihoodCode || ''}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                likelihoodCode: e.target.value ? parseInt(e.target.value, 10) : 0,
                              }))
                            }
                          >
                            <option value="">Seçin</option>
                            {likelihoodLevels.map((l) => (
                              <option key={l.id} value={l.code}>
                                {l.code} - {l.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Tehlike tanımı</label>
                        <textarea
                          value={editForm.hazardDescription}
                          onChange={(e) => setEditForm((f) => ({ ...f, hazardDescription: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Mevcut kontroller</label>
                        <textarea
                          value={editForm.existingControls}
                          onChange={(e) => setEditForm((f) => ({ ...f, existingControls: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Önerilen kontroller</label>
                        <textarea
                          value={editForm.proposedControls}
                          onChange={(e) => setEditForm((f) => ({ ...f, proposedControls: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={updateMutation.isPending || !editForm.severityCode || !editForm.likelihoodCode}
                          onClick={() =>
                            updateMutation.mutate({
                              assessmentId: a.id,
                              data: {
                                hazardDescription: editForm.hazardDescription || undefined,
                                existingControls: editForm.existingControls || undefined,
                                proposedControls: editForm.proposedControls || undefined,
                                severityCode: editForm.severityCode as 'A' | 'B' | 'C' | 'D' | 'E',
                                likelihoodCode: editForm.likelihoodCode,
                              },
                            })
                          }
                        >
                          {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            setEditingId(null);
                            updateMutation.reset();
                          }}
                        >
                          İptal
                        </button>
                      </div>
                      {updateMutation.isError && (
                        <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>Güncelleme hatası.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Severity: {a.severityCode ?? '-'} · Likelihood: {a.likelihoodCode ?? '-'}
                      </p>
                      {a.hazardDescription ? (
                        <p style={{ margin: '4px 0', fontSize: 14 }}>{a.hazardDescription}</p>
                      ) : (
                        <p style={{ margin: '4px 0', fontSize: 14, color: 'var(--color-text-muted)' }}>Tehlike tanımı yok.</p>
                      )}
                      {a.existingControls && (
                        <p style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 600 }}>Mevcut kontroller</p>
                      )}
                      {a.existingControls && <p style={{ margin: '0 0 8px', fontSize: 14 }}>{a.existingControls}</p>}
                      {a.proposedControls && (
                        <p style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 600 }}>Önerilen kontroller</p>
                      )}
                      {a.proposedControls && <p style={{ margin: '0 0 8px', fontSize: 14 }}>{a.proposedControls}</p>}
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {a.assessedBy?.name} - {a.assessedAt ? new Date(a.assessedAt).toLocaleString('tr-TR') : '-'}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
