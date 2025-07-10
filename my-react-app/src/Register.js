import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';
import { Link } from 'react-router-dom';
import { topBar } from './TopBar';
import roles from './roles'; // Assuming roles.js exports the roles object
import { requiredByRoleToRegister, requiredByRoleToActivate } from './RequiredByRole';

const RegisterForm = ({
  userData, changeData, handleSubmit, getFieldRequirement, showWarning, loading
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
          required={getFieldRequirement('username') === 'required'}
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
          required={getFieldRequirement('pwd') === 'required'}
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
          required={getFieldRequirement('pwd') === 'required'}
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
          required={getFieldRequirement('name') === 'required'}
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
          required={getFieldRequirement('email') === 'required'}
          autoComplete="email"
        />

        <label className="form-label" htmlFor="telephone1">Phone Number:</label>
        <input
          className='form-input'
          id="telephone1"
          type="tel"
          name="telephone1"
          value={userData.telephone1}
          onChange={changeData}
          required={getFieldRequirement('phone1') === 'required'}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="telephone2">Secondary Phone Number:</label>
        <input
          className="form-input"
          id="telephone2"
          type="tel"
          name="telephone2"
          value={userData.telephone2}
          onChange={changeData}
          required={getFieldRequirement('phone2') === 'required'}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="profile">Profile:</label>
        <select
          className="form-input"
          id="profile"
          name="profile"
          value={userData.profile}
          onChange={changeData}
        >
          <option value="PUBLICO">Public</option>
          <option value="PRIVADO">Private</option>
        </select>

        <label className="form-label" htmlFor="role">Role:</label>
        <select
          className="form-input"
          id="role"
          name="role"
          value={userData.role}
          onChange={changeData}
          required
        >
          {Object.entries(roles)
            .filter(([key]) => key !== 'root' && key !== 'visitor')
            .map(([key, role]) => (
              <option key={key} value={role.value}>
                {role.name}
              </option>
            ))}
        </select>

        <label className="form-label" htmlFor="nif">NIF:</label>
        <input
          className="form-input"
          id="nif"
          type="text"
          name="nif"
          value={userData.nif}
          onChange={changeData}
          required={getFieldRequirement('nif') === 'required'}
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
          required={getFieldRequirement('employer') === 'required'}
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
          required={getFieldRequirement('job') === 'required'}
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
          required={getFieldRequirement('address') === 'required'}
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
          required={getFieldRequirement('postalCode') === 'required'}
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
          required={getFieldRequirement('company_nif') === 'required'}
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
          required={getFieldRequirement('photo_url') === 'required'}
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
          required={getFieldRequirement('cc') === 'required'}
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
          required={getFieldRequirement('emissionCC') === 'required'}
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
          required={getFieldRequirement('emissionLocalCC') === 'required'}
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
          required={getFieldRequirement('validityCC') === 'required'}
          autoComplete="cc_validity"
        />

        <label className="form-label" htmlFor="birth_date">Birth Date</label>
        <input
          className="form-input"
          id="birth_date"
          type="date"
          name="birth_date"
          value={userData.birth_date}
          onChange={changeData}
          required={getFieldRequirement('birthDate') === 'required'}
          autoComplete="birth_date"
        />

        <label className="form-label" htmlFor="nationality">Nationality</label>
        <input
          className="form-input"
          id="nationality"
          type="text"
          name="nationality"
          value={userData.nationality}
          onChange={changeData}
          required={getFieldRequirement('nationality') === 'required'}
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
          required={getFieldRequirement('residence') === 'required'}
          autoComplete="residence_country"
        />

      </div>
      {!showWarning && (
        <button 
          className="btn btn-primary btn-large" 
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              Registering...
              <span className="spinner"/>
            </>
          ) : (
          'Register'
          )}
        </button>
      )}
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
    telephone1: '',
    telephone2: '',
    profile: 'PUBLICO',
    role: 'RU',
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
    birth_date: '',
    nationality: '',
    residence_country: ''
  });

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get required fields for current role
  const requiredFields = requiredByRoleToRegister[userData.role] || [];
  const activationFields = requiredByRoleToActivate[userData.role] || [];

  // Function to determine if a field is required, optional with warning, or fully optional
  const getFieldRequirement = (fieldName) => {
    return requiredFields.includes(fieldName) ? 'required' : 'optional';
  };

  // Field mapping from form names to requirement names
  const fieldMapping = {
    username: 'username',
    password: 'pwd',
    confirmation: 'pwd',
    email: 'email',
    name: 'name',
    telephone1: 'phone1',
    telephone2: 'phone2',
    nif: 'nif',
    employer: 'employer',
    job: 'job',
    address: 'address',
    postal_code: 'postalCode',
    cc: 'cc',
    cc_issue_date: 'emissionCC',
    cc_issue_place: 'emissionLocalCC',
    cc_validity: 'validityCC',
    birth_date: 'birthDate',
    nationality: 'nationality',
    residence_country: 'residence'
  };

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
    setError('');
    setWarning('');
  };

  const validateForm = () => {
    const missingRequired = [];
    const missingForActivation = [];

    // Check all form fields
    Object.keys(fieldMapping).forEach(formField => {
      const reqField = fieldMapping[formField];
      const isRequiredForRegistration = requiredFields.includes(reqField);
      const isRequiredForActivation = activationFields.includes(reqField);
      const isEmpty = !userData[formField] || userData[formField].trim() === '';

      if (isEmpty) {
        if (isRequiredForRegistration) {
          missingRequired.push(formField);
        } else if (isRequiredForActivation) {
          // Fields needed for activation but not registration
          missingForActivation.push(formField);
        }
      }
    });

    return { missingRequired, missingForActivation };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setWarning("");
    setLoading(true);

    if (userData.password !== userData.confirmation) {
      setError('Passwords do not match');
      return;
    }

    const { missingRequired, missingForActivation } = validateForm();

    // Block submission if required fields are missing
    if (missingRequired.length > 0) {
      setError(`Please fill in the following required fields: ${missingRequired.join(', ')}`);
      return;
    }

    // Show warning for activation fields if not already confirmed
    if (missingForActivation.length > 0 && !showWarningConfirm) {
      setWarning(`The following fields are required for account activation: ${missingForActivation.join(', ')}. Your account will be created as INACTIVE until these are filled. Do you want to proceed?`);
      setShowWarningConfirm(true);
      return;
    }

    // Reset warning state
    setShowWarningConfirm(false);

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
          cc_validity: userData.cc_validity,
          birth_date: userData.birth_date,
          nationality: userData.nationality,
          residence_country: userData.residence_country
        }),
      });

      if (response.ok) {
        // Registration successful, redirect to login page
        navigate('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed');
        setLoading(false);
      }
    } catch (error) {
      setError('An error occurred while registering');
      setLoading(false);
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
            getFieldRequirement={(field) => getFieldRequirement(fieldMapping[field] || field)}
            showWarning={!!warning}
            loading={loading}
          />
          {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
          {warning && (
            <div style={{ backgroundColor: '#fff3cd', padding: '10px', margin: '10px 0', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
              <p style={{ color: '#856404', margin: 0 }}>{warning}</p>
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{ marginRight: '10px', padding: '5px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Proceed Anyway
                </button>
                <button
                  type="button"
                  onClick={() => { setWarning(''); setShowWarningConfirm(false); }}
                  style={{ padding: '5px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Go Back and Fill Fields
                </button>
              </div>
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <span>Already have an account? </span>
            <Link to="/rest/login" style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
              Login here
            </Link>
          </div>
        </header>
      </div>
    </>
  );
}

export default Register;