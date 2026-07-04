import React from 'react';
import { cn } from '../utils';

// ==========================================
// 1. Chart Color Themes Map
// ==========================================
export const chartColors = {
  primary: '#0D47A1',   // Deep Blue
  secondary: '#42A5F5', // Sky Blue
  accent: '#FFC107',    // Amber
  success: '#10B981',   // Emerald
  warning: '#F59E0B',   // Warm Orange
  danger: '#EF4444',    // Red
  neutral: {
    dark: '#1E293B',    // text-slate-800
    light: '#94A3B8',   // text-slate-400
    grid: '#F1F5F9',    // border-slate-100
  },
  palette: [
    '#0D47A1', // Primary Deep Blue
    '#42A5F5', // Secondary Sky Blue
    '#FFC107', // Accent Amber
    '#10B981', // Emerald Success
    '#F59E0B', // Warning Orange
    '#EF4444', // Danger Red
    '#8B5CF6', // Purple Accent
    '#EC4899', // Pink Accent
  ],
};

// ==========================================
// 2. Custom Table/Chart Tooltip
// ==========================================
interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormatter?: (value: any) => string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  valueFormatter = (val) => String(val),
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-[16px] shadow-md p-4 text-left min-w-[140px]">
      {label && <p className="text-xs font-bold text-slate-400 font-heading mb-1.5">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || chartColors.primary }}
              />
              <span className="text-xs text-slate-500 font-medium">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800 font-heading">
              {valueFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 3. Axis & Grid Default Props
// ==========================================
export const defaultGridProps = {
  stroke: chartColors.neutral.grid,
  strokeDasharray: '3 3',
  vertical: false,
};

export const defaultXAxisProps = {
  stroke: '#E2E8F0', // slate-200 border line
  tickLine: false,
  tick: { fill: chartColors.neutral.light, fontSize: 10, fontWeight: 500 },
  dy: 10,
};

export const defaultYAxisProps = {
  stroke: '#E2E8F0',
  tickLine: false,
  tick: { fill: chartColors.neutral.light, fontSize: 10, fontWeight: 500 },
  dx: -6,
};
