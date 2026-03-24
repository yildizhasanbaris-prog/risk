import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type UserRow, type RoleRow, type MasterRow } from '../api/admin';
import { lookupsApi } from '../api/lookups';

type Tab = 'users' | 'departments' | 'categories' | 'case-types' | 'locations' | 'action-types';

const TABS: { key: Tab; label: string }[] = [
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'departments', label: 'Departmanlar' },
  { key: 'categories', label: 'Kategoriler' },
  { key: 'case-types', label: 'Vaka Türleri' },
  { key: 'locations', label: 'Lokasyonlar' },
  { key: 'action-types', label: 'Aksiyon Türleri' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>Yönetim Paneli</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn' : 'btn btn-secondary'}
            style={{ fontSize: 13 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersPanel /> : <MasterPanel entity={tab} />}
    </div>
  );
}

// ─── Users Panel ───

function UsersPanel() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => adminApi.listUsers().then((r) => r.data) });
  const { data: roles } = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => adminApi.listRoles().then((r) => r.data) });
  const { data: departments } = useQuery({ queryKey: ['lookups', 'departments'], queryFn: () => lookupsApi.departments().then((r) => r.data) });

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof adminApi.createUser>[0]) => adminApi.createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminApi.updateUser>[1] }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setEditingUser(null); },
  });

  if (isLoading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Kullanıcılar ({users?.length ?? 0})</h3>
        <button className="btn" onClick={() => { setShowForm(true); setEditingUser(null); }}>+ Yeni Kullanıcı</button>
      </div>

      {(showForm || editingUser) && (
        <UserForm
          roles={roles ?? []}
          departments={departments ?? []}
          user={editingUser}
          saving={createMut.isPending || updateMut.isPending}
          error={(createMut.error as any)?.response?.data?.error || (updateMut.error as any)?.response?.data?.error || null}
          onSave={(data) => {
            if (editingUser) {
              updateMut.mutate({ id: editingUser.id, data });
            } else {
              createMut.mutate(data as Parameters<typeof adminApi.createUser>[0]);
            }
          }}
          onCancel={() => { setShowForm(false); setEditingUser(null); createMut.reset(); updateMut.reset(); }}
        />
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
            <th style={thStyle}>Ad</th>
            <th style={thStyle}>E-posta</th>
            <th style={thStyle}>Rol</th>
            <th style={thStyle}>Departman</th>
            <th style={thStyle}>Durum</th>
            <th style={thStyle}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: u.isActive ? 1 : 0.5 }}>
              <td style={tdStyle}>{u.name}</td>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}><span style={{ background: 'var(--color-info-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{u.roleName}</span></td>
              <td style={tdStyle}>{u.departmentName ?? '—'}</td>
              <td style={tdStyle}>
                <span style={{
                  background: u.isActive ? 'var(--color-success-bg, #dcfce7)' : 'var(--color-error-bg, #fde2e2)',
                  color: u.isActive ? '#166534' : '#991b1b',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                }}>
                  {u.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </td>
              <td style={tdStyle}>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditingUser(u); setShowForm(false); }}>
                  Düzenle
                </button>
                {u.isActive ? (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px', marginLeft: 6, color: '#991b1b' }}
                    onClick={() => updateMut.mutate({ id: u.id, data: { isActive: false } })}
                  >
                    Devre Dışı
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px', marginLeft: 6, color: '#166534' }}
                    onClick={() => updateMut.mutate({ id: u.id, data: { isActive: true } })}
                  >
                    Aktifleştir
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface UserFormProps {
  roles: RoleRow[];
  departments: { id: number; code: string; name: string }[];
  user: UserRow | null;
  saving: boolean;
  error: string | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

function UserForm({ roles, departments, user, saving, error, onSave, onCancel }: UserFormProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(user?.roleId ?? (roles[0]?.id || 0));
  const [departmentId, setDepartmentId] = useState<number | ''>(user?.departmentId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { name, email, roleId, departmentId: departmentId || null };
    if (password) data.password = password;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
      <h4 style={{ marginTop: 0 }}>{user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h4>
      {error && <div style={{ color: '#991b1b', background: '#fde2e2', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={labelStyle}>
          Ad Soyad
          <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          E-posta
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Şifre {user && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(boş bırakılırsa değişmez)</span>}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} {...(!user ? { required: true } : {})} minLength={6} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Rol
          <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} style={inputStyle}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Departman
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')} style={inputStyle}>
            <option value="">— Seçiniz —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>İptal</button>
      </div>
    </form>
  );
}

// ─── Master Data Panel ───

function MasterPanel({ entity }: { entity: string }) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({ queryKey: ['admin', 'master', entity], queryFn: () => adminApi.listMaster(entity).then((r) => r.data) });

  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterRow | null>(null);

  const createMut = useMutation({
    mutationFn: (data: { code: string; description?: string; name?: string }) => adminApi.createMaster(entity, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'master', entity] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MasterRow> }) => adminApi.updateMaster(entity, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'master', entity] }); setEditingRow(null); },
  });

  const usesName = entity === 'departments' || entity === 'locations';
  const hasIsActive = entity === 'case-types' || entity === 'action-types';

  if (isLoading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{TABS.find((t) => t.key === entity)?.label} ({rows?.length ?? 0})</h3>
        <button className="btn" onClick={() => { setShowForm(true); setEditingRow(null); }}>+ Yeni Kayıt</button>
      </div>

      {(showForm || editingRow) && (
        <MasterForm
          usesName={usesName}
          row={editingRow}
          saving={createMut.isPending || updateMut.isPending}
          error={(createMut.error as any)?.response?.data?.error || (updateMut.error as any)?.response?.data?.error || null}
          onSave={(data) => {
            if (editingRow) {
              updateMut.mutate({ id: editingRow.id, data });
            } else {
              createMut.mutate(data as { code: string; description?: string; name?: string });
            }
          }}
          onCancel={() => { setShowForm(false); setEditingRow(null); createMut.reset(); updateMut.reset(); }}
        />
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
            <th style={thStyle}>Kod</th>
            <th style={thStyle}>{usesName ? 'Ad' : 'Açıklama'}</th>
            {hasIsActive && <th style={thStyle}>Durum</th>}
            <th style={thStyle}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={tdStyle}><code>{r.code}</code></td>
              <td style={tdStyle}>{usesName ? r.name : r.description}</td>
              {hasIsActive && (
                <td style={tdStyle}>
                  <span style={{
                    background: r.isActive ? 'var(--color-success-bg, #dcfce7)' : 'var(--color-error-bg, #fde2e2)',
                    color: r.isActive ? '#166534' : '#991b1b',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}>
                    {r.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
              )}
              <td style={tdStyle}>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditingRow(r); setShowForm(false); }}>
                  Düzenle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MasterFormProps {
  usesName: boolean;
  row: MasterRow | null;
  saving: boolean;
  error: string | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

function MasterForm({ usesName, row, saving, error, onSave, onCancel }: MasterFormProps) {
  const [code, setCode] = useState(row?.code ?? '');
  const [desc, setDesc] = useState((usesName ? row?.name : row?.description) ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { code };
    if (usesName) data.name = desc;
    else data.description = desc;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
      <h4 style={{ marginTop: 0 }}>{row ? 'Düzenle' : 'Yeni Kayıt'}</h4>
      {error && <div style={{ color: '#991b1b', background: '#fde2e2', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={labelStyle}>
          Kod
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {usesName ? 'Ad' : 'Açıklama'}
          <input value={desc} onChange={(e) => setDesc(e.target.value)} required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>İptal</button>
      </div>
    </form>
  );
}

// ─── Styles ───

const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 14 };
