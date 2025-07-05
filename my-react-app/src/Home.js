import './Home.css';
import { useNavigate } from 'react-router-dom';
import { logoutAndRedirect } from './Login';
import CheckRequests from './CheckRequests';
import { SelectWorksheet } from './WorkSheet';
import { useState } from 'react';

function parseToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return { username: 'Unknown User' };
  }
};

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
  const token = sessionStorage.getItem('authToken');
  const [worksheetModal, setWorksheetModal] = useState(null);
  let username = '';
  let role = '';

  if (token) {
    try {
      username = JSON.parse(token).username; // Parse token as JSON
      role = JSON.parse(token).role || 'enduser'; // Default to 'user' if role is not present
    } catch (error) {
      username = parseToken(token).username || '';
    }
  }

  return (
    <div className="home-root">
      <div className="home-topbar">
        <img src="/Logo.jpeg" alt="Logo" className="home-logo" />
        <div className="home-top-right">
          {token ? (
            <>
              <span>Logged in as: {username}</span>
              <button className="btn btn-danger btn-small" onClick={() => { Logout(token, navigate); }}>Logout</button>
            </>
          ) : (
            <>
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

