import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useParams, useNavigate } from 'react-router-dom';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionSheetActivities() {
  const { id: executionId } = useParams();
  const navigate = useNavigate();
  const [polygonId, setPolygonId] = useState('');
  const [operationCode, setOperationCode] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(''); // Should be set from auth context/cookie
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [editForm, setEditForm] = useState({ type: '', status: '', finished_at: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  // Helper: BO roles
  const isBO = ['PRBO', 'SDVBO', 'SYSBO', 'SYSADMIN'].includes(role);
  // Edit Info handlers
  const handleEditClick = (activity) => {
    setEditActivity(activity);
    setEditForm({
      type: activity.type || '',
      status: activity.status || '',
      finished_at: activity.finished_at || ''
    });
    setEditModalOpen(true);
    setEditError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch('/rest/execution/editActivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          polygon_id: Number(polygonId),
          operation_code: operationCode,
          activity_id: editActivity.activity_id,
          ...editForm
        })
      });
      if (!res.ok) throw new Error('Failed to edit activity info');
      alert('Activity info updated!');
      setEditModalOpen(false);
      setEditActivity(null);
      handleFetchStatus(new Event('submit'));
    } catch (err) {
      setEditError(err.message);
    }
    setEditLoading(false);
  };

  // Simulate getting role from cookie/localStorage (replace with real auth logic)
  useEffect(() => {
    // Get role from userInfo in sessionStorage
    const userInfoRaw = window.sessionStorage.getItem('userInfo');
    let role = 'PO';
    if (userInfoRaw) {
      try {
        const userInfo = JSON.parse(userInfoRaw);
        if (userInfo && userInfo.role) {
          role = userInfo.role;
        }
      } catch (e) {
        // fallback to PO
      }
    }
    setRole(role);
  }, []);

  const handleFetchStatus = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusData(null);
    try {
      const res = await fetch(`/rest/execution/status/${executionId}/${operationCode}/${polygonId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      console.log('Status data:', data); // Debugging log
      setStatusData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartActivity = async () => {
    // Backend expects: execution_id, polygon_id, operation_code
    try {
      const res = await fetch('/rest/execution/startActivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          polygon_id: Number(polygonId),
          operation_code: operationCode
        })
      });
      if (!res.ok) throw new Error('Failed to start activity');
      alert('Activity started!');
      handleFetchStatus(new Event('submit'));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStopActivity = async (activityId) => {
    try {
      const res = await fetch('/rest/execution/stopActivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          polygon_id: Number(polygonId),
          operation_code: operationCode,
          activity_id: activityId
        })
      });
      if (!res.ok) throw new Error('Failed to stop activity');
      alert('Activity stopped!');
      handleFetchStatus(new Event('submit'));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="execution-sheet-edit-center">
        <h2 className="execution-sheet-edit-title">Activity State for Execution Sheet #{executionId}</h2>
        <form className="execution-sheet-edit-form" onSubmit={handleFetchStatus}>
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="polygonId">Polygon ID:</label>
            <input
              id="polygonId"
              type="text"
              value={polygonId}
              onChange={e => setPolygonId(e.target.value)}
              required
              className="form-control execution-sheet-edit-input"
              placeholder="Enter polygon ID"
            />
          </div>
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="operationCode">Operation Code:</label>
            <input
              id="operationCode"
              type="text"
              value={operationCode}
              onChange={e => setOperationCode(e.target.value)}
              required
              className="form-control execution-sheet-edit-input"
              placeholder="Enter operation code"
            />
          </div>
          <div className="execution-sheet-edit-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'View Status'}
            </button>
          </div>
        </form>
        {error && <div className="error-message execution-sheet-edit-error">{error}</div>}

        {statusData && (
          <div className="status-details">
            <div className="execution-sheet-edit-form" style={{ marginTop: '24px' }}>
              <h3 className="execution-sheet-edit-modal-title">
                Polygon {polygonId} - Operation: {operationCode}
              </h3>
              <div className="execution-sheet-edit-group">
                <strong>Entity ID:</strong> <span>{statusData.operation_id || statusData.id || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Status:</strong> <span>{statusData.status || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Operator:</strong> <span>{statusData.operator_username || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Start Date:</strong> <span>{statusData.starting_date || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Finish Date:</strong> <span>{statusData.finishing_date || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Last Activity Date:</strong> <span>{statusData.last_activity_date || 'N/A'}</span>
              </div>

              {role === 'PO' && (
                <div className="execution-sheet-edit-actions" style={{ marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={handleStartActivity}>
                    Start Activity
                  </button>
                </div>
              )}
            </div>

            {statusData.activities && statusData.activities.length > 0 && (
              <div className="activities-section" style={{ marginTop: '24px', width: '100%', maxWidth: '800px' }}>
                <h4 className="execution-sheet-edit-modal-title" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  Activities
                </h4>
                <div className="activities-grid">
                  {statusData.activities.map((act, idx) => (
                    <div key={act.activity_id || idx} className="activity-card">
                      <div><strong>ID:</strong> {act.activity_id}</div>
                      <div><strong>Type:</strong> {act.type}</div>
                      <div><strong>Status:</strong> {act.status}</div>
                      <div><strong>Started By:</strong> {act.started_by}</div>
                      <div><strong>Started At:</strong> {act.started_at}</div>
                      <div><strong>Finished At:</strong> {act.finished_at || 'N/A'}</div>

                      {(role === 'PO' || isBO) && (
                        <div className="activity-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {role === 'PO' && act.status !== 'executado' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleStopActivity(act.activity_id)}>
                              Stop Activity
                            </button>
                          )}
                          {isBO && act.finished_at && (
                            <button className="btn btn-info btn-sm" onClick={() => handleEditClick(act)}>
                              Edit Info
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="execution-sheet-edit-actions" style={{ marginTop: '32px' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>

        {/* Edit Info Modal */}
        <Modal
          isOpen={editModalOpen}
          onRequestClose={() => setEditModalOpen(false)}
          contentLabel="Edit Activity Info"
          ariaHideApp={false}
          className="execution-sheet-edit-modal"
          overlayClassName="ReactModal__Overlay"
        >
          <h3 className="execution-sheet-edit-modal-title">Edit Activity Info</h3>
          {editActivity && (
            <form onSubmit={handleEditSubmit}>
              <div className="execution-sheet-edit-group">
                <label className="execution-sheet-edit-label">Type:<br />
                  <input name="type" value={editForm.type} onChange={handleEditFormChange} className="form-control execution-sheet-edit-input" />
                </label>
              </div>
              <div className="execution-sheet-edit-group">
                <label className="execution-sheet-edit-label">Status:<br />
                  <input name="status" value={editForm.status} onChange={handleEditFormChange} className="form-control execution-sheet-edit-input" />
                </label>
              </div>
              <div className="execution-sheet-edit-group">
                <label className="execution-sheet-edit-label">Finished At:<br />
                  <input name="finished_at" value={editForm.finished_at} onChange={handleEditFormChange} className="form-control execution-sheet-edit-input" />
                </label>
              </div>
              <div className="execution-sheet-edit-actions">
                <button className="btn btn-primary" type="submit" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-danger" type="button" onClick={() => setEditModalOpen(false)} disabled={editLoading}>
                  Cancel
                </button>
              </div>
              {editError && <div className="error-message" style={{ marginTop: 12 }}>{editError}</div>}
            </form>
          )}
        </Modal>
      </div>
    </>
  );
}
