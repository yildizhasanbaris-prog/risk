import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { caseApi } from '../api/caseApi';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  DRAFT: 'Taslak',
  SUBMITTED: 'Gönderildi',
  UNDER_REVIEW: 'İncelemede',
  UNDER_SCREENING: 'Tarama / triage',
  NOT_SAFETY_RELATED: 'SMS Kapsamı Dışı',
  HIRM_REQUIRED: 'HIRM Gerekli',
  IN_HIRM: 'HIRM Yapılıyor',
  ACTION_PLANNING: 'Aksiyon Planlanıyor',
  ACTION_IN_PROGRESS: 'Aksiyon Uygulanıyor',
  MITIGATION_IN_PROGRESS: 'Mitigasyon devam',
  PENDING_EFFECTIVENESS_CHECK: 'Etkililik Kontrolü Bekleniyor',
  PENDING_APPROVAL: 'Onay bekleniyor',
  INVESTIGATION_IN_PROGRESS: 'Soruşturma',
  CLOSED: 'Kapatıldı',
  REOPENED: 'Yeniden açıldı',
  CANCELLED: 'İptal',
  DUPLICATE: 'Mükerrer',
};

const MOR_STATUS_OPTIONS = [
  { value: 'NONE', label: 'Yok' },
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'SUBMITTED', label: 'Gönderildi' },
  { value: 'ACKNOWLEDGED', label: 'Onaylandı' },
] as const;

const MANDATORY_VOLUNTARY_OPTIONS = [
  { value: 'MANDATORY', label: 'Zorunlu' },
  { value: 'VOLUNTARY', label: 'Gönüllü' },
] as const;

const OCCURRENCE_CLASSIFICATION_OPTIONS = [
  { value: 'OCCURRENCE', label: 'Olay' },
  { value: 'HAZARD', label: 'Tehlike' },
  { value: 'NEAR_MISS', label: 'Ramak kala' },
  { value: 'OBSERVATION', label: 'Gözlem' },
  { value: 'HF_ISSUE', label: 'İnsan faktörü' },
  { value: 'PROCEDURAL_DEVIATION', label: 'Prosedür sapması' },
  { value: 'SUBCONTRACTOR_SAFETY', label: 'Alt yüklenici güvenliği' },
  { value: 'AUDIT_CONCERN', label: 'Denetim bulgusu' },
  { value: 'CHANGE_RELATED', label: 'Değişiklikle ilişkili' },
  { value: 'OTHER', label: 'Diğer' },
] as const;

