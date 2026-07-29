export default function GrowthChart({ t, entries }) {
  const points = entries
    .filter((e) => e.height_cm != null)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

  if (points.length < 2) return <div className="chart-empty">{t('chartNeed')}</div>

  const w = 600, h = 220, padL = 40, padR = 20, padT = 20, padB = 30
  const heights = points.map((p) => p.height_cm)
  const minH = Math.min(...heights) * 0.9
  const maxH = Math.max(...heights) * 1.1 || 1
  const dates = points.map((p) => new Date(p.entry_date).getTime())
  const minD = Math.min(...dates)
  const maxD = Math.max(...dates) || minD + 1

  const x = (i) => padL + ((dates[i] - minD) / ((maxD - minD) || 1)) * (w - padL - padR)
  const y = (i) => padT + (1 - (heights[i] - minH) / ((maxH - minH) || 1)) * (h - padT - padB)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(i).toFixed(1)}`).join(' ')

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#E4DCC7" />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#E4DCC7" />
        <path d={path} fill="none" stroke="#4C7A5E" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(i)} r="4" fill="#E8A23D" stroke="#1E3A2B" strokeWidth="1.5" />
        ))}
        {points.map((p, i) => (
          <text key={p.id} x={x(i)} y={h - 8} fontSize="10" fill="#77806f" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {p.entry_date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}
