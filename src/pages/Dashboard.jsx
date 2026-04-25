import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAllPlatforms } from '../config/platforms';
import { API_BASE } from '../services/api';
import { formatLabel, formatDateLong } from '../utils/formatters';
import {
  LayoutDashboard, Users, Upload, FileUp, User, Shield, BarChart3,
} from 'lucide-react';
import { Sidebar, NavItem, NavLinkItem, NavSection, NavDivider, useSidebar } from '../components/layout/Sidebar';
import { Topbar, BreadcrumbSep, BreadcrumbCurrent } from '../components/layout/Topbar';
import OverviewHome from '../components/dashboard/OverviewHome';
import PaginatedTable from '../components/dashboard/PaginatedTable';
import { useDashboardData } from '../hooks/useDashboardData';

function PlatformNavLink({ platform }) {
  const { isOpen } = useSidebar();
  return (
    <Link
      to={`/platform/${platform.slug}`}
      className="nav-platform-link"
      title={!isOpen ? platform.name : ''}
    >
      <img
        className="nav-platform-logo"
        src={platform.logo}
        alt={platform.name}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <span
        className="nav-icon nav-platform-fallback"
        style={{ background: platform.color, color: '#fff', display: 'none' }}
      >
        {platform.icon}
      </span>
      {isOpen && <span className="nav-label">{platform.name}</span>}
    </Link>
  );
}

const SECTIONS = {
  primary: {
    label: 'Primary Sells',
    color: '#667eea',
    tables: ['master_po', 'test_master_po'],
  },
  secondary: {
    label: 'Secondary Sells',
    color: '#764ba2',
    tables: [
      'amazon_sec_daily',
      'amazon_sec_range',
      'bigbasketSec',
      'blinkitSec',
      'fk_grocery',
      'flipkartSec',
      'jiomartSec',
      'swiggySec',
      'zeptoSec',
    ],
  },
  inventory: {
    label: 'Inventory',
    color: '#00b894',
    tables: [
      'amazon_inventory',
      'bigbasket_inventory',
      'blinkit_inventory',
      'jiomart_inventory',
      'swiggy_inventory',
      'zepto_inventory',
    ],
  },
};

const ALL_TABLES = Object.values(SECTIONS).flatMap((s) => s.tables);

