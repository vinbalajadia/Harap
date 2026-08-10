import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/app'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('The Harap root element is missing.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
