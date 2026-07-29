import { useMemo, useState } from 'react'
import PlantCard, { waterStatus } from './PlantCard'
import CalendarView from './CalendarView'

export default function Dashboard({
  t, plants, entries, rainfallMm, rainThreshold, onOpenPlant, onAddPlant, onWaterAllDue,
}) {
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [sortBy, setSortBy] = useState('nextWater')

  const duePlantIds = plants
    .filter((p) => waterStatus(p, entries).diff <= 0)
    .map((p) => p.id)

  const visiblePlants = useMemo(() => {
    let list = plants.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    if (overdueOnly) {
      list = list.filter((p) => waterStatus(p, entries).diff <= 0)
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return waterStatus(a, entries).diff - waterStatus(b, entries).diff
    })
    return list
  }, [plants, entries, search, overdueOnly, sortBy])

  return (
    <main>
      <div className="section-head">
        <div>
          <h2>{t('dashTitle')}</h2>
          <div className="sub">{t('dashSub')}</div>
        </div>
        <div className="view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>{t('viewGrid')}</button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>{t('viewCalendar')}</button>
        </div>
      </div>

      {plants.length > 0 && (
        <div className="bulk-water-row">
          <button
            className="btn btn-primary btn-sm"
            disabled={duePlantIds.length === 0}
            onClick={() => onWaterAllDue(duePlantIds)}
          >
            {duePlantIds.length > 0 ? `${t('waterAllDue')} (${duePlantIds.length})` : t('noneDueToday')}
          </button>
        </div>
      )}

      {plants.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto' }}>
            <path d="M24 40C18 34 14 26 14 20C14 13 18.5 9 24 9C29.5 9 34 13 34 20C34 26 30 34 24 40Z" fill="none" stroke="#9CB39A" strokeWidth="2" />
            <path d="M24 40V16" stroke="#9CB39A" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3>{t('emptyH')}</h3>
          <p>{t('emptyP')}</p>
          <button className="btn btn-primary" onClick={onAddPlant}>{t('emptyBtn')}</button>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView t={t} plants={plants} entries={entries} onOpenPlant={onOpenPlant} />
      ) : (
        <>
          <div className="dash-toolbar">
            <input
              type="text"
              value={search}
              placeholder={t('searchPlants')}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label>
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
              {t('filterOverdueOnly')}
            </label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="nextWater">{t('sortNextWater')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
          </div>

          {visiblePlants.length === 0 ? (
            <div className="empty"><p>{t('noMatches')}</p></div>
          ) : (
            <div className="grid">
              {visiblePlants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  entries={entries.filter((e) => e.plant_id === plant.id)}
                  t={t}
                  onOpen={onOpenPlant}
                  rainfallMm={rainfallMm}
                  rainThreshold={rainThreshold}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
