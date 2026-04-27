import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink as RouterNavLink, Link, useLocation } from 'react-router-dom';
import { Settings, ChevronDown } from 'lucide-react';
import jivoLogo from '../../assets/logos/jivo.jpg';

const SidebarContext = createContext({ isOpen: true });
export const useSidebar = () => useContext(SidebarContext);

// Default Jivo brand (used by 4 of 5 sidebars). PlatformLayout passes a custom brand.
export function JivoBrand({ onClick }) {
  const { isOpen } = useSidebar();
  const handleClick = onClick || (() => window.location.reload());
  return (
    <div className="sidebar-brand" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <img className="brand-logo-img" src={jivoLogo} alt="Jivo" />
      {isOpen && (
        <div className="brand-info">
          <span className="brand-name">Jivo</span>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  brand,
  variant = '',
  collapsible = true,
  collapsed: collapsedProp,
  onCollapsedChange,
  mobileOpen = false,
  onMobileClose,
  showSettings = true,
  settingsActive = false,
  onSettingsClick,
  settingsMenu,
  children,
}) {
  const navigate = useNavigate();
  const isControlled = collapsedProp !== undefined;
  const [collapsedState, setCollapsedState] = useState(false);
  const collapsed = isControlled ? collapsedProp : collapsedState;
  const setCollapsed = (next) => {
    const value = typeof next === 'function' ? next(collapsed) : next;
    if (!isControlled) setCollapsedState(value);
    if (onCollapsedChange) onCollapsedChange(value);
  };
  const [hoverOpen, setHoverOpen] = useState(false);
  const isOpen = !collapsible || !collapsed || hoverOpen;
  const [settingsMenuDismissed, setSettingsMenuDismissed] = useState(false);

  const handleSettings = onSettingsClick
    || (() => navigate('/dashboard', { state: { openSettings: true } }));

  const classes = [
    'sidebar',
    variant,
    collapsible && collapsed && !hoverOpen ? 'collapsed' : '',
    collapsible && hoverOpen ? 'hover-open' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <SidebarContext.Provider value={{ isOpen }}>
      {mobileOpen && onMobileClose && (
        <div className="mobile-overlay" onClick={onMobileClose} />
      )}
      <aside
        className={classes}
        onMouseEnter={collapsible && collapsed ? () => setHoverOpen(true) : undefined}
        onMouseLeave={collapsible ? () => setHoverOpen(false) : undefined}
      >
        {brand || <JivoBrand />}

        <nav className="sidebar-nav">{children}</nav>

        {showSettings && (
          <div
            className={`sidebar-settings-wrap ${settingsMenuDismissed ? 'menu-dismissed' : ''}`}
            onMouseLeave={() => setSettingsMenuDismissed(false)}
          >
            <button
              className={`sidebar-settings-btn ${settingsActive ? 'active' : ''}`}
              onClick={() => {
                setSettingsMenuDismissed(true);
                handleSettings();
              }}
              title={!isOpen ? 'Settings' : ''}
            >
              <span className="sidebar-settings-icon"><Settings size={15} /></span>
              {isOpen && <span className="nav-label">Settings</span>}
            </button>
            {settingsMenu && settingsMenu.length > 0 && (
              <div className="settings-hover-menu" role="menu">
                {settingsMenu.map((item, i) => (
                  <button
                    key={item.label || i}
                    type="button"
                    role="menuitem"
                    className={`settings-hover-item ${item.danger ? 'danger' : ''}`}
                    onClick={() => {
                      setSettingsMenuDismissed(true);
                      item.onClick?.();
                    }}
                  >
                    {item.icon && <span className="settings-hover-icon">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {collapsible && (
          <button
            className="collapse-btn"
            onClick={() => {
              setCollapsed((c) => !c);
              setHoverOpen(false);
            }}
          >
            {collapsed && !hoverOpen ? '›' : '‹'}
          </button>
        )}
      </aside>
    </SidebarContext.Provider>
  );
}

// Manual-active button nav item (page-state driven).
export function NavItem({
  icon,
  label,
  active = false,
  onClick,
  className = 'nav-platform-link',
}) {
  const { isOpen } = useSidebar();
  return (
    <button
      className={`${className} ${active ? 'active' : ''}`}
      onClick={onClick}
      title={!isOpen ? label : ''}
    >
      <span className="nav-icon">{icon}</span>
      {isOpen && <span className="nav-label">{label}</span>}
    </button>
  );
}

// Plain Link — no auto-active; renders even when isOpen is false (icon-only).
export function NavLinkItem({
  to,
  icon,
  label,
  className = 'nav-platform-link',
}) {
  const { isOpen } = useSidebar();
  return (
    <Link to={to} className={className} title={!isOpen ? label : ''}>
      <span className="nav-icon">{icon}</span>
      {isOpen && <span className="nav-label">{label}</span>}
    </Link>
  );
}

// Route-aware link — adds 'active' class when its route matches.
export function NavRouteLink({
  to,
  end,
  icon,
  label,
  className = 'plat-nav-item',
}) {
  const { isOpen } = useSidebar();
  return (
    <RouterNavLink
      to={to}
      end={end}
      className={({ isActive }) => `${className} ${isActive ? 'active' : ''}`}
      title={!isOpen ? label : ''}
    >
      {icon && <span className="nav-icon">{icon}</span>}
      {isOpen && <span className="nav-label">{label}</span>}
    </RouterNavLink>
  );
}

export function NavSection({ children }) {
  const { isOpen } = useSidebar();
  if (!isOpen) return null;
  return <div className="nav-section-title">{children}</div>;
}

export function NavDivider() {
  return <div className="nav-divider" />;
}

// Collapsible group of nav links. Opens automatically when navigating into a
// child route, but the user can close it manually and it stays closed until
// they navigate to another child route.
export function NavGroup({
  label,
  icon,
  childPaths = [],
  defaultOpen = false,
  className = 'plat-nav-item',
  children,
}) {
  const { isOpen } = useSidebar();
  const location = useLocation();
  const hasActiveChild = childPaths.some((p) => location.pathname.startsWith(p));
  const [open, setOpen] = useState(defaultOpen || hasActiveChild);
  const prevActive = useRef(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild && !prevActive.current) setOpen(true);
    prevActive.current = hasActiveChild;
  }, [hasActiveChild]);

  return (
    <div className={`nav-group ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`${className} nav-group-toggle ${hasActiveChild ? 'has-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={!isOpen ? label : ''}
      >
        {icon && <span className="nav-icon">{icon}</span>}
        {isOpen && <span className="nav-label">{label}</span>}
        {isOpen && (
          <span className={`nav-group-caret ${open ? 'open' : ''}`}>
            <ChevronDown size={14} />
          </span>
        )}
      </button>
      {isOpen && open && <div className="nav-group-children">{children}</div>}
    </div>
  );
}
