import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SharedPlantView from './components/SharedPlantView'
import { registerServiceWorker } from './registerSW'
import './styles.css'

// No router dependency needed for a single extra public route — just check
// the path once at load time.
const shareMatch = window.location.pathname.match(/^\/share\/([a-zA-Z0-9-]+)/)

const root = shareMatch
  ? <SharedPlantView token={shareMatch[1]} />
  : <App />

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {root}
  </React.StrictMode>
)

registerServiceWorker()
