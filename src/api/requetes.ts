// Données du serveur pour les composants React (TanStack Query) :
// mise en cache, état « chargement / erreur », nouvel essai, rafraîchissement.
import { QueryClient, useQuery } from '@tanstack/react-query'
import { lireDeparts, lireSejour } from './client'

export const cles = {
  sejour: (id: string) => ['sejour', id] as const,
  departs: (id: string) => ['departs', id] as const,
}

export function creerClientRequetes(options: { essais?: number } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: options.essais ?? 1, refetchOnWindowFocus: false },
    },
  })
}

/** Contenu du séjour : change rarement, gardé 5 minutes. */
export function useSejour(id: string) {
  return useQuery({ queryKey: cles.sejour(id), queryFn: () => lireSejour(id), staleTime: 5 * 60_000 })
}

/** Places restantes : rechargées à chaque ouverture de la page de demande. */
export function useDeparts(id: string) {
  return useQuery({ queryKey: cles.departs(id), queryFn: () => lireDeparts(id), staleTime: 0 })
}