function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function ReportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reportId = parseInt(id ?? '0', 10);
  const canStaff = ['SafetyOfficer', 'Manager', 'Admin'].includes(user?.role ?? '');

  const [isSafetyRelated, setIsSafetyRelated] = useState(false);
  const [isMor, setIsMor] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [closureSummary, setClosureSummary] = useState('');

  const [crDuplicate, setCrDuplicate] = useState(false);
  const [crInv, setCrInv] = useState(false);
  const [crRisk, setCrRisk] = useState(true);
  const [crImm, setCrImm] = useState(false);
  const [crTypeOk, setCrTypeOk] = useState(false);

  const [morDeadline, setMorDeadline] = useState('');
  const [morStatus, setMorStatus] = useState<string>('NONE');
  const [caseTypeId, setCaseTypeId] = useState<string>('');
  const [mandatoryVoluntary, setMandatoryVoluntary] = useState<string>('');
  const [occurrenceClassification, setOccurrenceClassification] = useState<string>('');
  const [immediateContainmentRequired, setImmediateContainmentRequired] = useState(false);
  const [investigationRequired, setInvestigationRequired] = useState(false);
  const [riskAssessmentRequired, setRiskAssessmentRequired] = useState(false);
  const [externalReportingRequired, setExternalReportingRequired] = useState(false);
  const [screeningComment, setScreeningComment] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getById(reportId).then((r) => r.data),
    enabled: reportId > 0,
  });

  const { data: caseReviewRow } = useQuery({
    queryKey: ['case-review', reportId],
    queryFn: () => caseApi.getCaseReview(reportId) as Promise<Record<string, unknown> | null>,
    enabled: reportId > 0 && canStaff,
  });

  const { data: caseTypes = [] } = useQuery({
    queryKey: ['lookups', 'case-types'],
    queryFn: () => lookupsApi.caseTypes().then((r) => r.data),
  });

  useEffect(() => {
    if (report) {
      setIsSafetyRelated(report.isSafetyRelated ?? false);
      setIsMor(report.isMor ?? false);
      setClosureSummary(report.closureSummary ?? '');
      setMorDeadline(toDateInputValue(report.morDeadline ?? undefined));
      setMorStatus(report.morStatus ?? 'NONE');
      const ctId = report.caseTypeId ?? report.caseType?.id;
      setCaseTypeId(ctId != null ? String(ctId) : '');
      setMandatoryVoluntary(report.mandatoryVoluntary ?? '');
      setOccurrenceClassification(report.occurrenceClassification ?? '');
      setImmediateContainmentRequired(report.immediateContainmentRequired ?? false);
      setInvestigationRequired(report.investigationRequired ?? false);
      setRiskAssessmentRequired(report.riskAssessmentRequired ?? false);
      setExternalReportingRequired(report.externalReportingRequired ?? false);
      setScreeningComment(report.screeningComment ?? '');
    }
  }, [report]);

  useEffect(() => {
    if (caseReviewRow && typeof caseReviewRow === 'object') {
      setCrDuplicate(Boolean(caseReviewRow.duplicateFlag));
      setCrInv(Boolean(caseReviewRow.requiresInvestigation));
      setCrRisk(caseReviewRow.requiresRiskAssessment !== false);
      setCrImm(Boolean(caseReviewRow.requiresImmediateAction));
      setCrTypeOk(Boolean(caseReviewRow.caseTypeConfirmed));
    }
  }, [caseReviewRow]);

  const caseReviewMutation = useMutation({
    mutationFn: () =>
      caseApi.saveCaseReview(reportId, {
        duplicateFlag: crDuplicate,
        requiresInvestigation: crInv,
        requiresRiskAssessment: crRisk,
        requiresImmediateAction: crImm,
        caseTypeConfirmed: crTypeOk,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-review', reportId] }),
  });

  const reviewMutation = useMutation({
    mutationFn: (data: Parameters<typeof reportsApi.review>[1]) => reportsApi.review(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${reportId}`);
    },
  });

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Parameters<typeof reportsApi.review>[1] = {
      isSafetyRelated,
      isMor,
      comment: comment || undefined,
      closureSummary: closureSummary || undefined,
      caseTypeId: caseTypeId === '' ? null : Number(caseTypeId),
      mandatoryVoluntary: mandatoryVoluntary === '' ? null : mandatoryVoluntary,
      occurrenceClassification: occurrenceClassification === '' ? null : occurrenceClassification,
      immediateContainmentRequired,
      investigationRequired,
      riskAssessmentRequired,
      externalReportingRequired,
      screeningComment: screeningComment.trim() === '' ? null : screeningComment,
    };
    if (isMor) {
      if (morDeadline) data.morDeadline = morDeadline;
      data.morStatus = morStatus;
    }
    if (newStatus) data.status = newStatus;
    reviewMutation.mutate(data);
  };

  const handleResetForm = () => {
    if (report) {
      setIsSafetyRelated(report.isSafetyRelated ?? false);
      setIsMor(report.isMor ?? false);
      setNewStatus('');
      setComment('');
      setClosureSummary(report.closureSummary ?? '');
      setMorDeadline(toDateInputValue(report.morDeadline ?? undefined));
      setMorStatus(report.morStatus ?? 'NONE');
      const ctId = report.caseTypeId ?? report.caseType?.id;
      setCaseTypeId(ctId != null ? String(ctId) : '');
      setMandatoryVoluntary(report.mandatoryVoluntary ?? '');
      setOccurrenceClassification(report.occurrenceClassification ?? '');
      setImmediateContainmentRequired(report.immediateContainmentRequired ?? false);
      setInvestigationRequired(report.investigationRequired ?? false);
      setRiskAssessmentRequired(report.riskAssessmentRequired ?? false);
      setExternalReportingRequired(report.externalReportingRequired ?? false);
      setScreeningComment(report.screeningComment ?? '');
    }
  };

  if (isLoading || !report) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>;
  }

  const allowed = report.allowedStatuses ?? [];

  return (
    <>
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>{report.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{report.description ?? '-'}</p>
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text)' }}>
          <strong>Mevcut durum:</strong> {STATUS_LABELS[report.status] ?? report.status}
          {(report as { lifecycleLabel?: string }).lifecycleLabel && (
            <>
              {' '}
              · <strong>Lifecycle:</strong> {(report as { lifecycleLabel?: string }).lifecycleLabel}
            </>
          )}
        </p>
      </div>

      {canStaff && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Initial Review (CaseReview)</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>
            Duplicate işaretinde rapor üzerinde ilgili ana case (`linkedCaseId`) tanımlı olmalıdır.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={crDuplicate} onChange={(e) => setCrDuplicate(e.target.checked)} />
              Mükerrer (duplicate)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={crInv} onChange={(e) => setCrInv(e.target.checked)} />
              Soruşturma gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={crRisk} onChange={(e) => setCrRisk(e.target.checked)} />
              Risk değerlendirmesi gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={crImm} onChange={(e) => setCrImm(e.target.checked)} />
              Acil aksiyon / containment gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={crTypeOk} onChange={(e) => setCrTypeOk(e.target.checked)} />
              Case tipi (REPORT/CHANGE) doğrulandı
            </label>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            disabled={caseReviewMutation.isPending}
            onClick={() => caseReviewMutation.mutate()}
          >
            {caseReviewMutation.isPending ? 'Kaydediliyor...' : 'Initial review kaydet'}
          </button>
          {caseReviewMutation.isError && (
            <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 14 }}>
              {(caseReviewMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'Kayıt hatası'}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSaveReview}>
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>SMS / QA Kararları</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={isSafetyRelated}
                onChange={(e) => setIsSafetyRelated(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>SMS kapsamına giriyor</span>
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={isMor}
                onChange={(e) => setIsMor(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>MOR (Mandatory Occurrence Report) adayı</span>
            </label>
          </div>
          {isMor && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              MOR işaretlendiğinde 72 saatlik süre otomatik hesaplanır.
            </p>
          )}
        </div>

        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Screening / Triage Detayları</h3>
          {isMor && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label>MOR son tarih</label>
                <input
                  type="date"
                  value={morDeadline}
                  onChange={(e) => setMorDeadline(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>MOR durumu</label>
                <select value={morStatus} onChange={(e) => setMorStatus(e.target.value)}>
                  {MOR_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div style={{ marginBottom: 16 }}>
            <label>Case tipi</label>
            <select value={caseTypeId} onChange={(e) => setCaseTypeId(e.target.value)}>
              <option value="">— Seçiniz —</option>
              {caseTypes.map((ct) => (
                <option key={ct.id} value={String(ct.id)}>
                  {ct.code} — {ct.description}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Zorunlu / gönüllü</label>
            <select value={mandatoryVoluntary} onChange={(e) => setMandatoryVoluntary(e.target.value)}>
              <option value="">— Seçiniz —</option>
              {MANDATORY_VOLUNTARY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Olay sınıflandırması</label>
            <select
              value={occurrenceClassification}
              onChange={(e) => setOccurrenceClassification(e.target.value)}
            >
              <option value="">— Seçiniz —</option>
              {OCCURRENCE_CLASSIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={immediateContainmentRequired}
                onChange={(e) => setImmediateContainmentRequired(e.target.checked)}
              />
              Acil containment gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={investigationRequired}
                onChange={(e) => setInvestigationRequired(e.target.checked)}
              />
              Soruşturma gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={riskAssessmentRequired}
                onChange={(e) => setRiskAssessmentRequired(e.target.checked)}
              />
              Risk değerlendirmesi gerekli
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={externalReportingRequired}
                onChange={(e) => setExternalReportingRequired(e.target.checked)}
              />
              Harici raporlama gerekli
            </label>
          </div>
          <div style={{ marginBottom: 0 }}>
            <label>Tarama / triage notu</label>
            <textarea
              value={screeningComment}
              onChange={(e) => setScreeningComment(e.target.value)}
              rows={3}
              placeholder="Screening yorumu..."
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Durum Değiştir</h3>
          <div style={{ marginBottom: 20 }}>
            <label>Yeni durum</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">-- Değiştirme --</option>
              {allowed.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
            {allowed.length === 0 && (
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Bu durumda ({STATUS_LABELS[report.status] ?? report.status}) değişiklik yapılamaz.
              </p>
            )}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Açıklama (opsiyonel)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </div>
          {(allowed.includes('CLOSED') || report.status === 'PENDING_EFFECTIVENESS_CHECK') && (
            <div style={{ marginBottom: 0 }}>
              <label>Kapanış Özeti (CLOSED için)</label>
              <textarea value={closureSummary} onChange={(e) => setClosureSummary(e.target.value)} rows={3} placeholder="Lesson learned, kapanış notu..." />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={reviewMutation.isPending} className="btn">
            {reviewMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button type="button" onClick={handleResetForm} className="btn btn-secondary">
            Formu Sıfırla
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            İptal
          </button>
        </div>
        {reviewMutation.isError && (
          <p style={{
            color: 'var(--color-danger)',
            marginTop: 16,
            padding: 12,
            background: '#fef2f2',
            borderRadius: 'var(--radius-sm)',
          }}>
            {(reviewMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata'}
          </p>
        )}
      </form>
    </>
  );
}
