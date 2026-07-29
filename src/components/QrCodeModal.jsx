import { useEffect, useState } from 'react'
import { generatePlantQrDataUrl } from '../qrCode'

export default function QrCodeModal({ t, plant, show, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    let alive = true
    if (show && plant) {
      generatePlantQrDataUrl(plant.id).then((url) => { if (alive) setDataUrl(url) })
    } else {
      setDataUrl(null)
    }
    return () => { alive = false }
  }, [show, plant])

  if (!show || !plant) return null

  function handleDownload() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${plant.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <h2>{t('qrCodeTitle')}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          {dataUrl && <img src={dataUrl} alt="" style={{ width: '100%', maxWidth: 260, borderRadius: 12 }} />}
          <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={handleDownload}>{t('downloadQr')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
