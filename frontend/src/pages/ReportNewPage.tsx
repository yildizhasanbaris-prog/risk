import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { lookupsApi } from '../api/lookups';

export function ReportNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    departmentId: undefined as number | undefined,
    location: '',
    aircraftReg: '',
    aircraftType: '',
    componentPn: '',
    componentSn: '',
    immediateActions: '',
    categoryId: undefined as number | undefined,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => lookupsApi.departments().then((r) => r.data),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => lookupsApi.categories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof reportsApi.create>[0]) => reportsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${res.data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      departmentId: form.departmentId,
      location: form.location || undefined,
      aircraftReg: form.aircraftReg || undefined,
      aircraftType: form.aircraftType || undefined,
      componentPn: form.componentPn || undefined,
      componentSn: form.componentSn || undefined,
      immediateActions: form.immediateActions || undefined,
      categoryId: form.categoryId,
    });
  };

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Yeni Rapor</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: 14 }}>
          Olay, tehlike veya near-miss raporu oluşturun
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label>Başlık *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Kısa başlık girin"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="Olayın detaylı açıklaması"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Departman</label>
            <select
              value={form.departmentId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">Seçin</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Konum</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Hangar, istasyon, atölye vb."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label>Uçak Kayıt</label>
              <input
                value={form.aircraftReg}
                onChange={(e) => setForm((f) => ({ ...f, aircraftReg: e.target.value }))}
              />
            </div>
            <div>
              <label>Uçak Tipi</label>
              <input
                value={form.aircraftType}
                onChange={(e) => setForm((f) => ({ ...f, aircraftType: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label>Parça PN</label>
              <input
                value={form.componentPn}
                onChange={(e) => setForm((f) => ({ ...f, componentPn: e.target.value }))}
              />
            </div>
            <div>
              <label>Parça SN</label>
              <input
                value={form.componentSn}
                onChange={(e) => setForm((f) => ({ ...f, componentSn: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Kategori</label>
            <select
              value={form.categoryId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">Seçin</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 32 }}>
            <label>İlk Alınan Tedbirler</label>
            <textarea
              value={form.immediateActions}
              onChange={(e) => setForm((f) => ({ ...f, immediateActions: e.target.value }))}
              rows={2}
              placeholder="İlk emniyet tedbirleri"
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={createMutation.isPending} className="btn">
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              İptal
            </button>
          </div>
          {createMutation.isError && (
            <p style={{
              color: 'var(--color-danger)',
              marginTop: 16,
              padding: 12,
              background: '#fef2f2',
              borderRadius: 'var(--radius-sm)',
            }}>
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
