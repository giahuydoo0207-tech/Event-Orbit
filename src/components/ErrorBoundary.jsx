import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('EduAI Orbit runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 text-text-primary">
          <div className="text-center max-w-sm space-y-4">
            <p className="text-lg font-bold text-navy">
              Something went wrong
            </p>
            <p className="text-sm text-text-secondary">
              This section couldn't load. Try going back or refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="px-5 py-2.5 bg-navy text-white text-xs font-semibold uppercase tracking-wider rounded hover:bg-navy-light transition-all"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
