export default function CustomTick({ x, y, payload }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-45)"
      >
        {payload.value.length > 42
          ? payload.value.slice(0,42) + "..."
          : payload.value}
      </text>
    </g>
  );
}
