import { memo } from 'react';
import { Sun, Monitor, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function ThemeToggleImpl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-toggle">
      <button
        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light theme"
      >
        <Sun size={14} />
      </button>
      <button
        className={`theme-btn ${theme === 'default' ? 'active' : ''}`}
        onClick={() => setTheme('default')}
        title="System default"
      >
        <Monitor size={14} />
      </button>
      <button
        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark theme"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}

export default memo(ThemeToggleImpl);
