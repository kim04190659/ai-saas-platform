'use client';

export default function LineChart() {
  // Simple SVG-based line chart
  const data = [
    { month: 'Jan', value: 2400 },
    { month: 'Feb', value: 1398 },
    { month: 'Mar', value: 9800 },
    { month: 'Apr', value: 3908 },
    { month: 'May', value: 4800 },
    { month: 'Jun', value: 3800 },
  ];

  const max = Math.max(...data.map((d) => d.value));
  const width = 600;
  const height = 300;
  const padding = 40;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value / max) * (height - 2 * padding));
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={height - padding - ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - ratio * (height - 2 * padding)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={padding - 10}
              y={height - padding - ratio * (height - 2 * padding)}
              textAnchor="end"
              className="text-xs fill-gray-600"
              dominantBaseline="middle"
            >
              {Math.round(max * ratio)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
          return (
            <text
              key={i}
              x={x}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {d.month}
            </text>
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((d.value / max) * (height - 2 * padding));
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#3b82f6" />
              <circle cx={x} cy={y} r="8" fill="#3b82f6" fillOpacity="0.2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
