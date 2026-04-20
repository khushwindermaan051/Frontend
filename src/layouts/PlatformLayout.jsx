import { useParams, useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PlatformContext from '../context/PlatformContext';
import { getPlatformConfig } from '../config/platforms';

export default function PlatformLayout() {
  const { slug } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const config = getPlatformConfig(slug);

  if (!config) {
    return (
      <div className="plat-not-found">
        <h2>Platform not found</h2>
        <p>No platform configured for "{slug}"</p>
        <button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: `/platform/${slug}`, label: 'Dashboard', end: true },
    { to: `/platform/${slug}/po`, label: 'PO & Stock' },
    { to: `/platform/${slug}/truck-loading`, label: 'Truck Loading' },
    { to: `/platform/${slug}/dispatches`, label: 'Dispatches' },
    { to: `/platform/${slug}/distributors`, label: 'Distributors' },
  ];

  return (
    <PlatformContext.Provider value={config}>
      <div className="app-layout" style={{ '--platform-color': config.color }}>
        <aside className="sidebar plat-sidebar">
          <div
            className="sidebar-brand"
            onClick={() => navigate(`/platform/${slug}`)}
            style={{ cursor: 'pointer' }}
          >
            {config.logo ? (
              <img
                className="brand-logo-img"
                src={config.logo}
                alt={config.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="brand-logo"
              style={{
                background: config.color,
                display: config.logo ? 'none' : 'flex',
              }}
            >
              {config.icon}
            </div>
            <div className="brand-info">
              <span className="brand-name">{config.name}</span>
              <span className="brand-sub">Platform App</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `plat-nav-item ${isActive ? 'active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="nav-divider" />

            <button
              className="plat-nav-item plat-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              &larr; Main Dashboard
            </button>
          </nav>

          <div className="sidebar-user">
            <div className="user-avatar" style={{ background: config.color }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="logout-btn"
              title="Logout"
            >
              &#x2192;
            </button>
          </div>
        </aside>

        <div className="main-area">
          <Outlet />
        </div>
      </div>
    </PlatformContext.Provider>
  );
}
