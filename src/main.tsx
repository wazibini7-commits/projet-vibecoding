import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { creerClientRequetes } from './api/requetes'
import '@fontsource-variable/playfair-display' // police de titres, servie localement
import './styles/global.css'

const clientRequetes = creerClientRequetes()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clientRequetes}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
