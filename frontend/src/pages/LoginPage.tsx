import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
    }}>
      <div className="card" style={{
        maxWidth: 400,
        width: '100%',
        padding: 40,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h1 style={{ marginBottom: 8, fontSize: '1.5rem' }}>SMS Risk Analizi</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: 14 }}>
          Güvenlik yönetim sistemi raporlama
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@sirket.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p style={{
              color: 'var(--color-danger)',
              marginBottom: 16,
              fontSize: 14,
              padding: 12,
              background: '#fef2f2',
              borderRadius: 'var(--radius-sm)',
            }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: 14 }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Demo: admin@sms.local / admin123
        </p>
      </div>
    </div>
  );
}
