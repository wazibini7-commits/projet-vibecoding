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
  /** Adresse publique du site : utilisée dans les liens envoyés par e-mail. */
  siteUrl: process.env.SITE_URL ?? 'http://localhost:5173',
  /** À mettre à true en production (site en HTTPS) : le cookie de session n'est alors jamais envoyé en clair. */
  cookieSecurise: process.env.COOKIE_SECURE === 'true',

  emails: {
    /** Expéditeur affiché. Domaine « .example » par défaut : réservé, il ne peut appartenir à personne. */
    expediteur: process.env.EMAIL_EXPEDITEUR ?? 'Vanlife <reservations@vanlife.example>',
    /** Adresse de l'équipe Vanlife, qui reçoit une notification à chaque nouvelle demande. */
    equipe: process.env.EMAIL_EQUIPE ?? 'equipe@vanlife.example',
    /** Fréquence de passage sur la file d'envoi. */
    intervalleMs: Number(process.env.EMAIL_INTERVALLE_MS ?? 15_000),
    smtp: {
      // Par défaut : Mailpit (docker-compose.yml), qui capture les e-mails sans les envoyer.
      hote: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      securise: process.env.SMTP_SECURE === 'true',
      utilisateur: process.env.SMTP_USER || undefined,
      motDePasse: process.env.SMTP_PASS || undefined,
    },
  },
}
