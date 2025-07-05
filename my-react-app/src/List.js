import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './List.css';
import { getRawToken } from './Token';

export default function ListUsers() {
  const navigate = useNavigate();
  const token = getRawToken();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    setLoading(true);
    const response = fetch('/rest/utils/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: token
    });
    CheckRequests(response, token, navigate);
    response
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        setUsers(Object.values(data));
        setLoading(false);
      })
      .catch(err => {
        setError('Error fetching users. Please try again later.');
        setLoading(false);
        console.error(err);
      });
  }, [token, navigate]);

  // Helper function to get user initials for avatar
  const getUserInitials = (user) => {
    const name = user.name || user.username || user.id || '';
    return name.toString().substring(0, 2).toUpperCase() || '?';
  };

  if (!token) {
    return (
      <>
        {topBar(navigate)}
        <div className="error-container">
          <p>Error: No authentication token found. Redirecting to log in.</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {topBar(navigate)}
        <div className="error-container">
          <p>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {topBar(navigate)}
      <div className="user-list-container">
        <h1 className="user-list-header">Team Members</h1>

        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No users found</h3>
            <p>There are currently no users in the system.</p>
          </div>
        ) : (
          <ul className="users-grid">
            {users.map((user, userIndex) => (
              <li key={user.id || user.username || userIndex} className="user-card">
                <div className="user-avatar">
                  {getUserInitials(user)}
                </div>
                <div className="user-info">
                  {Object.entries(user).map(([key, value]) => (
                    <div key={key} className="user-field">
                      <span className="field-label">{key}:</span>
                      <span className="field-value">{value}</span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}