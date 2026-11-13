// Envoi en arrière-plan des e-mails de la file (table emails_sortants).
// - Un e-mail en échec est réessayé plus tard (1 min, 5 min, 15 min, 1 h), puis abandonné (statut ECHEC).
// - Chaque e-mail est « réservé » (EN_COURS) avant l'envoi : il ne peut pas partir deux fois,
//   même si deux traitements se chevauchent.
import type { PrismaClient } from '@prisma/client'

export interface MessageSortant {
  de: string
  a: string
  sujet: string
  texte: string
  html: string
}

/** Moyen d'envoi (SMTP en vrai, faux transport dans les tests). */
export interface TransportEmail {
  envoyer(message: MessageSortant): Promise<void>
}

/** Délai avant le 2e, 3e, 4e, 5e essai. */
export const DELAIS_NOUVEL_ESSAI_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
export const TENTATIVES_MAX = DELAIS_NOUVEL_ESSAI_MS.length + 1

export interface BilanEnvoi {
  envoyes: number
  reportes: number
  abandonnes: number
}

/** Envoie les e-mails en attente dont l'heure est venue (par lots). */
export async function traiterFileEmails(
  prisma: PrismaClient,
  transport: TransportEmail,
  options: { expediteur: string; maintenant?: Date; lot?: number },
): Promise<BilanEnvoi> {
  const maintenant = options.maintenant ?? new Date()
  const bilan: BilanEnvoi = { envoyes: 0, reportes: 0, abandonnes: 0 }
  const candidats = await prisma.emailSortant.findMany({
    where: { statut: 'EN_ATTENTE', prochaineTentative: { lte: maintenant } },
    orderBy: { id: 'asc' },
    take: options.lot ?? 20,
  })

  for (const email of candidats) {
    // Réservation : seul le premier traitement qui passe EN_ATTENTE → EN_COURS envoie l'e-mail.
    const reserve = await prisma.emailSortant.updateMany({
      where: { id: email.id, statut: 'EN_ATTENTE' },
      data: { statut: 'EN_COURS' },
    })
    if (reserve.count === 0) continue

    const tentatives = email.tentatives + 1
    try {
      await transport.envoyer({
        de: options.expediteur, a: email.destinataire, sujet: email.sujet, texte: email.texte, html: email.html,
      })
      await prisma.emailSortant.update({
        where: { id: email.id },
        data: { statut: 'ENVOYE', tentatives, envoyeLe: new Date(), derniereErreur: null },
      })
      bilan.envoyes++
    } catch (e) {
      const erreur = (e instanceof Error ? e.message : String(e)).slice(0, 500)
      const abandon = tentatives >= TENTATIVES_MAX
      await prisma.emailSortant.update({
        where: { id: email.id },
        data: abandon
          ? { statut: 'ECHEC', tentatives, derniereErreur: erreur }
          : {
            statut: 'EN_ATTENTE',
            tentatives,
            derniereErreur: erreur,
            prochaineTentative: new Date(maintenant.getTime() + DELAIS_NOUVEL_ESSAI_MS[tentatives - 1]),
          },
      })
      if (abandon) bilan.abandonnes++
      else bilan.reportes++
    }
  }
  return bilan
}

/**
 * Au démarrage : un e-mail resté EN_COURS vient d'un arrêt brutal du serveur pendant l'envoi.
 * On le remet dans la file (il pourrait, rarement, partir deux fois — préférable à ne jamais partir).
 */
export async function reprendreEmailsInterrompus(prisma: PrismaClient): Promise<number> {
  const { count } = await prisma.emailSortant.updateMany({ where: { statut: 'EN_COURS' }, data: { statut: 'EN_ATTENTE' } })
  return count
}

export interface FileEmails {
  /** Demande un passage immédiat (ex. juste après une nouvelle demande). */
  declencher(): void
  /** Arrête les passages réguliers et attend la fin du passage en cours. */
  arreter(): Promise<void>
}

/** Passage régulier sur la file + passage immédiat sur demande, sans jamais deux passages en même temps. */
export function demarrerFileEmails(options: {
  prisma: PrismaClient
  transport: TransportEmail
  expediteur: string
  intervalleMs: number
  journal: { info(o: object, m: string): void; error(o: object, m: string): void }
}): FileEmails {
  let enCours: Promise<void> | null = null
  let relancer = false
  let arrete = false

  const passage = async () => {
    try {
      const bilan = await traiterFileEmails(options.prisma, options.transport, { expediteur: options.expediteur })
      if (bilan.envoyes || bilan.reportes || bilan.abandonnes) options.journal.info(bilan, 'file des e-mails traitée')
      if (bilan.abandonnes) options.journal.error(bilan, 'e-mails abandonnés après plusieurs essais')
    } catch (e) {
      options.journal.error({ err: e }, 'traitement de la file des e-mails impossible')
    }
  }

  const declencher = () => {
    if (arrete) return
    if (enCours) { relancer = true; return }
    enCours = (async () => {
      do {
        relancer = false
        await passage()
      } while (relancer && !arrete)
      enCours = null
    })()
  }

  const minuterie = setInterval(declencher, options.intervalleMs)
  declencher()

  return {
    declencher,
    async arreter() {
      arrete = true
      clearInterval(minuterie)
      await enCours
    },
  }
}
