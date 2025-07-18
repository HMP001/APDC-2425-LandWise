import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ExecutionSheetAddInfo() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TODO: Implement add info to activity logic (fetch, UI, etc.)
  return (
    <div className="execution-sheet-action-container">
      <h2>Add Info to Activity for Execution Sheet #{id}</h2>
      <p>Add info page is under construction.</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
