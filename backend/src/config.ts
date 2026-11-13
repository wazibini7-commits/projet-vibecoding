// Réglages lus dans l'environnement (fichier .env en développement).
// Ce module doit être importé AVANT la création du client Prisma (qui lit DATABASE_URL).

try {
  process.loadEnvFile('.env')
} catch {
  // Pas de .env : variables fournies par l'environnement (hébergeur, CI…).
}

function liste(valeur: string | undefined, parDefaut: string[]): string[] {
  if (!valeur) return parDefaut
  return valeur.split(',').map((v) => v.trim()).filter(Boolean)
}

export const config = {
  port: Number(process.env.PORT ?? 3100),
  hote: process.env.HOST ?? '127.0.0.1',
  /** Sites autorisés à appeler l'API depuis un navigateur (CORS). */
  originesAutorisees: liste(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://localhost:4173']),
  niveauJournal: process.env.LOG_LEVEL ?? 'info',
}
