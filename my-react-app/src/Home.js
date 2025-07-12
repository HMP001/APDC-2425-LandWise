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

  return (
    <div className="home-root">
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
              <span>Currently navigating as Visitor</span>
              <button className="btn btn-primary btn-small" onClick={() => navigate('/login')}>Login</button>
              <button className="btn btn-success btn-small" onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </div>
      <div className="home-main">
        {role !== 'VU' && (
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
              <button className="btn btn-info" onClick={() => {setWorksheetModal('edit')}}>Edit Worksheet</button>
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

function SelectWorksheet({onClose, mode}) {
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

