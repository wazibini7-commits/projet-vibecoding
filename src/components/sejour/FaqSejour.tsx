import type { QuestionFrequente } from '../../domain/types'
import { ROUTE_DEMANDE, ROUTE_SUIVI } from '../../utils/navigation'
import Section from '../ui/Section'
import Badge from '../ui/Badge'

/**
 * Questions fréquentes, en accordéon natif (<details>) : accessible au clavier et aux lecteurs d'écran
 * sans code supplémentaire. Les réponses encore à valider par Vanlife portent un badge « à confirmer ».
 */
export default function FaqSejour({ questions, id = 'faq' }: { questions: QuestionFrequente[]; id?: string }) {
  return (
    <Section id={id} titre="Questions fréquentes" surtitre="Bon à savoir" alternee etroite>
      <div className="faq">
        {questions.map((q) => (
          <details key={q.question} className="faq-question carte">
            <summary>{q.question}</summary>
            <div className="faq-reponse">
              <p>{q.reponse}</p>
              {q.aConfirmer && <Badge>À confirmer par Vanlife</Badge>}
            </div>
          </details>
        ))}
      </div>
      <p className="note">
        Une autre question ? Après votre <a href={ROUTE_DEMANDE}>demande</a>, écrivez à Vanlife depuis
        votre <a href={ROUTE_SUIVI}>espace de suivi</a>.
      </p>
    </Section>
  )
}
