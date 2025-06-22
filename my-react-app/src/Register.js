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

        <label className="form-label" htmlFor="role">Profile:</label>
        <select
          className="form-input"
          id="role"
          name="role"
          value={userData.role}
          onChange={changeData}
          required
        >
          <option value="enduser">End User</option>
          <option value="admin">Admin</option>
          <option value="smbo">SMBO</option>
        </select>

        <label className="form-label" htmlFor="nif">NIF:</label>
        <input
          className="form-input"
          id="nif"
          type="text"
          name="nif"
          value={userData.nif}
          onChange={changeData}
          required
          autoComplete="nif"
        />

        <label className="form-label" htmlFor="employer">Employer:</label>
        <input
          className="form-input"
          id="employer"
          type="text"
          name="employer"
          value={userData.employer}
          onChange={changeData}
          required
          autoComplete="employer"
        />

        <label className="form-label" htmlFor="job">Job:</label>
        <input
          className="form-input"
          id="job"
          type="text"
          name="job"
          value={userData.job}
          onChange={changeData}
          required
          autoComplete="job"
        />

        <label className="form-label" htmlFor="address">Address:</label>
        <input
          className="form-input"
          id="address"
          type="text"
          name="address"
          value={userData.address}
          onChange={changeData}
          required
          autoComplete="address"
        />

        <label className="form-label" htmlFor="postal_code">Postal Code:</label>
        <input
          className="form-input"
          id="postal_code"
          type="text"
          name="postal_code"
          value={userData.postal_code}
          onChange={changeData}
          required
          autoComplete="postal_code"
        />

        <label className="form-label" htmlFor="company_nif">Company NIF:</label>
        <input
          className="form-input"
          id="company_nif"
          type="text"
          name="company_nif"
          value={userData.company_nif}
          onChange={changeData}
          required
          autoComplete="company_nif"
        />

        <label className="form-label" htmlFor="photo_url">Photo URL:</label>
        <input
          className="form-input"
          id="photo_url"
          type="text"
          name="photo_url"
          value={userData.photo_url}
          onChange={changeData}
          required
          autoComplete="photo_url"
        />

        <label className="form-label" htmlFor="cc">CC:</label>
        <input
          className="form-input"
          id="cc"
          type="text"
          name="cc"
          value={userData.cc}
          onChange={changeData}
          required
          autoComplete="cc"
        />

        <label className="form-label" htmlFor="cc_issue_date">CC Issue Date:</label>
        <input
          className="form-input"
          id="cc_issue_date"
          type="date"
          name="cc_issue_date"
          value={userData.cc_issue_date}
          onChange={changeData}
          required
          autoComplete="cc_issue_date"
        />

        <label className="form-label" htmlFor="cc_issue_place">CC Issue Place:</label>
        <input
          className="form-input"
          id="cc_issue_place"
          type="text"
          name="cc_issue_place"
          value={userData.cc_issue_place}
          onChange={changeData}
          required
          autoComplete="cc_issue_place"
        />

        <label className="form-label" htmlFor="cc_validity">CC Validity:</label>
        <input
          className="form-input"
          id="cc_validity"
          type="date"
          name="cc_validity"
          value={userData.cc_validity}
          onChange={changeData}
          required
          autoComplete="cc_validity"
        />

        <label className="form-label" htmlFor="nationality">Nationality</label>
        <input
          className="form-input"
          id="nationality"
          type="text"
          name="nationality"
          value={userData.nationality}
          onChange={changeData}
          required
          autoComplete="nationality"
        />
        <label className="form-label" htmlFor="residence_country">Residence Country</label>
        <input
          className="form-input"
          id="residence_country"
          type="text"
          name="residence_country"
          value={userData.residence_country}
          onChange={changeData}
          required
          autoComplete="residence_country"
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
    email: '',
    name: '',
    telephone: '',
    profile: 'PUBLICO',
    role: 'enduser',
    nif: '',
    employer: '',
    job: '',
    address: '',
    postal_code: '',
    company_nif: '',
    photo_url: '',
    cc: '',
    cc_issue_date: '',
    cc_issue_place: '',
    cc_validity: '',
    nationality: '',
    residence_country: ''
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
          email: userData.email,
          name: userData.name,
          telephone: userData.telephone,
          profile: userData.profile,
          role: userData.role,
          nif: userData.nif,
          employer: userData.employer,
          job: userData.job,
          address: userData.address,
          postal_code: userData.postal_code,
          company_nif: userData.company_nif,
          photo_url: userData.photo_url,
          cc: userData.cc,
          cc_issue_date: userData.cc_issue_date,
          cc_issue_place: userData.cc_issue_place,
          cc_validity: userData.cc_valid
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