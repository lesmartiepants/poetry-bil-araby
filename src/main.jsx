import React from 'react'
import ReactDOM from 'react-dom/client'
import DiwanApp from './app.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DiwanApp />
    </ErrorBoundary>
  </React.StrictMode>,
)
