// Design tokens — Cave LMDG
// Thème sombre nautique, cohérent avec le dashboard LMDG

export const T = {
  // Fonds
  sea: '#0a1628',
  deep: '#0d1f38',
  surface: '#122240',
  card: '#172b4d',
  border: '#1e3a5f',

  // Accents
  gold: '#e8c87a',
  teal: '#5bc4b0',
  rose: '#e87a7a',
  blue: '#7ab4e8',
  purple: '#b07ae8',
  green: '#1E5532', // charte print uniquement

  // Texte
  text: '#e8f0f8',
  text2: '#8ba8c8',
  muted: '#4a6888',

  // Sémantique
  up: '#5bc47a',
  down: '#e87a7a',
} as const

// Couleur de bande latérale par type de vin
export const wineTypeColor: Record<string, string> = {
  BLANC: T.gold,
  ROUGE: T.rose,
  ROSÉ: T.purple,
  BULLE: T.teal,
  'DEMI-SEC': T.blue,
}

// Emoji par type de vin (convention dashboard : pas de lucide-react)
export const wineTypeEmoji: Record<string, string> = {
  BLANC: '🥂',
  ROUGE: '🍷',
  ROSÉ: '🌸',
  BULLE: '🫧',
  'DEMI-SEC': '🍯',
}
