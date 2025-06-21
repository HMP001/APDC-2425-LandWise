import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';

export default function ListUsers() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
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
      .then(data => setUsers(Object.values(data)))
      .catch(err => {
        setError('Error fetching users. Please try again later.');
        console.error(err);
      });
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <>
    {topBar(navigate)}
    <div>
      <h1>List of Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id || user.username}>
            {user.name || user.username} ({user.email})
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}