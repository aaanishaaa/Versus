import React from 'react';

interface DashboardProps {
  currentUser: any;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
  const testProfileAPI = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first!');
      return;
    }

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Profile data: ${JSON.stringify(data, null, 2)}`);
      } else {
        alert(`Error: ${data.msg}`);
      }
    } catch (error) {
      alert('Network error while fetching profile');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Welcome Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '10px',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em' }}>
          Welcome back, {currentUser.username}!
        </h1>
        <p style={{ margin: '0', fontSize: '1.2em', opacity: '0.9' }}>
          Current Rating: <strong>{currentUser.rating}</strong>
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Quick Actions</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <button
            onClick={() => alert('Finding 1v1 match... (Feature coming soon!)')}
            style={{
              padding: '30px',
              background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1.1em',
              textAlign: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>⚔️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Find 1v1 Match</div>
            <div style={{ fontSize: '0.9em', opacity: '0.9' }}>Challenge a random opponent</div>
          </button>

          <button
            onClick={() => alert('Finding 3v3 match... (Feature coming soon!)')}
            style={{
              padding: '30px',
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              color: '#333',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1.1em',
              textAlign: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>👥</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Find 3v3 Match</div>
            <div style={{ fontSize: '0.9em', opacity: '0.8' }}>Team up for group battles</div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            style={{
              padding: '30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1.1em',
              textAlign: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>👤</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>View Profile</div>
            <div style={{ fontSize: '0.9em', opacity: '0.9' }}>Check your stats and history</div>
          </button>
        </div>
      </div>

      {/* Player Stats */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Your Stats</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '25px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', color: '#4ecdc4', fontWeight: 'bold' }}>
              {currentUser.rating}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Current Rating</div>
          </div>

          <div style={{
            padding: '25px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', color: '#28a745', fontWeight: 'bold' }}>
              {currentUser.matchHistory?.length || 0}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Total Matches</div>
          </div>

          <div style={{
            padding: '25px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', color: '#17a2b8', fontWeight: 'bold' }}>
              {Math.floor(Math.random() * 50) + 1}
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Global Rank</div>
          </div>

          <div style={{
            padding: '25px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '2.5em', color: '#ffc107', fontWeight: 'bold' }}>
              {Math.floor(((currentUser.matchHistory?.filter((m: any) => m.result === 'win').length || 0) / Math.max(currentUser.matchHistory?.length || 1, 1)) * 100)}%
            </div>
            <div style={{ color: '#666', marginTop: '5px' }}>Win Rate</div>
          </div>
        </div>
      </div>

      {/* API Testing */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '30px',
        borderRadius: '10px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Developer Tools</h2>
        <p style={{ marginBottom: '20px', opacity: '0.8' }}>
          Test your authentication and API endpoints
        </p>
        <button
          onClick={testProfileAPI}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Profile API
        </button>
        <button
          onClick={() => alert(`Token: ${localStorage.getItem('token')?.substring(0, 50)}...`)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          View JWT Token
        </button>
      </div>
    </div>
  );
};
