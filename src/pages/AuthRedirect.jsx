import React, { useEffect, useState } from 'react';

export default function AuthRedirect() {
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (token) {
      // Redirect to mobile app with token
      window.location.href = 'circle://auth/callback?token=' + encodeURIComponent(token);
    } else if (error) {
      // Redirect with error
      window.location.href = 'circle://auth/callback?error=' + encodeURIComponent(error);
    } else {
      // No token, redirect to app anyway
      window.location.href = 'circle://auth/callback?error=no_token';
    }
    
    // Fallback: if redirect doesn't work after 3 seconds, show message
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  
  if (showFallback) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Nunito', -apple-system, sans-serif",
        background: '#F8F9FA'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#FFD93D',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            ⭕
          </div>
          <h2 style={{ color: '#2D3436', marginBottom: '8px', fontSize: '24px', fontWeight: '800' }}>
            Open Circle App
          </h2>
          <p style={{ color: '#636E72', marginBottom: '24px' }}>
            If the app didn't open automatically:
          </p>
          <a 
            href={`circle://auth/callback?token=${token}`}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#FFD93D',
              color: '#2D3436',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '16px'
            }}
          >
            Open App
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: "'Nunito', -apple-system, sans-serif",
      background: '#F8F9FA'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #DFE6E9',
          borderTopColor: '#FFD93D',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#636E72', fontWeight: '600' }}>Redirecting to app...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}