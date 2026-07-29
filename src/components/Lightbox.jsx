export default function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div className="lightbox show" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>&times;</button>
      <img src={src} alt="" />
    </div>
  )
}
