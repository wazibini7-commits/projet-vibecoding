// Envoi réel par SMTP (Nodemailer). En développement : Mailpit (localhost:1025), qui capture tout.
import nodemailer from 'nodemailer'
import type { TransportEmail } from './file'

export interface ReglagesSmtp {
  hote: string
  port: number
  securise: boolean
  utilisateur?: string
  motDePasse?: string
}

export function creerTransportSmtp(r: ReglagesSmtp): TransportEmail {
  const transporteur = nodemailer.createTransport({
    host: r.hote,
    port: r.port,
    secure: r.securise,
    auth: r.utilisateur ? { user: r.utilisateur, pass: r.motDePasse } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  return {
    async envoyer(m) {
      await transporteur.sendMail({ from: m.de, to: m.a, subject: m.sujet, text: m.texte, html: m.html })
    },
  }
}
