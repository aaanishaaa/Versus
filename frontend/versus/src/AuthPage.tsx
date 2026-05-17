import React, { useState } from 'react';
import { RegisterForm, LoginForm } from './AuthForms';

interface AuthPageProps {
  onAuthSuccess: (data: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{ fontSize: '3em', color: '#333', marginBottom: '10px' }}>
          Join Versus
        </h1>
        <p style={{ fontSize: '1.2em', color: '#666' }}>
          Create an account or sign in to start competing
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        maxWidth: '500px',
        margin: '0 auto 30px auto'
      }}>
        <button 
          onClick={() => setActiveTab('login')}
          style={{ 
            padding: '15px 30px',
            fontSize: '1.1em',
            backgroundColor: activeTab === 'login' ? '#4ecdc4' : '#ecf0f1',
            color: activeTab === 'login' ? 'white' : '#333',
            border: 'none',
            borderRadius: '25px 0 0 25px',
            cursor: 'pointer',
            width: '50%',
            transition: 'all 0.3s ease'
          }}
        >
          Sign In
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          style={{ 
            padding: '15px 30px',
            fontSize: '1.1em',
            backgroundColor: activeTab === 'register' ? '#4ecdc4' : '#ecf0f1',
            color: activeTab === 'register' ? 'white' : '#333',
            border: 'none',
            borderRadius: '0 25px 25px 0',
            cursor: 'pointer',
            width: '50%',
            transition: 'all 0.3s ease'
          }}
        >
          Sign Up
        </button>
      </div>

      {/* Forms Container */}
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {activeTab === 'login' ? (
          <LoginForm onSuccess={onAuthSuccess} />
        ) : (
          <RegisterForm onSuccess={onAuthSuccess} />
        )}
      </div>

      {/* Benefits Section */}
      <div style={{
        marginTop: '60px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#333', marginBottom: '30px' }}>
          Why Join Versus?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px',
          marginTop: '30px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏆</div>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>Competitive Rankings</h3>
            <p style={{ color: '#666' }}>
              Climb the leaderboards and prove you're the best
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎯</div>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>Fair Matchmaking</h3>
            <p style={{ color: '#666' }}>
              Our ELO system ensures balanced and exciting matches
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>📈</div>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>Track Progress</h3>
            <p style={{ color: '#666' }}>
              Detailed stats and match history to improve your game
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
