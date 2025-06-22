import './App.css';
import Login from './Login';
import Register from './Register';
import List from './List';
import {Attributes, ChangePassword, ChangeRole} from './Attributes';
import WorkSheet, {ViewWorkSheet, ListWorkSheets} from './WorkSheet';
import { Route, Routes } from 'react-router-dom';
import Home from './Home';
import { Navigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';

const GOOGLE_MAP_LIBRARIES = ['drawing'];

function App() {
  return (
    <LoadScript
      googleMapsApiKey='AIzaSyCezGPnKTx3HfCx30coXZabciGCyywKRes'
      libraries={GOOGLE_MAP_LIBRARIES}
    >
    <Routes>
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user/listUsers" element={<List />} />
      <Route path="/user/attributes" element={<Attributes />} />
      <Route path="/user/changePassword" element={<ChangePassword />} />
      <Route path="/user/changeRole" element={<ChangeRole />} />
      <Route path="/worksheet/create" element={<WorkSheet mode="create" />} />
      <Route path="/worksheet/edit/:id" element={<WorkSheet mode="edit" />} />
      <Route path="/worksheet/view/:id" element={<ViewWorkSheet />} />
      <Route path="/worksheet/list" element={<ListWorkSheets />} />
    </Routes>
    </LoadScript>
  );
}

export default App;