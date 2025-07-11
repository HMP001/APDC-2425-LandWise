import './App.css';
import Login from './Login';
import Register from './Register';
import List from './List';
import { Attributes, ChangePassword, ChangeRole, ChangeState } from './Attributes';
import WorkSheet, { ViewWorkSheet, ListWorkSheets, UploadWorkSheet } from './WorkSheet';
import { ViewExecutionSheet } from './ExecutionSheet';
import { Route, Routes } from 'react-router-dom';
import Home from './Home';
import { useNavigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';

const GOOGLE_MAP_LIBRARIES = ['drawing'];

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
      />
      <LoadScript
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAP_LIBRARIES}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/user/listUsers" element={<List />} />
          <Route path="/user/attributes" element={<Attributes />} />
          <Route path="/user/changePassword" element={<ChangePassword />} />
          <Route path="/user/changeRole" element={<ChangeRole />} />
          <Route path="/user/changeState" element={<ChangeState />} />
          <Route path="/worksheet/create" element={<WorkSheet mode="create" />} />
          <Route path="/worksheet/upload" element={<UploadWorkSheet />} />
          <Route path="/worksheet/edit/:id" element={<WorkSheet mode="edit" />} />
          <Route path="/worksheet/view/:id" element={<ViewWorkSheet />} />
          <Route path="/worksheet/list" element={<ListWorkSheets />} />
          <Route path="/worksheet/upload" element={<UploadWorkSheet />} />
          <Route path="/executionsheet/:id" element={<ViewExecutionSheet />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </LoadScript>
    </>
  );
}

function NotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="not-found-container">
      <h1 className="not-found-title">404</h1>
      <h2 className="not-found-subtitle">Page Not Found</h2>
      <p className="not-found-description">
        The page you're looking for doesn't exist.
      </p>
      <p className="not-found-countdown">
        Redirecting to home in {countdown} seconds...
      </p>
      <button
        onClick={() => navigate('/')}
        className="not-found-button"
      >
        Go Home Now
      </button>
    </div>
  );
}

export default App;