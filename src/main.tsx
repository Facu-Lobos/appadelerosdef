import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-expect-error virtual module
// import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// const updateSW = registerSW({
//   onNeedRefresh() {
//     console.log('SW: New content available, click on reload button to update.')
//   },
//   onOfflineReady() {
//     console.log('SW: Show ready to work offline')
//   },
//   onRegisterError(error: any) {
//     console.warn('SW registration error', error)
//   },
// })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

