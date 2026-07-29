import Logo from './Logo'

export default function Header({
  t, lang, setLang, theme, onToggleTheme, onAddPlant, onLogout,
  onExportCsv, onUseMyLocation, userEmail, offlineCount,
}) {
  return (
    <div className="topbar">
      <div className="brand">
        <Logo className="brand-mark" />
        <div>
          <h1>{t('appTitle')}</h1>
          <span>{t('appSub')}</span>
        </div>
      </div>
      <div className="top-actions">
        {offlineCount > 0 && (
          <span className="offline-badge">{t('offlineBadge').replace('{n}', offlineCount)}</span>
        )}
        {userEmail && <span className="user-chip">{userEmail}</span>}
        <button className="theme-toggle" onClick={onToggleTheme} title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
          {theme === 'dark' ? t('lightMode') : t('darkMode')}
        </button>
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>हिं</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onUseMyLocation}>{t('setLocation')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onExportCsv}>{t('exportCsv')}</button>
        <button className="btn btn-primary" onClick={onAddPlant}>{t('addPlant')}</button>
        <button className="btn btn-ghost" onClick={onLogout}>{t('logout')}</button>
      </div>
    </div>
  )
}
