import { usePlatform } from '../../context/PlatformContext';

export default function PlatformPrimaryMonthlyTargets() {
  const config = usePlatform();

  return (
    <div className="plat-content">
      <div className="card">
        <div className="plat-empty">
          Primary Monthly Targets for <strong>{config.name}</strong>
          <div className="mt-hint">Coming soon.</div>
        </div>
      </div>
    </div>
  );
}
