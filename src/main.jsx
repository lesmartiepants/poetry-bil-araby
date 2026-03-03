import React from 'react'
import ReactDOM from 'react-dom/client'
import DiwanApp from './app.jsx'
import './index.css'

// ErrorBoundary must be a class component — React currently requires class components for error boundaries.
// This is the only class component in the app; all other components are functional.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0c0c0e', color: '#e7e5e4', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>شيء ما خطأ</p>
          <p style={{ opacity: 0.6, marginBottom: '1.5rem', fontSize: '0.875rem' }}>Something went wrong. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.5rem 1.5rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DiwanApp />
    </ErrorBoundary>
  </React.StrictMode>,
)
