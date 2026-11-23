import React from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  style?: React.CSSProperties;
  className?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  config = {},
  style = { width: '100%', height: '100%' },
  className = ''
}) => {
  // Default Bloomberg terminal theme layout
  const defaultLayout: Partial<Plotly.Layout> = {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(13, 19, 26, 0.7)',
    font: {
      family: 'JetBrains Mono, Menlo, monospace',
      size: 11,
      color: '#8b9bb4'
    },
    margin: { t: 36, r: 24, b: 40, l: 56 },
    xaxis: {
      gridcolor: '#1f2d3d',
      zerolinecolor: '#34465d',
      tickfont: { color: '#8b9bb4', size: 10 }
    },
    yaxis: {
      gridcolor: '#1f2d3d',
      zerolinecolor: '#34465d',
      tickfont: { color: '#8b9bb4', size: 10 }
    },
    legend: {
      orientation: 'h',
      y: 1.12,
      x: 0,
      font: { color: '#c5d1e0', size: 10 },
      bgcolor: 'rgba(8, 12, 16, 0.6)'
    },
    hoverlabel: {
      bgcolor: '#141d27',
      bordercolor: '#ff9800',
      font: { family: 'JetBrains Mono', size: 11, color: '#ffffff' }
    },
    ...layout
  };

  const defaultConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config
  };

  return (
    <div className={`w-full h-full min-h-[320px] ${className}`}>
      <Plot
        data={data}
        layout={defaultLayout}
        config={defaultConfig}
        style={style}
        useResizeHandler={true}
      />
    </div>
  );
};
