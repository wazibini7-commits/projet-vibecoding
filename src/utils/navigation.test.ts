import { describe, expect, it } from 'vitest'
import { lireRoute } from './navigation'

describe('lireRoute', () => {
  it.each([
    ['', { page: 'accueil' }],
    ['#/', { page: 'accueil' }],
    ['#/demande', { page: 'demande' }],
    ['#/demande/', { page: 'demande' }],
    ['#/inconnue', { page: 'accueil' }],
    ['#programme', { page: 'accueil', ancre: 'programme' }],
    ['#galerie', { page: 'accueil', ancre: 'galerie' }],
  ])('%s', (hash, attendu) => {
    expect(lireRoute(hash)).toEqual(attendu)
  })
})
