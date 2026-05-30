import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { bootstrapLanguage } from './i18n/bootstrapLanguage'
import { ToastProvider } from './components/ui/ToastProvider'

bootstrapLanguage().catch(() => null)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
)
