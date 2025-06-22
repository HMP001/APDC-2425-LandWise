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
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return {username: 'Unknown User'};
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
            <button onClick={() => {Logout(token, navigate);}}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')}>Login</button>
            <button onClick={() => navigate('/register')}>Register</button>
          </>
        )}
      </div>
      </div>
      <div className="home-main">
        <div className="home-sidebar">
          <h3>User</h3>
          <button onClick={() => navigate('/user/attributes')}>Edit Attributes</button>
          <button onClick={() => navigate('/user/changePassword')}>Change Password</button>
          <button onClick={() => navigate('/user/changeRole')}>Change Role</button>
          <button onClick={() => navigate('/user/listUsers')}>List Users</button>
          { (role === 'admin' || role === 'smbo') && (
            <>
              <h3>Worksheets</h3>
              <button onClick={() => navigate('/worksheet/create')}>Create Worksheet</button>
              <button onClick={() => setWorksheetModal('edit') }>Edit Worksheet</button>
              <button onClick={() => setWorksheetModal('view') }>View Worksheet</button>
              <button onClick={() => navigate('/worksheet/list')}>List Worksheets</button>
            </>
          )}
        </div>
        <div className="home-content">
          <h1>Welcome to the Home Page</h1>
          <p>This is the main content area.</p>
          <p>Work in Progress.</p>
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

