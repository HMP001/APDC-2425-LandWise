import './App.css';
import Login from './Login';
import Register from './Register';
import List from './List';
import {Attributes, ChangePassword} from './Attributes';
import WorkSheet, {ViewWorkSheet} from './WorkSheet';
import { Route, Routes } from 'react-router-dom';
import Home from './Home';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user/listUsers" element={<List />} />
      <Route path="/user/attributes" element={<Attributes />} />
      <Route path="/user/changePassword" element={<ChangePassword />} />
      <Route path="/worksheet/create" element={<WorkSheet mode="create" />} />
      <Route path="/worksheet/edit/:id" element={<WorkSheet mode="edit" />} />
      <Route path="/worksheet/view/:id" element={<ViewWorkSheet />} />
    </Routes>
  );
}

export default App;