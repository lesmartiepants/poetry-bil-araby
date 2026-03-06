import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0c0c0e',
          color: '#e7e5e4',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#C5A059' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '1.125rem', marginBottom: '2rem', maxWidth: '500px', lineHeight: 1.6 }}>
            The app encountered an unexpected error. Please refresh to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4f46e5'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6366f1'}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
