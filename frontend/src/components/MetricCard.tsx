import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  badge?: string;
  badgeType?: 'green' | 'yellow' | 'red' | 'cyan' | 'amber' | 'neutral';
  tooltip?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  badge,
  badgeType = 'amber',
  tooltip,
  icon
}) => {
  const badgeStyles = {
    green: 'bg-emerald-950/80 text-emerald-400 border-emerald-600/40',
    yellow: 'bg-amber-950/80 text-amber-300 border-amber-600/40',
    red: 'bg-rose-950/80 text-rose-400 border-rose-600/40',
    cyan: 'bg-cyan-950/80 text-cyan-400 border-cyan-600/40',
    amber: 'bg-[#ff9800]/15 text-[#ff9800] border-[#ff9800]/40',
    neutral: 'bg-slate-900 text-slate-300 border-slate-700'
  };

  return (
    <div className="bg-[#0d131a] border border-[#1f2d3d] hover:border-[#ff9800]/50 transition-colors p-3.5 rounded flex flex-col justify-between shadow-lg relative overflow-hidden group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[#8b9bb4] font-mono flex items-center gap-1.5" title={tooltip}>
          {icon && <span className="opacity-75">{icon}</span>}
          {label}
        </span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold uppercase tracking-tight ${badgeStyles[badgeType]}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div className="text-xl lg:text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
          {value}
        </div>
        {subValue && (
          <div className="text-[11px] font-mono text-[#8b9bb4] tabular-nums">
            {subValue}
          </div>
        )}
      </div>

      {/* Bloomberg subtle orange bottom bar on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[#ff9800] transition-colors" />
    </div>
  );
};
