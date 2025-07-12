import './Home.css';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckRequests from './CheckRequests';
import { useState } from 'react';

async function Logout(token, navigate) {
  try {
    const response = await fetch('/rest/login/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    CheckRequests(response, token, navigate);
    if (response.ok) {
      console.log("Logout successful");
      logoutAndRedirect(navigate);
    } else if (response.status === 404) {
      console.error("User not found deleting token anyway, redirecting to home.");
      logoutAndRedirect(navigate);
    }
  } catch (error) {
    console.error("Logout error:", error);
    logoutAndRedirect(navigate);
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [worksheetModal, setWorksheetModal] = useState(null);

  const { username, photo, role, token } = JSON.parse(
    sessionStorage.getItem('userInfo') ||
    '{"username": null, "photo": null, "role": "VU", "token": null}'
  );
  console.log("User Info:", { username, photo, role, token });

  // Always show top bar
  const TopBar = (
    <div className="home-topbar">
      <img src="/Logo.jpeg" alt="Logo" className="home-logo" />
      <div className="home-top-right">
        {role === 'RU' ? (
          <>
            <button className="btn btn-danger btn-small" onClick={() => { Logout(token, navigate); }}>Logout</button>
            <span>Logged in as: {username}</span>
            {photo && (
              <div className="profile-picture-container">
                <img
                  src={photo}
                  alt="Profile"
                  className="profile-picture"
                  onClick={() => window.open(photo, '_blank')}
                  title="Click to view full size"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <span className="visitor-span">Currently navigating as Visitor</span>
            <button className="btn btn-primary btn-small" onClick={() => navigate('/login')}>Login</button>
            <button className="btn btn-success btn-small" onClick={() => navigate('/register')}>Register</button>
          </>
        )}
      </div>
    </div>
  );

  // Special home for VU or RU
  if (role === 'VU' || role === 'RU') {
    return (
      <div
        className="home-root special-home"
        style={{
          backgroundImage: 'url(/background-home.jpg)',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
        }}
      >
        {TopBar}
        <div className="special-home-container">
          <div
            className="special-home-column event-sample"
            onClick={() => navigate('/event')}
            tabIndex={0}
            role="button"
            title="Go to Events"
          >
            <h2>Upcoming Events</h2>
            <div className="sample-scroll">
              {/* Dummy event data */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div className="event-card" key={i}>
                  <h4>Event {i}</h4>
                  <p>Date: 2024-07-{10 + i}</p>
                  <p>Location: Venue {i}</p>
                  <p>Description: This is a sample event description for event {i}.</p>
                </div>
              ))}
            </div>
            <div className="sample-overlay">Click to view all events</div>
          </div>
          <div
            className="special-home-column media-sample"
            onClick={() => navigate('/media')}
            tabIndex={0}
            role="button"
            title="Go to Media"
          >
            <h2>Social Media Feed</h2>
            <div className="sample-scroll">
              {/* Dummy media data */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div className="media-card" key={i}>
                  <div className="media-header">
                    <img src={`/dummy-profile-${1}.png`} alt="User" className="media-avatar" />
                    <span>User{i}</span>
                  </div>
                  <p>This is a sample post #{i} on the social feed.</p>
                  <img src={`/dummy-media-${1}.jpg`} alt="Media" className="media-img" />
                </div>
              ))}
            </div>
            <div className="sample-overlay">Click to view social feed</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="home-root"
      style={{
        backgroundImage: 'url(/background-home.jpg)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}
    >
      <div className="home-topbar">
        <img src="/Logo.jpeg" alt="Logo" className="home-logo" />
        <div className="home-top-right">
          {username && role !== 'VU' ? (
            <>
              <button className="btn btn-danger btn-small" onClick={() => { Logout(token, navigate); }}>Logout</button>
              <span>Logged in as: {username}</span>
              {photo && (
                <div className="profile-picture-container">
                  <img
                    src={photo}
                    alt="Profile"
                    className="profile-picture"
                    onClick={() => window.open(photo, '_blank')}
                    title="Click to view full size"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <span className="visitor-span">Currently navigating as Visitor</span>
              <button className="btn btn-primary btn-small" onClick={() => navigate('/login')}>Login</button>
              <button className="btn btn-success btn-small" onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </div>
      <div className="home-main">
        {(role !== 'VU' || role !== 'RU') && (
          <div className="home-sidebar">
            <h3>User</h3>
            <button className="btn btn-primary" onClick={() => navigate('/user/attributes')}>Edit Attributes</button>
            <button className="btn btn-info" onClick={() => navigate('/user/changePassword')}>Change Password</button>
            <button className="btn btn-info" onClick={() => navigate('/user/changeRole')}>Change Role</button>
            <button className="btn btn-info" onClick={() => navigate('/user/changeState')}>Change State</button>
            <button className="btn btn-outline" onClick={() => navigate('/user/listUsers')}>List Users</button>
            {(role === 'SYSADMIN' || role === 'SMBO') && (
              <>
                <h3>Worksheets</h3>
                <button className="btn btn-primary" onClick={() => navigate('/worksheet/create')}>Create Worksheet</button>
                <button className="btn btn-success" onClick={() => navigate('/worksheet/upload')}>Upload Worksheet</button>
                <button className="btn btn-info" onClick={() => { setWorksheetModal('edit') }}>Edit Worksheet</button>
                <button className="btn btn-info" onClick={() => setWorksheetModal('view')}>View Worksheet</button>
                <button className="btn btn-outline" onClick={() => navigate('/worksheet/list')}>List Worksheets</button>
              </>
            )}
          </div>
        )}
        <div className="home-content">
          <h1>Welcome to the Home Page</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="/Logo.jpeg"
              alt="Welcome"
              style={{ width: '300px', margin: '20px 0' }}
            />
            <p>This is the main content area.</p>
            <p>Work in Progress.</p>
          </div>
        </div>
        {worksheetModal && (
          <SelectWorksheet
            key={worksheetModal}
            mode={worksheetModal}
            onClose={() => setWorksheetModal(null)}
          />
        )}
      </div>
    </div>
  );
}

function logoutAndRedirect(navigate) {
  sessionStorage.removeItem('userInfo');
  navigate('/login');
}

function SelectWorksheet({ onClose, mode }) {
  const [id, setId] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (id.trim() === '') {
      alert("Please enter a valid Worksheet ID.");
      return;
    }
    if (mode === 'view') {
      navigate(`/worksheet/view/${id}`);
    } else if (mode === 'edit') {
      navigate(`/worksheet/edit/${id}`);
    } else {
      console.error("Invalid mode specified:", mode);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Select Worksheet</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="worksheetId">Worksheet ID:</label>
          <input
            type="text"
            id="worksheetId"
            value={id}
            onChange={(e) => setId(e.target.value)}
            ref={inputRef}
            required
            autoFocus
            className="form-input"
          />
          <button type="submit" className="btn btn-primary btn-small">Go</button>
          <button type="button" className="btn btn-danger btn-small" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

