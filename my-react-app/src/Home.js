import './Home.css';
import { useNavigate } from 'react-router-dom';
import { logoutAndRedirect } from './Login';
import CheckRequests from './CheckRequests';
import { SelectWorksheet } from './WorkSheet';
import { useState } from 'react';
import { getJWTToken } from './Token';

async function Logout(token, navigate) {
  try {
    const response = await fetch('/rest/login/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: token
    });
    CheckRequests(response, token, navigate);
    if (response.ok) {
      console.log("Logout successful");
      logoutAndRedirect(navigate);
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [worksheetModal, setWorksheetModal] = useState(null);

  const token = getJWTToken();
  console.log("Token data:", token);

  // Extract user data directly from JWT token (already parsed with defaults)
  const username = token?.username || '';
  const role = token?.role || '';
  const photoUrl = token?.photo_url || '';

  return (
    <div className="home-root">
      <div className="home-topbar">
        <img src="/Logo.jpeg" alt="Logo" className="home-logo" />
        <div className="home-top-right">
          {token && role !== 'VU' ? (
            <>
              <button className="btn btn-danger btn-small" onClick={() => { Logout(token, navigate); }}>Logout</button>
              <span>Logged in as: {username}</span>
              {photoUrl && (
                <div className="profile-picture-container">
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="profile-picture"
                    onClick={() => window.open(photoUrl, '_blank')}
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
        <div className="home-sidebar">
          <h3>User</h3>
          <button className="btn btn-primary" onClick={() => navigate('/user/attributes')}>Edit Attributes</button>
          <button className="btn btn-info" onClick={() => navigate('/user/changePassword')}>Change Password</button>
          <button className="btn btn-info" onClick={() => navigate('/user/changeRole')}>Change Role</button>
          <button className="btn btn-info" onClick={() => navigate('/user/changeState')}>Change State</button>
          <button className="btn btn-outline" onClick={() => navigate('/user/listUsers')}>List Users</button>
          {(role === 'admin' || role === 'smbo') && (
            <>
              <h3>Worksheets</h3>
              <button className="btn btn-primary" onClick={() => navigate('/worksheet/create')}>Create Worksheet</button>
              <button className="btn btn-success" onClick={() => navigate('/worksheet/upload')}>Upload Worksheet</button>
              <button className="btn btn-info" onClick={() => setWorksheetModal('edit')}>Edit Worksheet</button>
              <button className="btn btn-info" onClick={() => setWorksheetModal('view')}>View Worksheet</button>
              <button className="btn btn-outline" onClick={() => navigate('/worksheet/list')}>List Worksheets</button>
            </>
          )}
        </div>
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
            mode={worksheetModal}
            onClose={() => setWorksheetModal(null)}
          />
        )}
      </div>
    </div>
  );
}

