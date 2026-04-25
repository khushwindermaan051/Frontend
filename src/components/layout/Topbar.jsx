import { Menu, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

export function Topbar({
  onMobileMenu,
  showMobileMenu = false,
  children,
  actions,
}) {
  return (
    <header className="topbar">
      {showMobileMenu && (
        <button className="mobile-menu-btn" onClick={onMobileMenu} title="Menu">
          <Menu size={20} />
        </button>
      )}
      <div className="topbar-title">{children}</div>

      <div className="topbar-actions">
        {actions}
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}

// Clickable breadcrumb segment (e.g., "Dashboard" link).
export function BreadcrumbLink({ onClick, children, title }) {
  return (
    <button
      className="plat-topbar-dashboard-btn"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

// Separator chevron between breadcrumb segments.
export function BreadcrumbSep() {
  return (
    <span className="plat-topbar-sep">
      <ChevronRight size={14} />
    </span>
  );
}

// Current/leaf breadcrumb (non-clickable).
export function BreadcrumbCurrent({ children, className = 'topbar-section' }) {
  return <span className={className}>{children}</span>;
}
