import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PlatformContext from '../context/PlatformContext';
import { getPlatformConfig } from '../config/platforms';
import { Sidebar, NavRouteLink, useSidebar } from '../components/layout/Sidebar';
import { Topbar, BreadcrumbLink, BreadcrumbSep, BreadcrumbCurrent } from '../components/layout/Topbar';

const PAGE_LABELS = {
  '': 'Dashboard',
  po: 'PO & Stock',
  dispatches: 'Dispatches',
  distributors: 'Distributors',
  'landing-rate': 'Monthly Landing Rate',
  'monthly-targets': 'Monthly Targets',
};

const LANDING_RATE_SLUGS = new Set(['blinkit', 'zepto', 'swiggy', 'bigbasket']);

// In-scope platforms for Monthly Targets — spec §1 / §8.1. Amazon, JioMart,
// and Flipkart Grocery are deliberately excluded.
const MONTHLY_TARGETS_SLUGS = new Set([
  'blinkit', 'swiggy', 'zepto', 'bigbasket', 'flipkart', 'zomato', 'citymall',
]);

function PlatformBrand({ config }) {
  const { isOpen } = useSidebar();
  return (
    <div
      className="sidebar-brand"
      onClick={() => window.location.reload()}
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
        style={{ background: config.color, display: config.logo ? 'none' : 'flex' }}
      >
        {config.icon}
      </div>
      {isOpen && (
        <div className="brand-info">
          <span className="brand-name">{config.name}</span>
        </div>
      )}
    </div>
  );
}

export default function PlatformLayout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const config = getPlatformConfig(slug);

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!config) {
    return (
      <div className="plat-not-found">
        <h2>Platform not found</h2>
        <p>No platform configured for "{slug}"</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const subPath = location.pathname.replace(`/platform/${slug}`, '').replace(/^\//, '');
  const pageLabel = PAGE_LABELS[subPath] ?? subPath;

  const navItems = [
    { to: `/platform/${slug}`, label: 'Dashboard', end: true },
    { to: `/platform/${slug}/po`, label: 'PO & Stock' },
    { to: `/platform/${slug}/dispatches`, label: 'Dispatches' },
    { to: `/platform/${slug}/distributors`, label: 'Distributors' },
    ...(LANDING_RATE_SLUGS.has(slug)
      ? [{ to: `/platform/${slug}/landing-rate`, label: 'Monthly Landing Rate' }]
      : []),
    ...(MONTHLY_TARGETS_SLUGS.has(slug)
      ? [{ to: `/platform/${slug}/monthly-targets`, label: 'Monthly Targets' }]
      : []),
  ];

  return (
    <PlatformContext.Provider value={config}>
      <div className="app-layout" style={{ '--platform-color': config.color }}>
        <Sidebar
          brand={<PlatformBrand config={config} />}
          variant="plat-sidebar"
          collapsible={false}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        >
          {navItems.map((item) => (
            <NavRouteLink
              key={item.to}
              to={item.to}
              end={item.end}
              label={item.label}
              className="plat-nav-item"
            />
          ))}
        </Sidebar>

        <div className="main-area">
          <Topbar
            showMobileMenu
            onMobileMenu={() => setMobileOpen((o) => !o)}
          >
            <BreadcrumbLink onClick={() => navigate('/dashboard')} title="Go to Main Dashboard">
              Dashboard
            </BreadcrumbLink>
            <BreadcrumbSep />
            <BreadcrumbCurrent className="plat-topbar-platform">{config.name}</BreadcrumbCurrent>
            {pageLabel && pageLabel !== 'Dashboard' && (
              <>
                <BreadcrumbSep />
                <BreadcrumbCurrent>{pageLabel}</BreadcrumbCurrent>
              </>
            )}
          </Topbar>

          <Outlet />
        </div>
      </div>
    </PlatformContext.Provider>
  );
}
