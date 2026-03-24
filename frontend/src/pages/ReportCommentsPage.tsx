import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '../api/caseApi';
import { useState } from 'react';

export function ReportCommentsPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = parseInt(id ?? '0', 10);
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const { data: rows = [] } = useQuery({
    queryKey: ['caseComments', reportId],
    queryFn: () => caseApi.listComments(reportId),
    enabled: reportId > 0,
  });

  const mut = useMutation({
    mutationFn: () => caseApi.addComment(reportId, { body }),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['caseComments', reportId] });
    },
  });

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>Yorumlar / audit trail özeti</h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Tam audit log backend&apos;de AuditLog tablosunda tutulur.</p>
      <div style={{ marginBottom: 16 }}>
        <textarea
          style={{ width: '100%', minHeight: 72, padding: 10 }}
          placeholder="Yorum ekle..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => mut.mutate()} disabled={!body.trim() || mut.isPending}>
          Gönder
        </button>
        {mut.isError && (
          <p style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
            İşlem sırasında hata oluştu. Lütfen tekrar deneyin.
          </p>
        )}
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {rows.map((c: { id: number; body: string; createdAt: string; user: { name: string } }) => (
          <li key={c.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
            <strong>{c.user?.name}</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>{new Date(c.createdAt).toLocaleString('tr-TR')}</span>
            <p style={{ margin: '8px 0 0' }}>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
