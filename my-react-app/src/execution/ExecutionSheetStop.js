import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ExecutionSheetStop() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TODO: Implement stop activity logic (fetch, UI, etc.)
  return (
    <div className="execution-sheet-action-container">
      <h2>Stop Activity for Execution Sheet #{id}</h2>
      <p>Activity stop page is under construction.</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
