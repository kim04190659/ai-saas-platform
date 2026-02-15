'use client';

export default function PieChart() {
  const data = [
    { label: 'Direct', value: 45, color: '#3b82f6' },
    { label: 'Referral', value: 30, color: '#10b981' },
    { label: 'Social', value: 15, color: '#f59e0b' },
    { label: 'Other', value: 10, color: '#8b5cf6' },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 100;
  const center = 120;

  let currentAngle = -90; // Start from top

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
      <div className="flex items-center justify-center gap-8">
        <svg width={center * 2} height={center * 2}>
          {data.map((d, i) => {
            const percentage = (d.value / total) * 100;
            const angle = (percentage / 100) * 360;

            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = [
              `M ${center} ${center}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z',
            ].join(' ');

            currentAngle = endAngle;

            return (
              <path
                key={i}
                d={path}
                fill={d.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>

        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-gray-700">
                {d.label}: <span className="font-semibold">{d.value}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
