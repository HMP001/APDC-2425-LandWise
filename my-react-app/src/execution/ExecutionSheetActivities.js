import React, { useState } from 'react';
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
  React.useEffect(() => {
    // TODO: Replace with real role fetch
    setRole(window.localStorage.getItem('user_role') || 'PO');
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
    <div className="execution-sheet-container" style={{ maxWidth: 600, margin: '40px auto' }}>
      <h2 style={{ marginBottom: 24, color: '#2c3e50', fontWeight: 600 }}>Activity State for Execution Sheet #{executionId}</h2>
      <form onSubmit={handleFetchStatus} style={{ marginBottom: 24, background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontWeight: 500, color: '#2c3e50' }}>
            Polygon ID:
            <input
              type="text"
              value={polygonId}
              onChange={e => setPolygonId(e.target.value)}
              required
              className="form-control"
              style={{ marginLeft: 8, maxWidth: 120, display: 'inline-block' }}
            />
          </label>
          <label style={{ fontWeight: 500, color: '#2c3e50' }}>
            Operation Code:
            <input
              type="text"
              value={operationCode}
              onChange={e => setOperationCode(e.target.value)}
              required
              className="form-control"
              style={{ marginLeft: 8, maxWidth: 120, display: 'inline-block' }}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ minWidth: 120 }}>
            {loading ? 'Loading...' : 'View Status'}
          </button>
        </div>
      </form>
      {error && <div className="error-message">{error}</div>}
      {statusData && (
        <div className="status-details" style={{ marginTop: 24, background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
          <h3 style={{ color: '#007bff', marginBottom: 12 }}>
            Polygon {polygonId} - Operation: {operationCode}
          </h3>
          <div style={{ marginBottom: 8 }}><strong>Entity ID:</strong> {statusData.operation_id || statusData.id || 'N/A'}</div>
          <div style={{ marginBottom: 8 }}><strong>Status:</strong> {statusData.status || 'N/A'}</div>
          <div style={{ marginBottom: 8 }}><strong>Operator:</strong> {statusData.operator_username || 'N/A'}</div>
          <div style={{ marginBottom: 8 }}><strong>Start Date:</strong> {statusData.starting_date || 'N/A'}</div>
          <div style={{ marginBottom: 8 }}><strong>Finish Date:</strong> {statusData.finishing_date || 'N/A'}</div>
          <div style={{ marginBottom: 8 }}><strong>Last Activity Date:</strong> {statusData.last_activity_date || 'N/A'}</div>
          {statusData.activities && statusData.activities.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ color: '#2c3e50', marginBottom: 8 }}>Activities</h4>
              <ul style={{ paddingLeft: 0 }}>
                {statusData.activities.map((act, idx) => (
                  <li key={act.activity_id || idx} style={{ marginBottom: 16, background: 'white', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 12, listStyle: 'none', borderLeft: '4px solid #007bff' }}>
                    <div><strong>ID:</strong> {act.activity_id}</div>
                    <div><strong>Type:</strong> {act.type}</div>
                    <div><strong>Status:</strong> {act.status}</div>
                    <div><strong>Started By:</strong> {act.started_by}</div>
                    <div><strong>Started At:</strong> {act.started_at}</div>
                    <div><strong>Finished At:</strong> {act.finished_at || 'N/A'}</div>
                    {role === 'PO' && (
                      <div style={{ marginTop: 8 }}>
                        {act.status !== 'executado' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleStopActivity(act.activity_id)}>
                            Stop Activity
                          </button>
                        )}
                      </div>
                    )}
                    {isBO && act.finished_at && (
                      <div style={{ marginTop: 8 }}>
                        <button className="btn btn-info btn-sm" onClick={() => handleEditClick(act)}>
                          Edit Info
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {role === 'PO' && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleStartActivity}>
                Start Activity
              </button>
            </div>
          )}
        </div>
      )}
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 32 }}>Back</button>

      {/* Edit Info Modal */}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
        contentLabel="Edit Activity Info"
        ariaHideApp={false}
        style={{
          overlay: { backgroundColor: 'rgba(44, 62, 80, 0.4)', zIndex: 1000 },
          content: { maxWidth: 400, margin: 'auto', borderRadius: 10, padding: 24 }
        }}
      >
        <h3 style={{ marginBottom: 16 }}>Edit Activity Info</h3>
        {editActivity && (
          <form onSubmit={handleEditSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label>Type:<br />
                <input name="type" value={editForm.type} onChange={handleEditFormChange} className="form-control" />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Status:<br />
                <input name="status" value={editForm.status} onChange={handleEditFormChange} className="form-control" />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Finished At:<br />
                <input name="finished_at" value={editForm.finished_at} onChange={handleEditFormChange} className="form-control" />
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-danger" type="button" onClick={() => setEditModalOpen(false)} style={{ marginLeft: 12 }} disabled={editLoading}>
              Cancel
            </button>
            {editError && <div className="error-message" style={{ marginTop: 12 }}>{editError}</div>}
          </form>
        )}
      </Modal>
    </div>
    </>
  );
}
