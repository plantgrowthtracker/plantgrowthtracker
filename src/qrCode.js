import QRCode from 'qrcode'

// Generates a QR code (as a data URL PNG) pointing at a quick-access URL for
// one plant. Scanning it opens /plant/<id> — see main.jsx for the routing —
// which requires being logged in as the owner or an accepted collaborator;
// anyone else just gets redirected to the login screen.
export async function generatePlantQrDataUrl(plantId) {
  const url = `${window.location.origin}/plant/${plantId}`
  return QRCode.toDataURL(url, { width: 320, margin: 2 })
}

export function plantQuickAccessUrl(plantId) {
  return `${window.location.origin}/plant/${plantId}`
}