function getSectionKey(tableName) {
  for (const [key, section] of Object.entries(SECTIONS)) {
    if (section.tables.includes(tableName)) return key;
  }
  return 'primary';
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState('home'); // 'home' | 'table' | 'settings'
  const [activeSection, setActiveSection] = useState('primary');
  const [activeTable, setActiveTable] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { tableCounts, loadingCounts, alerts, loadingAlerts } = useDashboardData(ALL_TABLES);

  // Settings view state
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [expandedPerms, setExpandedPerms] = useState({});

  // Change password modal
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ current: '', next: '', confirm: '' });
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Open settings view if navigated here from platform with openSettings flag
  useEffect(() => {
    if (location.state?.openSettings) {
      setView('settings');
      setSettingsTab('profile');
      // Clear state so refresh doesn't re-open settings
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // Fetch profile when entering settings
  useEffect(() => {
    if (view !== 'settings') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setProfile(data.user))
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [view]);

  // Fetch permissions when switching to permissions tab in settings
  useEffect(() => {
    if (view !== 'settings' || settingsTab !== 'permissions') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingPerms(true);
    fetch(`${API_BASE}/api/auth/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setPermissions(data.permissions || data || []))
      .catch(() => setPermissions([]))
      .finally(() => setLoadingPerms(false));
  }, [view, settingsTab]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleTableClick = (section, table) => {
    setActiveSection(section);
    setActiveTable(table);
    setView('table');
    setCollapsed(true);
  };

  const goHome = () => {
    setView('home');
    setActiveTable('');
    setCollapsed(false);
  };

  const goSettings = () => {
    setView('settings');
    setSettingsTab('profile');
    setCollapsed(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePwdError('');
    setChangePwdSuccess('');
    if (!changePwdForm.current) { setChangePwdError('Current password is required.'); return; }
    if (changePwdForm.next.length < 6) { setChangePwdError('New password must be at least 6 characters.'); return; }
    if (changePwdForm.next !== changePwdForm.confirm) { setChangePwdError('New passwords do not match.'); return; }
    setChangePwdLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: changePwdForm.current, new_password: changePwdForm.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setChangePwdError(data.detail || 'Failed to change password.'); return; }
      setChangePwdSuccess('Password changed successfully.');
      setChangePwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setChangePwdOpen(false); setChangePwdSuccess(''); }, 1800);
    } catch {
      setChangePwdError('Network error. Please try again.');
    } finally {
      setChangePwdLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        showSettings
        settingsActive={view === 'settings'}
        onSettingsClick={goSettings}
      >
        <NavItem
          icon={<LayoutDashboard size={15} />}
          label="Dashboard"
          active={view === 'home'}
          onClick={goHome}
          className="nav-home"
        />
        <NavDivider />

        <NavSection>SAP B1</NavSection>
        <NavLinkItem to="/distributors" icon={<Users size={15} />} label="Distributors" />
        <NavLinkItem to="/monthly-targets" icon={<BarChart3 size={15} />} label="Monthly Targets" />

        <NavDivider />

        <NavSection>Platform Apps</NavSection>
        {getAllPlatforms().map((p) => (
          <PlatformNavLink key={p.slug} platform={p} />
        ))}

        <NavDivider />

        <NavSection>Data Upload</NavSection>
        <NavLinkItem to="/upload/inventory" icon={<Upload size={15} />} label="Inventory Upload" />
        <NavLinkItem to="/upload/secondary" icon={<FileUp size={15} />} label="Secondary Upload" />
      </Sidebar>

      <div className="main-area">
        <Topbar
          showMobileMenu
          onMobileMenu={() => setMobileOpen((o) => !o)}
        >
          {view === 'home' ? (
            <h1>Dashboard</h1>
          ) : view === 'settings' ? (
            <>
              <button className="topbar-back-link" onClick={goHome} title="Back to Dashboard">Dashboard</button>
              <BreadcrumbSep />
              <h1>Settings</h1>
            </>
          ) : (
            <>
              <button className="topbar-back-link" onClick={goHome} title="Back to Dashboard">Dashboard</button>
              <BreadcrumbSep />
              <h1>{formatLabel(activeTable)}</h1>
              <BreadcrumbCurrent>{SECTIONS[activeSection].label}</BreadcrumbCurrent>
            </>
          )}
        </Topbar>

        <main className="content">
          {view === 'home' ? (
            <OverviewHome
              sections={SECTIONS}
              allTables={ALL_TABLES}
              tableCounts={tableCounts}
              loadingCounts={loadingCounts}
              onTableClick={handleTableClick}
              alerts={alerts}
              loadingAlerts={loadingAlerts}
              getSectionKey={getSectionKey}
            />
          ) : view === 'settings' ? (
            <div className="settings-page">
              {/* Breadcrumb */}
              <div className="settings-breadcrumb">
                <button className="settings-breadcrumb-link" onClick={goHome}>Home</button>
                <span className="settings-breadcrumb-sep">›</span>
                <span className="settings-breadcrumb-cur">Settings</span>
              </div>

              <div className="settings-header">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-sub">Manage your profile and view permissions</p>
              </div>

              {/* Tabs */}
              <div className="settings-tabs">
                <button
                  className={`settings-tab ${settingsTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('profile')}
                >
                  <User size={14} /> Profile
                </button>
                <button
                  className={`settings-tab ${settingsTab === 'permissions' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('permissions')}
                >
                  <Shield size={14} /> Permissions
                </button>
              </div>

              {/* Profile Tab */}
              {settingsTab === 'profile' && (
                <div className="settings-card">
                  {loadingProfile ? (
                    <div className="settings-loading">Loading...</div>
                  ) : (() => {
                    const u = profile || user;
                    return (
                      <>
                        <div className="settings-profile-row">
                          <div className="settings-avatar-lg">
                            {(u?.employee_name || u?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>

                          <div className="settings-profile-fields">
                            {u?.employee_code && (
                              <div className="settings-field">
                                <span className="settings-field-label">employee_code</span>
                                <span className="settings-field-value">{u.employee_code}</span>
                              </div>
                            )}
                            <div className="settings-field">
                              <span className="settings-field-label">employee name</span>
                              <span className="settings-field-value">
                                {u?.employee_name || u?.name || u?.email?.split('@')[0] || '—'}
                              </span>
                            </div>
                            <div className="settings-field">
                              <span className="settings-field-label">email</span>
                              <span className="settings-field-value">{u?.email || '—'}</span>
                            </div>
                            <div className="settings-field-row">
                              <span className={`settings-status-badge ${(u?.status || 'active').toLowerCase()}`}>
                                {u?.status || 'Active'}
                              </span>
                            </div>
                            <div className="settings-field">
                              <span className="settings-field-label">Joined On:</span>
                              <span className="settings-field-value settings-field-bold">
                                {formatDateLong(u?.joined_on || u?.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="settings-profile-actions">
                            <button className="settings-change-pwd-btn" onClick={() => { setChangePwdOpen(true); setChangePwdError(''); setChangePwdSuccess(''); }}>Change Password</button>
                            <button className="settings-logout-btn" onClick={handleSignOut}>Logout</button>
                          </div>
                        </div>

                        {u?.roles?.length > 0 && (
                          <div className="settings-roles">
                            <h3 className="settings-roles-title">Roles</h3>
                            <div className="settings-roles-grid">
                              {u.roles.map((role, idx) => (
                                <div
                                  key={idx}
                                  className={`settings-role-card ${role.is_current ? 'current' : ''}`}
                                >
                                  {role.is_current && (
                                    <span className="settings-role-badge">Current</span>
                                  )}
                                  <div className="settings-role-name">{role.role || role.name}</div>
                                  <div className="settings-role-company">{role.company}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Permissions Tab */}
              {settingsTab === 'permissions' && (
                <div className="settings-card settings-perms-card">
                  {loadingPerms ? (
                    <div className="settings-loading">Loading permissions...</div>
                  ) : permissions.length === 0 ? (
                    <div className="settings-empty">No permissions data available.</div>
                  ) : (
                    permissions.map((perm, idx) => {
                      const key = perm.module || idx;
                      return (
                        <div key={key} className="settings-perm-row">
                          <button
                            className="settings-perm-header"
                            onClick={() => setExpandedPerms((p) => ({ ...p, [key]: !p[key] }))}
                          >
                            <div className="settings-perm-left">
                              <span className="settings-perm-icon"><Shield size={15} /></span>
                              <span className="settings-perm-name">{perm.module}</span>
                            </div>
                            <div className="settings-perm-right">
                              <span className="settings-perm-count">
                                {perm.count ?? perm.permissions?.length ?? 0}
                              </span>
                              <span className={`settings-perm-chevron ${expandedPerms[key] ? 'open' : ''}`}>›</span>
                            </div>
                          </button>
                          {expandedPerms[key] && perm.permissions?.length > 0 && (
                            <div className="settings-perm-items">
                              {perm.permissions.map((p, i) => (
                                <div key={i} className="settings-perm-item">{p}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Change Password Modal */}
              {changePwdOpen && (
                <div className="cpwd-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setChangePwdOpen(false); setChangePwdError(''); } }}>
                  <div className="cpwd-modal">
                    <div className="cpwd-header">
                      <h2 className="cpwd-title">Change Password</h2>
                      <button className="cpwd-close" onClick={() => { setChangePwdOpen(false); setChangePwdError(''); }}>✕</button>
                    </div>

                    <form onSubmit={handleChangePassword} className="cpwd-form">
                      {changePwdError && <div className="cpwd-error">{changePwdError}</div>}
                      {changePwdSuccess && <div className="cpwd-success">{changePwdSuccess}</div>}

                      <div className="cpwd-field">
                        <label className="cpwd-label">Current Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.current ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Enter current password"
                            value={changePwdForm.current}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, current: e.target.value }))}
                            autoComplete="current-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}>
                            {showPwd.current ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-field">
                        <label className="cpwd-label">New Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.next ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Min. 6 characters"
                            value={changePwdForm.next}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, next: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}>
                            {showPwd.next ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-field">
                        <label className="cpwd-label">Confirm New Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.confirm ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Repeat new password"
                            value={changePwdForm.confirm}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, confirm: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}>
                            {showPwd.confirm ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-actions">
                        <button type="button" className="cpwd-cancel" onClick={() => { setChangePwdOpen(false); setChangePwdError(''); }}>Cancel</button>
                        <button type="submit" className="cpwd-submit" disabled={changePwdLoading}>
                          {changePwdLoading ? 'Saving…' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <PaginatedTable
                key={`${activeSection}-${activeTable}`}
                tableName={activeTable}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
