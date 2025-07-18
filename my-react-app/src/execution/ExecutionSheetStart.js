import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ExecutionSheetStart() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TODO: Implement start activity logic (fetch, UI, etc.)
  return (
    <div className="execution-sheet-action-container">
      <h2>Start Activity for Execution Sheet #{id}</h2>
      <p>Activity start page is under construction.</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
