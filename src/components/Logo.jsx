export default function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FBF3E3" stroke="#E4DCC7" strokeWidth="2" />
      <line x1="22" y1="92" x2="98" y2="92" stroke="#C9BE9C" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      <path d="M28 88 L45 70 L62 50 L80 30" fill="none" stroke="#1E3A2B" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 70C40 68 36 64 37 58C43 58 47 62 47 68Z" fill="#9CB39A" stroke="#1E3A2B" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M62 50C56 48 51 43 52 35C60 35 65 40 65 48Z" fill="#7CA184" stroke="#1E3A2B" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M80 30C73 28 66 22 67 12C77 12 83 19 83 29Z" fill="#4C7A5E" stroke="#1E3A2B" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="80" cy="30" r="6.5" fill="#E8A23D" stroke="#C77E1F" strokeWidth="1.5" />
    </svg>
  )
}
