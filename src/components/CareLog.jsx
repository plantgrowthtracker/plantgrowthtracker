export default function CareLog({ t, entries, onEdit, onDelete }) {
  const sorted = [...entries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
  if (sorted.length === 0) return <div className="chart-empty">{t('noLogsYet')}</div>

  const labelFor = (type) => (type === 'water' ? t('typeWater') : type === 'pesticide' ? t('typePesticide') : t('typePhoto'))
  const classFor = (type) => (type === 'water' ? 'water' : type === 'pesticide' ? 'pesticide' : '')

  return (
    <div>
      {sorted.map((e) => (
        <div className="log-row" key={e.id}>
          <span className={`type ${classFor(e.type)}`}>
            {labelFor(e.type)}{e.note ? ` · ${e.note}` : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="date">{e.entry_date}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(e)}>{t('edit')}</button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { if (window.confirm(t('confirmDeleteEntry'))) onDelete(e) }}
            >
              {t('del')}
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
