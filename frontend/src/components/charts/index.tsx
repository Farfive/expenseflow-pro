'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import {
  Line,
  Bar,
  Pie,
  Doughnut
} from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Common chart options
const defaultOptions: ChartOptions<any> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: function(context: any) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            if (context.dataset.label && context.dataset.label.includes('Amount')) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(context.parsed.y);
            } else {
              label += context.parsed.y.toLocaleString();
            }
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        },
        callback: function(value: any) {
          if (typeof value === 'number') {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
          return value;
        }
      }
    }
  }
};

export interface ChartProps {
  data: ChartData<any>;
  options?: ChartOptions<any>;
  height?: number;
  onClick?: (event: any, elements: any[]) => void;
}

// Line Chart Component
export const LineChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    onClick: onClick || defaultOptions.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

// Bar Chart Component
export const BarChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    onClick: onClick || defaultOptions.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
};

// Pie Chart Component
export const PieChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    ...options,
    onClick: onClick || options.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Pie data={data} options={pieOptions} />
    </div>
  );
};

// Doughnut Chart Component
export const DoughnutChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    ...options,
    onClick: onClick || options.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Doughnut data={data} options={doughnutOptions} />
    </div>
  );
};

// Area Chart Component (Line chart with fill)
export const AreaChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  // Ensure all datasets have fill enabled
  const areaData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      fill: dataset.fill !== undefined ? dataset.fill : true,
      backgroundColor: dataset.backgroundColor || 'rgba(59, 130, 246, 0.1)',
      borderColor: dataset.borderColor || 'rgba(59, 130, 246, 1)',
      tension: dataset.tension || 0.4
    }))
  };

  const areaOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      filler: {
        propagate: false
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales,
      y: {
        ...defaultOptions.scales?.y,
        stacked: false,
        beginAtZero: true,
        ...options.scales?.y
      }
    },
    onClick: onClick || defaultOptions.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={areaData} options={areaOptions} />
    </div>
  );
};

// Horizontal Bar Chart Component
export const HorizontalBarChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const horizontalOptions = {
    ...defaultOptions,
    indexAxis: 'y' as const,
    ...options,
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            if (typeof value === 'number') {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value);
            }
            return value;
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      ...options.scales
    },
    onClick: onClick || defaultOptions.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={data} options={horizontalOptions} />
    </div>
  );
};

// Mixed Chart Component (Bar + Line)
export const MixedChart: React.FC<ChartProps> = ({ 
  data, 
  options = {}, 
  height = 300,
  onClick 
}) => {
  const mixedOptions = {
    ...defaultOptions,
    ...options,
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            if (typeof value === 'number') {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value);
            }
            return value;
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      ...options.scales
    },
    onClick: onClick || defaultOptions.onClick
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={data} options={mixedOptions} />
    </div>
  );
};

// Chart color palettes
export const chartColors = {
  primary: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
  ],
  blue: [
    '#EBF8FF', '#BEE3F8', '#90CDF4', '#63B3ED', '#4299E1',
    '#3182CE', '#2B77CB', '#2C5282', '#2A4365'
  ],
  green: [
    '#F0FFF4', '#C6F6D5', '#9AE6B4', '#68D391', '#48BB78',
    '#38A169', '#2F855A', '#276749', '#22543D'
  ],
  red: [
    '#FED7D7', '#FEB2B2', '#FC8181', '#F56565', '#E53E3E',
    '#C53030', '#9B2C2C', '#822727', '#63171B'
  ]
};

// Utility function to generate chart data
export const generateChartData = (
  labels: string[], 
  datasets: Array<{
    label: string;
    data: number[];
    type?: string;
    backgroundColor?: string | string[];
    borderColor?: string;
    yAxisID?: string;
  }>
) => {
  return {
    labels,
    datasets: datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || chartColors.primary[index % chartColors.primary.length],
      borderColor: dataset.borderColor || chartColors.primary[index % chartColors.primary.length],
      borderWidth: 2,
      tension: 0.4
    }))
  };
};

export default {
  LineChart,
  BarChart,
  PieChart,
  DoughnutChart,
  AreaChart,
  HorizontalBarChart,
  MixedChart,
  chartColors,
  generateChartData
}; 