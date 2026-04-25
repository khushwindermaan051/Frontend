import { useNavigate } from 'react-router-dom';
import { UploaderProvider, useUploaderNav } from '../context/UploaderContext';
import { Sidebar, NavSection, useSidebar } from '../components/layout/Sidebar';
import { Topbar, BreadcrumbLink, BreadcrumbSep, BreadcrumbCurrent } from '../components/layout/Topbar';
import jivoLogo from '../assets/logos/jivo.jpg';

function UploadBrand({ showText }) {
  return (
    <div
      className="sidebar-brand"
      onClick={() => window.location.reload()}
      style={{ cursor: 'pointer' }}
    >
      <img className="brand-logo-img" src={jivoLogo} alt="Jivo" />
      {showText && (
        <div className="brand-info">
          <span className="brand-name">Jivo</span>
        </div>
      )}
    </div>
  );
}

function UploaderNavItems() {
  const { navItems } = useUploaderNav();
  const { isOpen } = useSidebar();
  if (navItems.length === 0) return null;
  return (
    <>
      <NavSection>Platforms</NavSection>
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`upload-nav-item ${item.active ? 'active' : ''}`}
          onClick={item.onSelect}
          title={item.name}
        >
          <span className="nav-icon">
            <img src={item.logo} alt={item.name} className="upload-nav-logo" />
          </span>
          {isOpen && <span className="nav-label">{item.name}</span>}
        </button>
      ))}
    </>
  );
}

function UploadPageInner({ title, children }) {
  const navigate = useNavigate();
  const { navItems } = useUploaderNav();
  const hasNav = navItems.length > 0;

  return (
    <div className="app-layout">
      <Sidebar
        brand={<UploadBrand showText={hasNav} />}
        variant={hasNav ? '' : 'collapsed'}
        collapsible={false}
      >
        <UploaderNavItems />
      </Sidebar>

      <div className="main-area">
        <Topbar>
          <BreadcrumbLink onClick={() => navigate('/dashboard')} title="Go to Main Dashboard">
            Dashboard
          </BreadcrumbLink>
          <BreadcrumbSep />
          <BreadcrumbCurrent className="plat-topbar-platform">{title}</BreadcrumbCurrent>
        </Topbar>

        <div className="upload-iframe">{children}</div>
      </div>
    </div>
  );
}

export default function UploadPage({ title, children }) {
  return (
    <UploaderProvider>
      <UploadPageInner title={title}>{children}</UploadPageInner>
    </UploaderProvider>
  );
}
