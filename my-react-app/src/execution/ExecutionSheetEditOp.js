import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ExecutionSheetEditOp() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TODO: Implement edit operation logic (fetch, UI, etc.)
  return (
    <div className="execution-sheet-action-container">
      <h2>Edit Operation for Execution Sheet #{id}</h2>
      <p>Edit operation page is under construction.</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
