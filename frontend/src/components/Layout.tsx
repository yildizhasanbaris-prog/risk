import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '16px 24px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 15 }}>{t('nav.dashboard')}</Link>
          <Link to="/reports" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 15 }}>{t('nav.reports')}</Link>
          <Link to="/action-board" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 15 }}>Action Board</Link>
          <Link to="/registers" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 15 }}>Registers</Link>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <Link to="/admin" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 15 }}>Yönetim</Link>
          )}
          <Link to="/reports/new" className="btn" style={{ textDecoration: 'none' }}>{t('nav.newReport')}</Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} style={{ padding: '4px 8px', fontSize: 13 }}>
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            {user?.name} <span style={{ color: 'var(--color-text)' }}>({user?.role})</span>
          </span>
          <button type="button" onClick={logout} className="btn btn-secondary">{t('nav.logout')}</button>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
