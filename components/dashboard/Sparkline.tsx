// Pure SVG sparkline, no client JS. Used in the Career Score card.

export function Sparkline({
  values,
  width = 220,
  height = 56,
  stroke = "url(#sparkGrad)",
  fill = "url(#sparkFill)",
}: {
  values: number[]; // 0-100
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="text-xs text-white/40 italic">No data yet — run an optimization to start the trend.</div>
    );
  }
  const padded = values.length < 2 ? [...values, values[0]] : values;
  const max = 100;
  const min = 0;
  const stepX = padded.length > 1 ? width / (padded.length - 1) : width;
  const points = padded.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / (max - min)) * height;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f5b8c8" />
          <stop offset="100%" stopColor="#8fb3ff" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c9b8ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8fb3ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) =>
        i === points.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#ffffff" stroke="#f5b8c8" strokeWidth={1.5} />
        ) : null
      )}
    </svg>
  );
}
