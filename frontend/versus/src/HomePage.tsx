import React from 'react';

interface HomePageProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ currentUser, onNavigate }) => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '60px 20px',
        borderRadius: '10px',
        marginBottom: '40px'
      }}>
        <h1 style={{ fontSize: '3.5em', margin: '0 0 20px 0', fontWeight: 'bold' }}>
          VERSUS
        </h1>
        <p style={{ fontSize: '1.3em', margin: '0 0 30px 0', opacity: '0.9' }}>
          The Ultimate Gaming Platform for Competitive Players
        </p>
        {!currentUser ? (
          <div>
            <button 
              onClick={() => onNavigate('auth')}
              style={{
                padding: '15px 30px',
                fontSize: '1.1em',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
                marginRight: '15px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff5252'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6b6b'}
            >
              Get Started
            </button>
            <button 
              onClick={() => onNavigate('about')}
              style={{
                padding: '15px 30px',
                fontSize: '1.1em',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '30px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#667eea';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'white';
              }}
            >
              Learn More
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 10px 0' }}>Welcome back, {currentUser.username}!</h2>
            <p style={{ margin: '0 0 20px 0' }}>Rating: {currentUser.rating} • Ready to compete?</p>
            <button 
              onClick={() => onNavigate('dashboard')}
              style={{
                padding: '15px 30px',
                fontSize: '1.1em',
                backgroundColor: '#4ecdc4',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer'
              }}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.5em' }}>
          Why Choose Versus?
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px'
        }}>
          <div style={{
            padding: '30px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎮</div>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>Competitive Gaming</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Challenge players from around the world in intense 1v1 and 3v3 matches. 
              Climb the leaderboards and prove your skills.
            </p>
          </div>

          <div style={{
            padding: '30px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>⭐</div>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>Rating System</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Our advanced ELO rating system ensures fair matchmaking. 
              Watch your rating grow as you improve and win matches.
            </p>
          </div>

          <div style={{
            padding: '30px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>📊</div>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>Match History</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Track your progress with detailed match history. 
              Analyze your performance and learn from every game.
            </p>
          </div>
        </div>
      </div>

      {/* Game Modes Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.5em' }}>
          Game Modes
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '25px',
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            borderRadius: '10px',
            color: 'white',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.5em' }}>1v1 Duels</h3>
            <p style={{ margin: '0', opacity: '0.9' }}>
              Face off against a single opponent in intense head-to-head battles.
            </p>
          </div>

          <div style={{
            padding: '25px',
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            borderRadius: '10px',
            color: '#333',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.5em' }}>3v3 Teams</h3>
            <p style={{ margin: '0', opacity: '0.8' }}>
              Team up with friends or compete with random players in strategic team matches.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '40px 20px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '30px', fontSize: '2.5em' }}>Platform Stats</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '30px'
        }}>
          <div>
            <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#4ecdc4' }}>10K+</div>
            <div style={{ opacity: '0.8' }}>Active Players</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#4ecdc4' }}>50K+</div>
            <div style={{ opacity: '0.8' }}>Matches Played</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#4ecdc4' }}>24/7</div>
            <div style={{ opacity: '0.8' }}>Online Support</div>
          </div>
        </div>
      </div>
    </div>
  );
};
