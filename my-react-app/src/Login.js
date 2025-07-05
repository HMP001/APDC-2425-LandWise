import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './AuthForm.css';
import { topBar } from './TopBar';

const LoginForm = ({
  username,
  password,
  setUsername,
  setPassword,
  handleSubmit
}) => {

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-label" htmlFor="username">Username:</label>
        <input
          type="text"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />

        <label className="form-label" htmlFor="password">Password:</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <button className="btn btn-primary btn-large" type="submit">Log In</button>
    </form>
  );
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch('/rest/login/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (response.ok) {
        var token = await response.json();
        if (token) {
          console.log("Login successful, token received:", token);
          sessionStorage.setItem('authToken', JSON.stringify(token));
        }
        navigate('/');
      } else if (response.status === 404 || response.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        <header className="AuthForm-header">
          <p>
            Please log in to continue.
          </p>
          <LoginForm
            username={username}
            password={password}
            setUsername={setUsername}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
          />
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: '10px' }}>
            <span>Don't have an account? </span>
            <Link to="/rest/register" style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
              Register here
            </Link>
          </div>
        </header>
      </div>
    </>
  );
}

export function logoutAndRedirect(navigate) {
  sessionStorage.removeItem('authToken');
  navigate('/login');
}