import { useMemo, useState } from 'react'

const dayMs = 86400000

// Projects forward from a plant's last-watered date (or added date) in
// interval-sized steps to find every due date that falls within the
// visible month, so the calendar can show more than just the single
// "next due" date per plant.
function dueDatesInMonth(plant, entries, year, month) {
  const waterEntries = entries
    .filter((e) => e.plant_id === plant.id && e.type === 'water')
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
  const baseline = waterEntries.length
    ? waterEntries[waterEntries.length - 1].entry_date
    : plant.added_date

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const dates = []
  let cursor = new Date(baseline)
  cursor.setDate(cursor.getDate() + plant.watering_interval_days)
  // Cap iterations defensively — a month has at most ~31 due dates even
  // for a daily-watered plant, but guard against a pathological interval.
  let guard = 0
  while (cursor <= monthEnd && guard < 200) {
    if (cursor >= monthStart) dates.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + plant.watering_interval_days * dayMs)
    guard += 1
  }
  return dates
}

export default function CalendarView({ t, plants, entries, onOpenPlant }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const { year, month } = cursor

  const dueByDate = useMemo(() => {
    const map = {}
    for (const plant of plants) {
      for (const date of dueDatesInMonth(plant, entries, year, month)) {
        if (!map[date]) map[date] = []
        map[date].push(plant)
      }
    }
    return map
  }, [plants, entries, year, month])

  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay()
  const todayStr = new Date().toISOString().slice(0, 10)

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function prevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
  }
  function nextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
  }

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>{t('calPrevMonth')}</button>
        <strong>{monthLabel}</strong>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>{t('calNextMonth')}</button>
      </div>

      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div className="cal-weekday" key={i}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div className="cal-cell cal-empty" key={i} />
          const dateStr = new Date(year, month, day).toISOString().slice(0, 10)
          const due = dueByDate[dateStr] || []
          return (
            <div className={`cal-cell ${dateStr === todayStr ? 'cal-today' : ''}`} key={i}>
              <div className="cal-daynum">{day}</div>
              {due.length > 0 && (
                <div className="cal-due-list">
                  {due.slice(0, 3).map((p) => (
                    <div key={p.id} className="cal-due-chip" title={p.name} onClick={() => onOpenPlant(p.id)}>
                      {p.name}
                    </div>
                  ))}
                  {due.length > 3 && <div className="cal-due-more">+{due.length - 3}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
