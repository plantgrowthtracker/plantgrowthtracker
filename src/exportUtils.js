import { jsPDF } from "jspdf"

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  const str = String(value ?? "")
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

// Exports every plant + every log entry the person has as one CSV file —
// a plain personal backup, separate from the presentation-focused PDF below.
export function exportAllDataCsv(plants, entries) {
  const rows = [
    ["plant_name", "species", "added_date", "watering_interval_days", "entry_type", "entry_date", "note", "height_cm", "health_rating"],
  ]
  const plantById = Object.fromEntries(plants.map((p) => [p.id, p]))

  for (const plant of plants) {
    rows.push([plant.name, plant.species || "", plant.added_date, plant.watering_interval_days, "", "", "", "", ""])
  }
  for (const entry of entries) {
    const plant = plantById[entry.plant_id]
    rows.push([
      plant?.name || "",
      plant?.species || "",
      "",
      "",
      entry.type,
      entry.entry_date,
      entry.note || "",
      entry.height_cm ?? "",
      entry.health_rating ?? "",
    ])
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n")
  downloadBlob(csv, "plantgrowthtracker-export.csv", "text/csv;charset=utf-8")
}

// Exports one plant's care history as a simple, readable PDF — plant info
// up top, then a chronological list of every watering/pesticide/photo entry.
export function exportPlantHistoryPdf(plant, entries) {
  const doc = new jsPDF()
  const marginX = 14
  let y = 20

  doc.setFontSize(18)
  doc.text(plant.name, marginX, y)
  y += 8

  doc.setFontSize(11)
  if (plant.species) {
    doc.text(`Species: ${plant.species}`, marginX, y)
    y += 6
  }
  doc.text(`Added: ${plant.added_date}`, marginX, y)
  y += 6
  doc.text(`Watering interval: every ${plant.watering_interval_days} day(s)`, marginX, y)
  y += 10

  doc.setFontSize(13)
  doc.text("Care history", marginX, y)
  y += 8
  doc.setFontSize(10)

  const sorted = [...entries].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
  const typeLabel = { water: "Watering", pesticide: "Pesticide", photo: "Photo" }

  for (const entry of sorted) {
    if (y > 280) {
      doc.addPage()
      y = 20
    }
    let line = `${entry.entry_date}  —  ${typeLabel[entry.type] || entry.type}`
    if (entry.height_cm != null) line += `  |  Height: ${entry.height_cm} cm`
    if (entry.health_rating != null) line += `  |  Health: ${entry.health_rating}/5`
    doc.text(line, marginX, y)
    y += 5
    if (entry.note) {
      const wrapped = doc.splitTextToSize(entry.note, 180)
      doc.text(wrapped, marginX + 4, y)
      y += wrapped.length * 5
    }
    y += 3
  }

  doc.save(`${plant.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-history.pdf`)
}
