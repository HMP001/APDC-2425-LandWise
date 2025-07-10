import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './List.css';

export default function ListUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Prevent state updates if unmounted

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const request = await fetch('/rest/utils/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        CheckRequests(request, navigate);

        const data = await request.json();
        if (isMounted) setUsers(Object.values(data));
      } catch (err) {
        if (isMounted) setError('Error fetching users. Please try again later.');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();

    return () => { isMounted = false; };
  }, [navigate]);

  // Helper function to get user initials for avatar
  const getUserInitials = (user) => {
    const name = user.name || user.username || user.id || '';
    return name.toString().substring(0, 2).toUpperCase() || '?';
  };

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
        <h1 className="user-list-header">Registered Users</h1>

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
                  {sortFields(user).map(([key, value]) => (
                    <div key={key} className="user-field">
                      <span className="field-label">{key}:</span>
                      <span
                        className={
                          key === 'user_pwd' ? 'field-value password-field' : 'field-value'
                        }
                        title={key === 'user_pwd' && typeof value === 'string' ? value : undefined}
                      >
                        {key === 'user_creation_time' && typeof value === 'object' && value !== null
                          ? formatTimestamp(value)
                          : value}
                      </span>
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

function formatTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleString();
  }
  return JSON.stringify(ts);
};

const FIELD_ORDER = [
  'id', 'username', 'user_name', 'user_email', "user_pwd", 'user_role', 'user_account_state'
];

function sortFields(user) {
  const entries = Object.entries(user);
  // Sort by FIELD_ORDER, then the rest alphabetically
  return entries.sort(([a], [b]) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
};