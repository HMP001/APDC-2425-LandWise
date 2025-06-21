import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';
import { Link } from 'react-router-dom';
import { topBar } from './TopBar';

const RegisterForm = ({
  userData, changeData, handleSubmit
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-label" htmlFor="username">Username:</label>
        <input
          className="form-input"
          id="username"
          type="text"
          name="username"
          value={userData.username}
          onChange={changeData}
          required
          autoComplete="username"
        />

        <label className="form-label" htmlFor="password">Password:</label>
        <input
          className="form-input"
          id="password"
          type="password"
          name="password"
          value={userData.password}
          onChange={changeData}
          required
          autoComplete="new-password"
        />

        <label className="form-label" htmlFor="confirmation">Confirm Password:</label>
        <input
          className="form-input"
          id="confirmation"
          type="password"
          name="confirmation"
          value={userData.confirmation}
          onChange={changeData}
          required
          autoComplete="new-password"
        />

        <label className="form-label" htmlFor="name">Name:</label>
        <input
          className="form-input"
          id="name"
          type="text"
          name="name"
          value={userData.name}
          onChange={changeData}
          required
          autoComplete="name"
        />

        <label className="form-label" htmlFor="email">Email:</label>
        <input
          className="form-input"
          id="email"
          type="email"
          name="email"
          value={userData.email}
          onChange={changeData}
          required
          autoComplete="email"
        />

        <label className="form-label" htmlFor="telephone">Phone Number:</label>
        <input 
          className='form-input'
          id="telephone"
          type="tel"
          name="telephone"
          value={userData.telephone}
          onChange={changeData}
          required
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="profile">Profile:</label>
        <input
          className="form-input"
          id="profile"
          type="text"
          name="profile"
          value={userData.profile}
          onChange={changeData}
          required
          autoComplete="profile"
        />

      </div>
      <button type="submit">Register</button>
    </form>
  );
};


function Register() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    username: '',
    password: '',
    confirmation: '',
    name: '',
    email: '',
    telephone: '',
    profile: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (userData.password !== userData.confirmation) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/rest/register/newaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password,
          confirmation: userData.confirmation,
          name: userData.name,
          email: userData.email,
          telephone: userData.telephone,
          profile: userData.profile,
        }),
      });

      if (response.ok) {
        // Registration successful, redirect to login page
        navigate('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred while registering');
    }
  };

  return (
    <>
    {topBar(navigate)}
    <div className="AuthForm">
      <header className="AuthForm-header">
        <p>Register a new account</p>
        <RegisterForm
          userData={userData}
          changeData={handleChange}
          handleSubmit={handleSubmit}
        />
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: '10px' }}>
          <span>Already have an account? </span>
          <Link to="/rest/login" style={{color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
            Login here
          </Link>
        </div>
      </header>
    </div>
    </>
  );
}

export default Register;