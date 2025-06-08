import React from 'react';

// Simple chart components for basic visualization
// In a real app, you'd use a library like recharts, chart.js, or d3

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  config?: any;
}

export function ChartContainer({ children, className = '', config }: ChartContainerProps) {
  return (
    <div className={`w-full h-64 ${className}`}>
      {children}
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  content?: React.ComponentType<any>;
}

export function ChartTooltip({ active, payload, label, content: Content }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  if (Content) {
    return <Content active={active} payload={payload} label={label} />;
  }

  return (
    <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
      <p className="text-sm font-medium">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  hideIndicator = false,
  indicator = 'dot',
  nameKey = 'name',
  labelKey = 'label'
}: ChartTooltipContentProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
      {!hideLabel && label && (
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {!hideIndicator && (
              <div
                className={`w-2 h-2 rounded-full ${
                  indicator === 'line' ? 'w-4 h-0.5' : ''
                }`}
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-gray-600">{entry[nameKey] || entry.dataKey}:</span>
            <span className="font-medium text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple bar chart component
interface SimpleBarChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  className?: string;
}

export function SimpleBarChart({ data, className = '' }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div className={`w-full h-full flex items-end justify-around p-4 ${className}`}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <div
            className="bg-blue-500 w-8 rounded-t"
            style={{
              height: `${(item.value / maxValue) * 200}px`,
              minHeight: '4px'
            }}
          />
          <span className="text-xs text-gray-600 text-center">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// Export aliases for common chart types
export const BarChart = SimpleBarChart;
export const LineChart = SimpleBarChart; // Simplified - would be different in real implementation
export const PieChart = SimpleBarChart; // Simplified - would be different in real implementation 