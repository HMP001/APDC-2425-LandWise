import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './ExecutionSheet.css';
import CheckRequests from './CheckRequests';
import { topBar } from './TopBar';
import { fetchWsNorm } from './WorkSheet';

/**
 * ExecutionSheet Component - UI for viewing and managing execution sheets
 */
const ExecutionSheet = ({ executionSheetData, onSave, onClose, isEditable = false }) => {
  const [executionSheet, setExecutionSheet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchPolygonKey, setSearchPolygonKey] = useState('');

  // Initialize execution sheet data
  useEffect(() => {
    if (executionSheetData) {
      setExecutionSheet(executionSheetData);
      setIsLoading(false);
    } else {
      // Create a sample execution sheet for demonstration
      const sampleData = createSampleExecutionSheet();
      setExecutionSheet(sampleData);
      setIsLoading(false);
    }
  }, [executionSheetData]);

  // Create sample data for demonstration
  const createSampleExecutionSheet = () => {
    return {
      id: 1,
      starting_date: "2025-07-01",
      finishing_date: "2025-07-15",
      last_activity_date: "2025-07-05",
      observations: "Weather conditions have been favorable for field operations. All equipment is functioning properly.",
      operations: [
        {
          operation_code: "PLOWING",
          area_ha_executed: 25.5,
          area_perc: 85,
          starting_date: "2025-07-01",
          finishing_date: "2025-07-03",
          observations: "Completed plowing with good soil conditions"
        },
        {
          operation_code: "SEEDING",
          area_ha_executed: 18.2,
          area_perc: 60,
          starting_date: "2025-07-04",
          finishing_date: null,
          observations: "Seeding in progress, weather permitting"
        }
      ],
      polygons_operations: [
        {
          polygon_id: 101,
          operations: [
            {
              operation_id: 1,
              status: "completed",
              starting_date: "2025-07-01",
              finishing_date: "2025-07-02",
              last_activity_date: "2025-07-02",
              observations: "Plowing completed successfully",
              tracks: [
                {
                  type: "LineString",
                  coordinates: [[10.5, 45.2], [10.6, 45.3], [10.7, 45.4]]
                }
              ]
            },
            {
              operation_id: 2,
              status: "ongoing",
              starting_date: "2025-07-04",
              finishing_date: null,
              last_activity_date: "2025-07-05",
              observations: "Seeding 60% complete",
              tracks: []
            }
          ]
        },
        {
          polygon_id: 102,
          operations: [
            {
              operation_id: 1,
              status: "assigned",
              starting_date: null,
              finishing_date: null,
              last_activity_date: null,
              observations: "Scheduled for next week",
              tracks: []
            }
          ]
        }
      ]
    };
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'ongoing': return '#ffc107';
      case 'assigned': return '#17a2b8';
      case 'unassigned': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Calculate completion percentage for polygon operations
  const getPolygonCompletionPercentage = (polygonOps) => {
    if (!polygonOps.operations.length) return 0;
    const completedOps = polygonOps.operations.filter(op => op.status === 'completed').length;
    return Math.round((completedOps / polygonOps.operations.length) * 100);
  };

  // Handle save operation
  const handleSave = () => {
    if (onSave) {
      onSave(executionSheet);
    }
    setEditMode(false);
  };

  // Handle operation status update
  const handleStatusUpdate = (polygonId, operationId, newStatus) => {
    const updatedSheet = { ...executionSheet };
    const polygonOps = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonId);
    if (polygonOps) {
      const operation = polygonOps.operations.find(op => op.operation_id === operationId);
      if (operation) {
        operation.status = newStatus;
        operation.last_activity_date = new Date().toISOString().split('T')[0];
        setExecutionSheet(updatedSheet);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="execution-sheet-container">
        <div className="loading-spinner">Loading execution sheet...</div>
      </div>
    );
  }

  if (!executionSheet) {
    return (
      <div className="execution-sheet-container">
        <div className="error-message">No execution sheet data available</div>
      </div>
    );
  }

  return (
    <div className="execution-sheet-container">
      {/* Header */}
      <div className="execution-sheet-header">
        <div className="header-title">
          <h2>Execution Sheet #{executionSheet.id}</h2>
          <div className="header-dates">
            <span>Started: {executionSheet.starting_date}</span>
            {executionSheet.finishing_date && (
              <span>Finished: {executionSheet.finishing_date}</span>
            )}
            <span>Last Activity: {executionSheet.last_activity_date}</span>
          </div>
        </div>
        <div className="header-actions">
          {isEditable && (
            <button
              className={`btn ${editMode ? 'btn-success' : 'btn-primary'}`}
              onClick={editMode ? handleSave : () => setEditMode(true)}
            >
              {editMode ? 'Save Changes' : 'Edit'}
            </button>
          )}
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="execution-sheet-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          Operations
        </button>
        <button
          className={`tab ${activeTab === 'polygons' ? 'active' : ''}`}
          onClick={() => setActiveTab('polygons')}
        >
          Polygon Operations
        </button>
        <button
          className={`tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          GPS Tracking
        </button>
      </div>

      {/* Content Area */}
      <div className="execution-sheet-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Total Operations</h3>
                <div className="summary-value">{executionSheet.operations.length}</div>
              </div>
              <div className="summary-card">
                <h3>Total Area Executed</h3>
                <div className="summary-value">
                  {executionSheet.operations.reduce((sum, op) => sum + op.area_ha_executed, 0).toFixed(1)} ha
                </div>
              </div>
              <div className="summary-card">
                <h3>Average Completion</h3>
                <div className="summary-value">
                  {Math.round(executionSheet.operations.reduce((sum, op) => sum + op.area_perc, 0) / executionSheet.operations.length)}%
                </div>
              </div>
              <div className="summary-card">
                <h3>Active Polygons</h3>
                <div className="summary-value">{executionSheet.polygons_operations.length}</div>
              </div>
            </div>

            <div className="observations-section">
              <h3>General Observations</h3>
              <div className="observations-content">
                {editMode ? (
                  <textarea
                    value={executionSheet.observations}
                    onChange={(e) => setExecutionSheet({ ...executionSheet, observations: e.target.value })}
                    rows="4"
                    className="form-control"
                  />
                ) : (
                  <p>{executionSheet.observations || 'No observations recorded.'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="operations-section">
            <h3>Operations Summary</h3>
            <div className="operations-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Operation Code</th>
                    <th>Area Executed (ha)</th>
                    <th>Completion %</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {executionSheet.operations.map((operation, index) => (
                    <tr key={index}>
                      <td>
                        <span className="operation-code">{operation.operation_code}</span>
                      </td>
                      <td>{operation.area_ha_executed}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${operation.area_perc}%` }}
                          ></div>
                          <span>{operation.area_perc}%</span>
                        </div>
                      </td>
                      <td>{operation.starting_date}</td>
                      <td>{operation.finishing_date || 'Ongoing'}</td>
                      <td>{operation.observations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'polygons' && (
          <div className="polygons-section">
            <h3>Polygon Operations</h3>
            {/* Polygon Search Bar */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search polygon key/id..."
                value={searchPolygonKey}
                onChange={e => setSearchPolygonKey(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const found = executionSheet.polygons_operations.find(
                      po => String(po.polygon_id).toLowerCase() === searchPolygonKey.trim().toLowerCase()
                    );
                    if (found) {
                      setSelectedPolygon(found.polygon_id);
                      setTimeout(() => {
                        const el = document.getElementById(`polygon-card-${found.polygon_id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 0);
                    } else {
                      alert('Polygon not found');
                    }
                  }
                }}
                className="form-control"
                style={{ maxWidth: 180 }}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const found = executionSheet.polygons_operations.find(
                    po =>
                      String(po.polygon_id).toLowerCase() === searchPolygonKey.trim().toLowerCase()
                  );
                  if (found) {
                    setSelectedPolygon(found.polygon_id);
                    setTimeout(() => {
                      const el = document.getElementById(`polygon-card-${found.polygon_id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 0);
                  } else {
                    alert('Polygon not found');
                  }
                }}
                disabled={!searchPolygonKey.trim()}
              >
                Go
              </button>
            </div>
            <div
              className="polygons-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
                maxHeight: 700, // About 3 cards tall, but flexible for card content
                overflowY: 'auto',
                padding: '8px',
                margin: '0 auto',
                width: '100%',
                boxSizing: 'border-box',
                background: '#fafbfc',
                borderRadius: 12,
                border: '1px solid #e3e6ea'
              }}
            >
              {executionSheet.polygons_operations.map((polygonOps) => (
                <div
                  key={polygonOps.polygon_id}
                  id={`polygon-card-${polygonOps.polygon_id}`}
                  className={`polygon-card ${selectedPolygon === polygonOps.polygon_id ? 'selected' : ''}`}
                  style={{
                    background: '#fff',
                    border: selectedPolygon === polygonOps.polygon_id ? '2px solid #007bff' : '1px solid #d1d5db',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    margin: 0,
                    padding: '12px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start'
                  }}
                  onClick={() => setSelectedPolygon(polygonOps.polygon_id)}
                >
                  <div className="polygon-header">
                    <h4>Polygon #{polygonOps.polygon_id}</h4>
                    <div className="completion-badge">
                      {getPolygonCompletionPercentage(polygonOps)}% Complete
                    </div>
                  </div>
                  <div className="polygon-operations">
                    {polygonOps.operations.map((operation) => (
                      <div key={operation.operation_id} className="operation-item">
                        <div className="operation-info">
                          <span className="operation-id">Operation #{operation.operation_id}</span>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(operation.status) }}
                          >
                            {operation.status}
                          </span>
                        </div>
                        {editMode && (
                          <select
                            value={operation.status}
                            onChange={(e) => handleStatusUpdate(polygonOps.polygon_id, operation.operation_id, e.target.value)}
                            className="status-select"
                          >
                            <option value="unassigned">Unassigned</option>
                            <option value="assigned">Assigned</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}
                        <div className="operation-dates">
                          {operation.starting_date && (
                            <small>Started: {operation.starting_date}</small>
                          )}
                          {operation.finishing_date && (
                            <small>Finished: {operation.finishing_date}</small>
                          )}
                        </div>
                        {operation.observations && (
                          <div className="operation-observations">
                            <small>{operation.observations}</small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="tracking-section">
            <h3>GPS Tracking Data</h3>
            {selectedPolygon ? (
              <div className="tracking-details">
                <h4>Polygon #{selectedPolygon} Tracking</h4>
                {(() => {
                  const polygonOps = executionSheet.polygons_operations.find(po => po.polygon_id === selectedPolygon);
                  return polygonOps?.operations.map((operation) => (
                    <div key={operation.operation_id} className="tracking-operation">
                      <h5>Operation #{operation.operation_id}</h5>
                      {operation.tracks && operation.tracks.length > 0 ? (
                        <div className="tracks-list">
                          {operation.tracks.map((track, index) => (
                            <div key={index} className="track-item">
                              <strong>Track {index + 1}:</strong>
                              <div className="coordinates">
                                {track.coordinates.length} GPS points recorded
                              </div>
                              <details>
                                <summary>View Coordinates</summary>
                                <div className="coordinates-list">
                                  {track.coordinates.map((coord, coordIndex) => (
                                    <div key={coordIndex} className="coordinate">
                                      Lng: {coord[0]}, Lat: {coord[1]}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No GPS tracking data recorded for this operation.</p>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="tracking-placeholder">
                <p>Select a polygon from the Polygon Operations tab to view its GPS tracking data.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default ExecutionSheet;

/**function createExecutionSheetFromWorksheet(worksheet) {
  // Ensure worksheet is normalized
  const ws = worksheet;

  // Only use features that are polygons
  const polygons = ws.features && typeof ws.features === 'object'
    ? Object.values(ws.features)
      .filter(f => f.geometry && f.geometry.type === "Polygon")
      .map(f => ({
        polygon_id: f.properties?.polygon_id || f.properties?.id || f.key || f.id
      }))
    : [];

  // Map operations per polygon
  const operations = Array.isArray(ws.operations) ? ws.operations : [];
  const polygons_operations = polygons.map(poly => {
    // Try to find per-polygon operations if present in worksheet
    let polyOps = [];
    if (ws.polygons_operations && Array.isArray(ws.polygons_operations)) {
      const found = ws.polygons_operations.find(po =>
        String(po.polygon_id) === String(poly.polygon_id || poly.id)
      );
      if (found && Array.isArray(found.operations)) {
        polyOps = found.operations.map(op => ({
          operation_code: op.operation_code,
          status: op.status || "unassigned",
          starting_date: op.starting_date || "",
          finishing_date: op.finishing_date || "",
          last_activity_date: op.last_activity_date || "",
          observations: op.observations || "",
          tracks: Array.isArray(op.tracks) ? op.tracks : [],
          activity_id: op.activity_id || ""
        }));
      }
    }
    // If not found, create default operations for each operation_code
    if (polyOps.length === 0) {
      polyOps = operations.map(op => ({
        operation_code: op.operation_code,
        status: "unassigned",
        starting_date: "",
        finishing_date: "",
        last_activity_date: "",
        observations: "",
        tracks: [],
        activity_id: ""
      }));
    }
    return {
      polygon_id: poly.polygon_id || poly.id,
      operations: polyOps
    };
  });

  return {
    id: ws.id || null, // ID will be assigned by the backend
    worksheet_id: ws.id || ws.worksheet_id,
    starting_date: ws.starting_date || "",
    finishing_date: ws.finishing_date || "",
    last_activity_date: "",
    observations: "",
    operations: operations.map(op => ({
      operation_code: op.operation_code,
      area_ha_executed: 0,
      area_perc: 0,
      starting_date: "",
      finishing_date: "",
      observations: ""
    })),
    polygons_operations
  };
}*/

export async function CreateExecutionSheet(id, setExecutionSheetData, setError, setLoading, navigate) {
  // Call backend to create execution sheet for worksheet id, then fetch it and navigate to its page
  setLoading && setLoading(true);
  setError && setError(null);
  try {
    const res = await fetch('/rest/execution/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error('Failed to create execution sheet');
    let newId = id;
    try {
      const data = await res.json();
      if (data && data.id) newId = data.id;
    } catch { }
    // Optionally fetch the execution sheet (not required if page will fetch on navigation)
    if (setExecutionSheetData) {
      const response = await fetch(`/rest/executionsheet/${newId}`);
      if (!response.ok) throw new Error('Failed to fetch execution sheet');
      const sheet = await response.json();
      setExecutionSheetData(sheet);
    }
    // Navigate to the execution sheet page
    if (navigate) {
      navigate(`/executionsheet/${newId}`);
    }
  } catch (e) {
    if (setError) setError('Failed to create or fetch execution sheet.');
    throw e;
  } finally {
    setLoading && setLoading(false);
  }
}

export function ViewExecutionSheet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [executionSheetData, setExecutionSheetData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch execution sheet if exists
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/rest/executionsheet/${id}`);
        if (response.status === 404) {
          if (mounted) setExecutionSheetData(null);
          // Do not show create prompt, just show error or export option
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch execution sheet');
        const data = await response.json();
        CheckRequests(data, navigate);
        if (mounted) setExecutionSheetData(data);
      } catch (err) {
        if (mounted) setError('Failed to load execution sheet data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [id, navigate]);

  if (loading) {
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div>Loading...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div className="error-message">{error}</div>
      </>
    );
  }

  if (!executionSheetData) {
    // Show dummy execution sheet if not found
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div className="execution-sheet-container" style={{ textAlign: 'center', marginTop: 48 }}>
          <div className="error-message" style={{ marginBottom: 24 }}>
            <p>No execution sheet found for this worksheet.<br />For now showing dummy execution sheet. (Later: show error only)</p>
          </div>
          <ExecutionSheet
            executionSheetData={null}
            onSave={null}
            onClose={() => navigate(-1)}
            isEditable={false}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
      <ExecutionSheet
        executionSheetData={executionSheetData}
        onSave={null}
        onClose={() => navigate(-1)}
        isEditable={true}
      />
    </>
  );
}