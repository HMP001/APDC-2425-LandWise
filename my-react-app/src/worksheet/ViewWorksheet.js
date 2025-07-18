import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWsNorm, worksheetToGeoJSON, WorksheetDisplay, DeleteWorkSheet, fetchWorkSheet, normalizeAigpData, GenericWorksheetDisplay } from './WorkSheetService';
import { topBar } from '../TopBar';
import './WorkSheet.css';

export function ViewWorkSheet() {
  const { id } = useParams();
  const [form, setForm] = useState({
    id: id,
    title: '',
    status: '',
    starting_date: '',
    finishing_date: '',
    issue_date: '',
    award_date: '',
    service_provider_id: '',
    issuing_user_id: '',
    posa_code: '',
    posa_description: '',
    posp_code: '',
    posp_description: '',
    operations: [],
    aigp: [],
    polygon: [],
    features: []
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchWsNorm(id, navigate)
      .then(normalizedData => {
        setForm(normalizedData);
      })
      .catch(err => {
        console.error("Error fetching worksheet:", err);
        setError("Failed to load worksheet data. Please try again later.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [navigate, id]);

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading WorkSheet...</p>
        </div>
      </>
    );
  }

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          <form className="worksheet-form">
            <div className='worksheet-header-row'>
              <h2 className="worksheet-header">WorkSheet Details</h2>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={async () => {
                  const crsCode = window.prompt(
                    "Enter desired CRS code (e.g., EPSG:4326 for WGS84, EPSG:3763 for Portugal):",
                    "EPSG:4326"
                  );
                  if (!crsCode) return;
                  // Optionally, you could convert coordinates here if needed
                  const geojson = await worksheetToGeoJSON(form, crsCode);
                  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `worksheet-${form.id || 'export'}.geojson`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download as GeoJSON
              </button>
            </div>
            <WorksheetDisplay
              worksheet={form}
              setForm={setForm}
              isViewMode={true}
            />
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setShowDelete(true)}
              >
                Delete WorkSheet
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => navigate(`/executionsheet/${id}`, { state: { worksheetData: form } })}
              >
                View Execution Sheet
              </button>
            </div>
            {showDelete && (
              <DeleteWorkSheet
                worksheetId={id}
                onClose={() => setShowDelete(false)}
              />
            )}
          </form>
        </div>
      </div>
    </>
  );
}

export function GenericViewWorkSheet() {
  const { id } = useParams();
  const [worksheetData, setWorksheetData] = useState({
    id: id,
    title: '',
    status: '',
    starting_date: '',
    finishing_date: '',
    issue_date: '',
    award_date: '',
    service_provider_id: '',
    aigp: {}
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchGenericWorksheet = async () => {
      try {
        const data = await fetchWorkSheet(id, navigate, true); // Use generic endpoint
        if (isMounted) {
          setWorksheetData({
            ...data,
            id: id,
            aigp: normalizeAigpData(data.aigp)
          });
        }
      } catch (err) {
        console.error("Error fetching worksheet:", err);
        if (isMounted) {
          setError("Failed to load worksheet data. Please try again later.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGenericWorksheet();
    return () => { isMounted = false; };
  }, [navigate, id]);

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading WorkSheet...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {topBar(navigate)}
        <div className='worksheet-form-container'>
          <div className='worksheet-container'>
            <div className="form-error">{error}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          <div className="generic-worksheet-view">
            <div className='worksheet-header-row'>
              <h2 className="worksheet-header">WorkSheet Overview</h2>
              <div className="worksheet-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
              </div>
            </div>

            <GenericWorksheetDisplay worksheetData={worksheetData} />
          </div>
        </div>
      </div>
    </>
  );
}