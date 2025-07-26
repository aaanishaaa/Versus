import React from 'react';

interface NavbarProps {
  currentUser: any;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, currentPage, onNavigate, onLogout }) => {
  return (
    <nav style={{
      backgroundColor: '#2c3e50',
      padding: '15px 0',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px'
      }}>
        {/* Logo */}
        <div 
          onClick={() => onNavigate('home')}
          style={{
            fontSize: '1.8em',
            fontWeight: 'bold',
            color: '#4ecdc4',
            cursor: 'pointer'
          }}
        >
          VERSUS
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <button
            onClick={() => onNavigate('home')}
            style={{
              background: 'none',
              border: 'none',
              color: currentPage === 'home' ? '#4ecdc4' : 'white',
              fontSize: '1em',
              cursor: 'pointer',
              padding: '5px 0',
              borderBottom: currentPage === 'home' ? '2px solid #4ecdc4' : 'none'
            }}
          >
            Home
          </button>

          {currentUser && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === 'dashboard' ? '#4ecdc4' : 'white',
                  fontSize: '1em',
                  cursor: 'pointer',
                  padding: '5px 0',
                  borderBottom: currentPage === 'dashboard' ? '2px solid #4ecdc4' : 'none'
                }}
              >
                Dashboard
              </button>

              <button
                onClick={() => onNavigate('matches')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === 'matches' ? '#4ecdc4' : 'white',
                  fontSize: '1em',
                  cursor: 'pointer',
                  padding: '5px 0',
                  borderBottom: currentPage === 'matches' ? '2px solid #4ecdc4' : 'none'
                }}
              >
                Matches
              </button>

              <button
                onClick={() => onNavigate('profile')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === 'profile' ? '#4ecdc4' : 'white',
                  fontSize: '1em',
                  cursor: 'pointer',
                  padding: '5px 0',
                  borderBottom: currentPage === 'profile' ? '2px solid #4ecdc4' : 'none'
                }}
              >
                Profile
              </button>
            </>
          )}
        </div>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {currentUser ? (
            <>
              <div style={{ color: 'white', fontSize: '0.9em' }}>
                <span style={{ color: '#4ecdc4' }}>{currentUser.username}</span>
                <br />
                <span style={{ opacity: '0.7' }}>Rating: {currentUser.rating}</span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4ecdc4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              Login / Register
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
