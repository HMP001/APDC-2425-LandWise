import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleMap, DrawingManager, Polygon, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { topBar } from './TopBar';
import './WorkSheet.css';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import CheckRequests from './CheckRequests';

async function fetchWorkSheet(token, id) {
  try {
    const response = await fetch(`/rest/worksheet/view/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    let error = CheckRequests(response, token);
    if (!response.ok) {
      throw new Error(`Error fetching worksheet: ${error}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching worksheet:", error);
    throw error; // Re-throw the error to be handled in the component
  }
}

const WorksheetDisplay = ({
  form,
  handleChange,
  handleAigpChange,
  handleOperationChange,
  handleRemoveOperation,
  setForm,
  onPolygonComplete,
  isViewMode
}) => {
  const operations = Array.isArray(form.operations) ? form.operations : [];
  const drawnOverlaysRef = useRef([]);
  const mapRef = useRef(null);
  const [hasAutoCenter, setHasAutoCenter] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(16);
  console.log("WorksheetDisplay form data:", form);
  console.log("Polygon to render:", form.polygon);
  console.log("Features to render:", form.features);
  console.log("AIGP data:", form.aigp);
  console.log("Title:", form.title);
  console.log("Status:", form.status);

  // Function to clear all drawn overlays from the map
  const clearAllDrawnOverlays = () => {
    drawnOverlaysRef.current.forEach(overlay => {
      if (overlay && overlay.setMap) {
        overlay.setMap(null);
      }
    });
    drawnOverlaysRef.current = [];
  };

  // Function to center map on a specific feature and select it
  const centerOnFeature = (feature) => {
    if (!feature.geometry || !feature.geometry.coordinates) return;

    const coords = extractSampleCoordinates(feature);
    if (coords && coords.length >= 2) {
      const center = { lat: coords[1], lng: coords[0] };
      setMapCenter(center);
      setMapZoom(18); // Zoom in closer to the feature
    }

    // Select the feature to display its properties
    setSelectedFeature(feature);
    console.log("Selected feature:", feature);
  };



  // Auto-center on first feature when features are loaded
  useEffect(() => {
    if (!hasAutoCenter && form.features && form.features.length > 0 && mapRef.current) {
      console.log("Auto-centering on first feature");
      setTimeout(() => {
        centerOnFeature(form.features[0]);
        setHasAutoCenter(true);
      }, 1000); // Delay to ensure map is fully loaded
    }
  }, [form.features, hasAutoCenter]);

  // Enhanced polygon completion handler that tracks overlays
  const handlePolygonComplete = (polygonObject) => {
    // Store reference to the drawn overlay
    drawnOverlaysRef.current.push(polygonObject);

    // Call the original handler
    if (onPolygonComplete) {
      onPolygonComplete(polygonObject);
    }
  };

  return (
    <>
      {/* General Info */}
      <fieldset className="form-section">
        <legend>General Information</legend>
        <div className="form-grid">
          <label className="form-label" htmlFor="id">ID:</label>
          <input
            className="form-input"
            id="id"
            type="text"
            name="id"
            value={form.id || ""}
            onChange={handleChange}
            required
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="title">Title:</label>
          <input
            className="form-input"
            id="title"
            type="text"
            name="title"
            value={form.title || ""}
            onChange={handleChange}
            required
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="status">Status:</label>
          <input
            className="form-input"
            id="status"
            type="text"
            name="status"
            value={form.status || ""}
            onChange={handleChange}
            required
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="starting_date">Starting Date:</label>
          <input
            className="form-input"
            id="starting_date"
            type="date"
            name="starting_date"
            value={form.starting_date || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="finishing_date">Finishing Date:</label>
          <input
            className="form-input"
            id="finishing_date"
            type="date"
            name="finishing_date"
            value={form.finishing_date || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="issue_date">Issue Date:</label>
          <input
            className="form-input"
            id="issue_date"
            type="date"
            name="issue_date"
            value={form.issue_date || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="award_date">Award Date:</label>
          <input
            className="form-input"
            id="award_date"
            type="date"
            name="award_date"
            value={form.award_date || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="service_provider_id">Service Provider ID:</label>
          <input
            className="form-input"
            id="service_provider_id"
            type="text"
            name="service_provider_id"
            value={form.service_provider_id || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="posa_code">POSA Code:</label>
          <input
            className="form-input"
            id="posa_code"
            type="text"
            name="posa_code"
            value={form.posa_code || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posa_description">POSA Description:</label>
          <input
            className="form-input"
            id="posa_description"
            type="text"
            name="posa_description"
            value={form.posa_description || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posp_code">POSP Code:</label>
          <input
            className="form-input"
            id="posp_code"
            type="text"
            name="posp_code"
            value={form.posp_code || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posp_description">POSP Description:</label>
          <input
            className="form-input"
            id="posp_description"
            type="text"
            name="posp_description"
            value={form.posp_description || ""}
            onChange={handleChange}
            disabled={isViewMode}
          />
        </div>
      </fieldset>

      {/* AIGP Details */}
      <fieldset className="form-section">
        <legend>AIGP Details</legend>
        <div className="form-grid">
          <label className="form-label" htmlFor="aigp">AIGP (comma-separated):</label>
          <input
            className="form-input"
            id="aigp"
            type="text"
            name="aigp"
            value={Array.isArray(form.aigp) ? form.aigp.join(', ') : form.aigp}
            onChange={handleAigpChange}
            disabled={isViewMode}
            placeholder="Enter AIGP values separated by commas"
          />
          <small style={{ fontSize: '12px', color: '#666', gridColumn: '1 / -1' }}>
            Enter multiple AIGP values separated by commas (e.g., "AIGP001, AIGP002, AIGP003")
          </small>
        </div>
      </fieldset>

      {/* Operations */}
      <fieldset className="form-section">
        <legend>Operations</legend>
        {operations.map((operation, index) => (
          <div key={index} className="operation">
            <label className="form-label" htmlFor={`operation_code_${index}`}>Operation Code:</label>
            <input
              className="form-input"
              id={`operation_code_${index}`}
              type="text"
              name="operation_code"
              value={operation.operation_code || ""}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            <label className="form-label" htmlFor={`operation_description_${index}`}>Operation Description:</label>
            <input
              className="form-input"
              id={`operation_description_${index}`}
              type="text"
              name="operation_description"
              value={operation.operation_description || ""}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            <label className="form-label" htmlFor={`area_ha_${index}`}>Area (ha):</label>
            <input
              className="form-input"
              id={`area_ha_${index}`}
              type="number"
              name="area_ha"
              value={operation.area_ha || ""}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            {!isViewMode && operations.length > 1 && (
              <button
                className="btn btn-danger btn-small"
                type="button"
                onClick={() => handleRemoveOperation(index)}
                disabled={isViewMode || operations.length === 1}
                style={{ marginLeft: 10, marginTop: 10, marginBottom: 10 }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!isViewMode && (
          <button
            className="btn btn-success"
            type="button"
            disabled={isViewMode}
            onClick={() => setForm((prevForm) => ({
              ...prevForm,
              operations: [...prevForm.operations, { operation_code: '', operation_description: '', area_ha: '' }]
            }))}>
            Add Operation
          </button>
        )}
      </fieldset>

      {/* Selected Feature Details */}
      {selectedFeature && (
        <fieldset className="form-section">
          <legend>Selected Feature Details</legend>
          <div className="form-grid">
            <label className="form-label" htmlFor="feature_aigp">AIGP:</label>
            <input
              className="form-input"
              id="feature_aigp"
              type="text"
              value={selectedFeature.properties?.aigp || ""}
              disabled
              readOnly
            />

            <label className="form-label" htmlFor="feature_ui_id">UI ID (LandIT Worker):</label>
            <input
              className="form-input"
              id="feature_ui_id"
              type="text"
              value={selectedFeature.properties?.UI_id || ""}
              disabled
              readOnly
            />

            <label className="form-label" htmlFor="feature_polygon_id">Polygon ID:</label>
            <input
              className="form-input"
              id="feature_polygon_id"
              type="text"
              value={selectedFeature.properties?.polygon_id || ""}
              disabled
              readOnly
            />

            <label className="form-label" htmlFor="feature_rural_property_id">Rural Property ID:</label>
            <input
              className="form-input"
              id="feature_rural_property_id"
              type="text"
              value={selectedFeature.properties?.rural_property_id || ""}
              disabled
              readOnly
            />

            <label className="form-label" htmlFor="feature_geometry_type">Geometry Type:</label>
            <input
              className="form-input"
              id="feature_geometry_type"
              type="text"
              value={selectedFeature.geometry?.type || ""}
              disabled
              readOnly
            />
          </div>

          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedFeature(null)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '5px 15px' }}
            >
              Clear Selection
            </button>
          </div>
        </fieldset>
      )}

      {/* Feature Navigation Controls */}
      {form.features && form.features.length > 0 && (
        <fieldset className="form-section">
          <legend>Feature Navigation</legend>
          <div style={{ padding: '10px', backgroundColor: '#e8f4fd', borderRadius: '4px', border: '1px solid #bee5eb' }}>
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ margin: '0', fontSize: '14px', color: '#0c5460' }}>
                Navigate Features ({form.features.length} features)
                {selectedFeature && <span style={{ fontWeight: 'normal' }}> - Selected: {selectedFeature.properties?.aigp || 'Unknown'}-{selectedFeature.properties?.polygon_id || 'Unknown'}</span>}
              </h4>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {form.features.map((feature, index) => {
                const isSelected = selectedFeature === feature;
                const displayLabel = feature.properties?.aigp && feature.properties?.polygon_id
                  ? `${feature.properties.aigp}-${feature.properties.polygon_id}`
                  : feature.properties?.aigp || `${feature.geometry?.type} ${index + 1}`;
                return (
                  <button
                    key={`center-feature-${index}`}
                    type="button"
                    onClick={() => centerOnFeature(feature)}
                    className={isSelected ? "btn btn-primary" : "btn btn-outline-primary"}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      margin: '2px',
                      fontWeight: isSelected ? 'bold' : 'normal'
                    }}
                    title={`AIGP: ${feature.properties?.aigp || 'Unknown'} | UI: ${feature.properties?.UI_id || 'N/A'} | Property: ${feature.properties?.rural_property_id || 'N/A'}`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>
      )}

      {/* Geometries */}
      <fieldset className="form-section">
        <legend>Feature Geometries</legend>

        {!isViewMode && (
          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
              {form.features && form.features.length > 0
                ? `${form.features.length} feature(s) loaded: ${form.features.map(f => f.geometry?.type).join(', ')}`
                : form.polygon && form.polygon.length > 0
                  ? `${Array.isArray(form.polygon[0]) ? form.polygon.length : 1} polygon(s) drawn`
                  : 'No features or polygons loaded'
              }
            </p>
            {((form.features && form.features.length > 0) || (form.polygon && form.polygon.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  clearAllDrawnOverlays();
                  setSelectedFeature(null); // Clear selected feature
                  setForm((prevForm) => ({ ...prevForm, polygon: [], features: [] }));
                }}
                className="btn btn-warning"
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Clear All Features
              </button>
            )}
          </div>
        )}
        <GoogleMap
          ref={mapRef}
          id="drawing-manager-example"
          mapContainerStyle={{ height: "400px", width: "100%" }}
          zoom={mapZoom}
          center={mapCenter || getMapCenter(form)}
        >
          {!isViewMode && (
            <DrawingManager
              onPolygonComplete={handlePolygonComplete}
              options={{
                drawingControl: true,
                drawingControlOptions: {
                  position: window.google
                    ? window.google.maps.ControlPosition.TOP_CENTER
                    : 1,
                  drawingModes: ['polygon']
                },
                polygonOptions: {
                  fillColor: "#ffff00",
                  fillOpacity: 0.5,
                  strokeWeight: 1
                }
              }}
            />
          )}
          {/* Render features from GeoJSON */}
          {form.features && form.features.length > 0 && (
            form.features.flatMap((feature, index) => {
              const rendered = renderFeatureOnMap(feature, index, selectedFeature);
              // Handle both single elements and arrays of elements
              return Array.isArray(rendered) ? rendered : [rendered];
            }).filter(element => element !== null)
          )}
          {/* Render legacy polygons for backward compatibility */}
          {(!form.features || form.features.length === 0) && form.polygon && form.polygon.length > 0 && (
            <>
              {Array.isArray(form.polygon[0]) ? (
                // Multiple polygons - each element is an array of coordinates
                form.polygon.map((polygonPath, index) => (
                  polygonPath && polygonPath.length > 2 && (
                    <Polygon
                      key={`legacy-polygon-${index}`}
                      paths={polygonPath}
                      options={{
                        fillColor: index === 0 ? "#ffff00" : `hsl(${(index * 60) % 360}, 70%, 60%)`,
                        fillOpacity: 0.5,
                        strokeWeight: 1,
                        strokeColor: index === 0 ? "#ffff00" : `hsl(${(index * 60) % 360}, 70%, 40%)`
                      }}
                    />
                  )
                ))
              ) : (
                // Single polygon - array of coordinates
                form.polygon.length > 2 && (
                  <Polygon
                    key="legacy-single-polygon"
                    paths={form.polygon}
                    options={{
                      fillColor: "#ffff00",
                      fillOpacity: 0.5,
                      strokeWeight: 1
                    }}
                  />
                )
              )}
            </>
          )}
        </GoogleMap>
      </fieldset>
    </>
  )
};

export default function WorkSheet({ mode }) {
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
    posa_code: '',
    posa_description: '',
    posp_code: '',
    posp_description: '',
    operations: [],
    aigp: [],
    polygon: [],
    features: []
  });
  const [initialForm, setInitialForm] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    if (mode === 'edit') {
      fetchWorkSheet(token, id)
        .then(data => {
          if (!data) throw new Error("No data found for the given ID");
          console.log("Raw fetched worksheet data:", data);
          const normalizedData = normalizeWorksheet(data);
          console.log("Normalized worksheet data:", normalizedData);
          setForm(normalizedData);
          setInitialForm(data);
        })
        .catch(err => {
          console.error("Error fetching worksheet:", err);
          setError("Failed to load worksheet data. Please try again later.");
        });
    }
  }, [token, navigate, id, mode]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value
    }));
  }

  const handleOperationChange = (index, event) => {
    const { name, value } = event.target;
    setForm((prevForm) => {
      const operations = [...prevForm.operations];
      operations[index] = {
        ...operations[index],
        [name]: value
      };
      return {
        ...prevForm,
        operations
      };
    });
  }; const handleAigpChange = (event) => {
    const { value } = event.target;
    // Convert comma-separated string to array
    const aigpArray = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setForm((prevForm) => ({
      ...prevForm,
      aigp: aigpArray
    }));
  };

  const handleRemoveOperation = (index) => {
    setForm((prevForm) => ({
      ...prevForm,
      operations: prevForm.operations.filter((_, i) => i !== index)
    }));
  };

  const onPolygonComplete = (polygonObject) => {
    // Save polygon coordinates to form
    const path = polygonObject.getPath().getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng()
    }));

    setForm((prevForm) => {
      // Check if we already have polygons
      const currentPolygons = prevForm.polygon || [];

      // If current polygon is a single polygon (array of coordinates), convert to multiple polygon format
      if (currentPolygons.length > 0 && !Array.isArray(currentPolygons[0])) {
        // Convert single polygon to multiple polygon format and add new polygon
        return {
          ...prevForm,
          polygon: [currentPolygons, path]
        };
      } else if (Array.isArray(currentPolygons) && currentPolygons.length > 0) {
        // Already multiple polygons, add new one
        return {
          ...prevForm,
          polygon: [...currentPolygons, path]
        };
      } else {
        // First polygon, keep as single polygon format for backward compatibility
        return {
          ...prevForm,
          polygon: path
        };
      }
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      // Convert AIGP array to comma-separated string for backend
      const formDataForBackend = {
        ...form,
        aigp: Array.isArray(form.aigp) ? form.aigp.join(', ') : form.aigp
      };

      const response = await fetch(mode === 'create' ? "/rest/worksheet/create" : "/rest/worksheet/updateStatus", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(token, formDataForBackend)
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`WorkSheet ${mode === 'create' ? "created" : "edited"} successfully:`, data);
        navigate('/'); // Redirect to the worksheets list or detail page
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to create worksheet. Please try again later.");
        if (mode === 'edit') {
          setForm(initialForm); // Reset to initial form if edit fails
        }
      }
    } catch (error) {
      console.error("Error creating worksheet:", error);
      setError("An error occurred while creating the worksheet. Please try again later.");
      if (mode === 'edit') {
        setForm(initialForm); // Reset to initial form if edit fails
      }
    }

  };

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          <form onSubmit={handleSubmit} className="worksheet-form">
            <h2 className="worksheet-header">Create WorkSheet</h2>

            <WorksheetDisplay
              form={form}
              handleChange={handleChange}
              handleAigpChange={handleAigpChange}
              handleOperationChange={handleOperationChange}
              handleRemoveOperation={handleRemoveOperation}
              setForm={setForm}
              onPolygonComplete={onPolygonComplete}
              isViewMode={false}
            />

            {/* Submit/Error */}
            {error && <div className="form-error">{error}</div>}
            <button type="submit">{mode === 'create' ? "Create" : "Submit"} Worksheet</button>
          </form>
        </div>
      </div>
    </>
  );

}
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
  const token = sessionStorage.getItem('authToken');

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    fetchWorkSheet(token, id)
      .then(data => {
        if (!data) {
          throw new Error("No data found for the given ID");
        }
        setForm(normalizeWorksheet(data));
        console.log("Normalized worksheet:", normalizeWorksheet(data));
      })
      .catch(err => {
        console.error("Error fetching worksheet:", err);
        setError("Failed to load worksheet data. Please try again later.");
      });
  }, [token, navigate, id]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          <form className="worksheet-form">
            <h2 className="worksheet-header">View WorkSheet</h2>
            <WorksheetDisplay
              form={form}
              handleChange={() => { }}
              handleAigpChange={() => { }}
              handleOperationChange={() => { }}
              handleRemoveOperation={() => { }}
              setForm={setForm}
              onPolygonComplete={() => { }}
              isViewMode={true}
            />
            {error && <div className="form-error">{error}</div>}
          </form>
        </div>
      </div>
    </>
  );
}

export function ListWorkSheets() {
  const [worksheets, setWorksheets] = useState([]);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null); // Track which worksheet is expanded
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    async function fetchWorksheets() {
      try {
        const response = await fetch("/rest/worksheet/list", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: token
        });
        const errorMsg = CheckRequests(response, token, navigate);
        if (!response.ok) {
          setError(errorMsg || "Failed to load worksheets. Please try again later.");
          return;
        }
        const data = await response.json();
        setWorksheets(data.map(normalizeWorksheet));
      } catch (err) {
        console.error("Error fetching worksheets:", err);
        setError("Failed to load worksheets. Please try again later.");
      }
    }
    fetchWorksheets();
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const handleExpand = async (id) => {
    setExpandedId(expandedId === id ? null : id);
  };
  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-list-container'>
        <div className='worksheet-container'>
          {error && <div className="form-error">{error}</div>}
          <h2 className="worksheet-list-header">WorkSheets List</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {worksheets.map(worksheet => (
              <li key={worksheet.title} style={{ marginBottom: 20, border: '1px solid #ccc', borderRadius: 4 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 10 }}
                  onClick={() => handleExpand(worksheet.title)}
                >
                  <span style={{ flex: 1 }}>Worksheet-{worksheet.title}</span>
                  {expandedId === worksheet.title ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {expandedId === worksheet.title && (
                  <div style={{ padding: 10, background: '#f9f9f9' }}>
                    <WorksheetDisplay
                      form={worksheet}
                      handleChange={() => { }}
                      handleAigpChange={() => { }}
                      handleOperationChange={() => { }}
                      handleRemoveOperation={() => { }}
                      setForm={() => { }}
                      onPolygonComplete={() => { }}
                      isViewMode={true}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

// Helper function to normalize AIGP data from various formats
function normalizeAigpData(aigpData) {
  // If it's already an array, return it
  if (Array.isArray(aigpData)) {
    return aigpData;
  }

  // If it's a string, split by comma and clean up
  if (typeof aigpData === 'string') {
    if (aigpData.trim() === '') {
      return [];
    }
    // Split by comma and clean up whitespace
    return aigpData.split(',').map(item => item.trim()).filter(item => item !== '');
  }

  // If it's an object (legacy format), extract values and return as array
  if (aigpData && typeof aigpData === 'object') {
    const values = [];
    if (aigpData.id) values.push(aigpData.id);
    if (aigpData.name) values.push(aigpData.name);
    if (aigpData.address) values.push(aigpData.address);
    if (aigpData.nif) values.push(aigpData.nif);
    return values;
  }

  // Default fallback
  return [];
}

// Simple normalization function for backward compatibility with existing data
function normalizeWorksheet(data) {
  // Ensure the basic structure is present and normalize data types
  return {
    ...data,
    id: data.id || '', // Ensure ID is included
    title: data.title || '',
    status: data.status || '',
    starting_date: data.starting_date || '',
    finishing_date: data.finishing_date || '',
    issue_date: data.issue_date || '',
    award_date: data.award_date || '',
    service_provider_id: data.service_provider_id || '',
    posa_code: data.posa_code || '',
    posa_description: data.posa_description || '',
    posp_code: data.posp_code || '',
    posp_description: data.posp_description || '',
    aigp: normalizeAigpData(data.aigp),
    operations: Array.isArray(data.operations) ? data.operations : (typeof data.operations === "string" ? JSON.parse(data.operations) : []),
    polygon: data.polygon || [],
    features: data.features || [] // Ensure features array exists
  };
}

const getMapCenter = (form) => {
  console.log("Calculating map center for form:", form);

  // First check if we have features with geometries
  if (form.features && form.features.length > 0) {
    console.log("Found features:", form.features.length);

    // Calculate center from all features
    let totalLat = 0;
    let totalLng = 0;
    let pointCount = 0;

    for (const feature of form.features) {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = extractSampleCoordinates(feature);
        console.log("Extracted coords for feature:", coords);
        if (coords && coords.length >= 2) {
          totalLng += coords[0];
          totalLat += coords[1];
          pointCount++;
        }
      }
    }

    if (pointCount > 0) {
      const center = {
        lat: totalLat / pointCount,
        lng: totalLng / pointCount
      };
      console.log("Calculated center from features:", center);
      return center;
    }
  }

  // Fall back to polygon center if available
  if (form.polygon && form.polygon.length > 0) {
    console.log("Using polygon center fallback");
    return getPolygonCenter(form.polygon);
  }

  // Default to Lisbon coordinates
  console.log("Using default Lisbon coordinates");
  return { lat: 38.659784, lng: -9.202765 };
};

// Helper function to calculate polygon centroid
const calculatePolygonCentroid = (coordinates) => {
  try {
    // Handle different coordinate structures
    let ring;

    if (Array.isArray(coordinates) && coordinates.length > 0) {
      // For GeoJSON Polygon, coordinates is an array of rings
      // Use the exterior ring (first element)
      if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
        ring = coordinates[0]; // GeoJSON Polygon format
      } else if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === 'number') {
        ring = coordinates; // Already the ring
      } else {
        console.warn("Unexpected coordinate structure:", coordinates);
        return { lat: 0, lng: 0 }; // Fallback
      }
    } else {
      console.warn("Invalid coordinates for centroid calculation:", coordinates);
      return { lat: 0, lng: 0 }; // Fallback
    }

    // Ensure ring is iterable and has coordinate pairs
    if (!Array.isArray(ring) || ring.length === 0) {
      console.warn("Ring is not iterable or empty:", ring);
      return { lat: 0, lng: 0 }; // Fallback
    }

    // Validate that each coordinate is a valid [lng, lat] pair
    const validCoords = ring.filter(coord =>
      Array.isArray(coord) && coord.length >= 2 &&
      typeof coord[0] === 'number' && typeof coord[1] === 'number'
    );

    if (validCoords.length === 0) {
      console.warn("No valid coordinates found in ring:", ring);
      return { lat: 0, lng: 0 }; // Fallback
    }

    // Use simple averaging for centroid calculation (more reliable)
    const avgLng = validCoords.reduce((sum, coord) => sum + coord[0], 0) / validCoords.length;
    const avgLat = validCoords.reduce((sum, coord) => sum + coord[1], 0) / validCoords.length;

    return { lat: avgLat, lng: avgLng };
  } catch (error) {
    console.error("Error calculating polygon centroid:", error, coordinates);
    return { lat: 0, lng: 0 }; // Fallback
  }
};

const renderFeatureOnMap = (feature, index, selectedFeature) => {
  if (!feature.geometry) return null;

  const { type, coordinates } = feature.geometry;
  const baseColor = `hsl(${(index * 60) % 360}, 70%, 60%)`;
  const strokeColor = `hsl(${(index * 60) % 360}, 70%, 40%)`;
  const ruralPropertyId = feature.properties?.rural_property_id;
  const isSelected = selectedFeature === feature;

  switch (type) {
    case 'Point':
      return (
        <Marker
          key={`feature-point-${index}`}
          position={{ lat: coordinates[1], lng: coordinates[0] }}
        />
      );
    case 'LineString':
      return (
        <Polyline
          key={`feature-linestring-${index}`}
          path={coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))}
          options={{
            strokeColor: strokeColor,
            strokeWeight: 3,
            strokeOpacity: 0.8
          }}
        />
      );
    case 'Polygon':
      const polygonElement = (
        <Polygon
          key={`feature-polygon-${index}`}
          paths={coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }))}
          options={{
            fillColor: baseColor,
            fillOpacity: 0.5,
            strokeWeight: 2,
            strokeColor: strokeColor
          }}
        />
      );

      // Add rural property ID label if available and feature is selected
      if (ruralPropertyId && isSelected) {
        const centroid = calculatePolygonCentroid(coordinates[0]);
        const labelElement = (
          <InfoWindow
            key={`feature-polygon-label-${index}`}
            position={centroid}
            options={{
              disableAutoPan: true,
              pixelOffset: window.google && window.google.maps ? new window.google.maps.Size(0, 0) : undefined
            }}
          >
            <div style={{
              backgroundColor: 'white',
              border: '2px solid #333',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {ruralPropertyId}
            </div>
          </InfoWindow>
        );
        return [polygonElement, labelElement];
      }
      return polygonElement;

    case 'MultiPoint':
      return coordinates.map((coord, pointIndex) => (
        <Marker
          key={`feature-multipoint-${index}-${pointIndex}`}
          position={{ lat: coord[1], lng: coord[0] }}
        />
      ));
    case 'MultiLineString':
      return coordinates.map((lineCoords, lineIndex) => (
        <Polyline
          key={`feature-multilinestring-${index}-${lineIndex}`}
          path={lineCoords.map(coord => ({ lat: coord[1], lng: coord[0] }))}
          options={{
            strokeColor: strokeColor,
            strokeWeight: 3,
            strokeOpacity: 0.8
          }}
        />
      ));
    case 'MultiPolygon':
      return coordinates.map((polygon, polygonIndex) => {
        const polygonElement = (
          <Polygon
            key={`feature-multipolygon-${index}-${polygonIndex}`}
            paths={polygon[0].map(coord => ({ lat: coord[1], lng: coord[0] }))}
            options={{
              fillColor: baseColor,
              fillOpacity: 0.5,
              strokeWeight: 2,
              strokeColor: strokeColor
            }}
          />
        );

        // Add rural property ID label if available and feature is selected
        if (ruralPropertyId && isSelected) {
          const centroid = calculatePolygonCentroid(polygon[0]);
          const labelElement = (
            <InfoWindow
              key={`feature-multipolygon-label-${index}-${polygonIndex}`}
              position={centroid}
              options={{
                disableAutoPan: true,
                pixelOffset: window.google && window.google.maps ? new window.google.maps.Size(0, 0) : undefined
              }}
            >
              <div style={{
                backgroundColor: 'white',
                border: '2px solid #333',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {ruralPropertyId}
              </div>
            </InfoWindow>
          );
          return [polygonElement, labelElement];
        }
        return polygonElement;
      });
    default:
      console.warn(`Geometry type ${type} not yet supported for rendering`);
      return null;
  }
};

const validateGeoJSONWorksheet = (geoJsonData) => {
  if (!geoJsonData.type || geoJsonData.type !== "FeatureCollection") {
    return { valid: false, error: "Must be a FeatureCollection" };
  }

  if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
    return { valid: false, error: "Must contain a features array" };
  }

  // Metadata is optional - we can create a basic worksheet even without metadata
  return { valid: true };
};

const convertGeoJSONToWorksheet = (geoJsonData) => {
  // Try to get metadata from multiple possible locations
  const metadata = geoJsonData.metadata || geoJsonData.properties || {};

  // Also check if metadata is embedded in the first feature's properties
  const firstFeatureMetadata = geoJsonData.features && geoJsonData.features.length > 0 ?
    geoJsonData.features[0].properties?.metadata : {};

  // Merge all possible metadata sources
  const allMetadata = { ...firstFeatureMetadata, ...metadata };

  console.log("Converting GeoJSON to worksheet:", {
    originalData: geoJsonData,
    extractedMetadata: allMetadata,
    features: geoJsonData.features
  });

  const result = {
    id: allMetadata.id || '', // Include ID from metadata
    title: allMetadata.title || '',
    status: allMetadata.status || '',
    starting_date: allMetadata.starting_date || '',
    finishing_date: allMetadata.finishing_date || '',
    issue_date: allMetadata.issue_date || '',
    award_date: allMetadata.award_date || '',
    service_provider_id: allMetadata.service_provider_id || '',
    posa_code: allMetadata.posa_code || '',
    posa_description: allMetadata.posa_description || '',
    posp_code: allMetadata.posp_code || '',
    posp_description: allMetadata.posp_description || '',
    aigp: normalizeAigpData(allMetadata.aigp),
    operations: allMetadata.operations || [],
    polygon: [], // Keep empty for backward compatibility
    features: geoJsonData.features || []
  };

  console.log("Converted worksheet result:", result);
  return result;
};

const getPolygonCenter = (polygon) => {
  if (!polygon || polygon.length === 0) return { lat: 38.659784, lng: -9.202765 };

  // Check if this is multiple polygons (array of arrays) or single polygon (array of coordinates)
  if (Array.isArray(polygon[0])) {
    // Multiple polygons - calculate center from all polygons
    let totalLat = 0;
    let totalLng = 0;
    let totalPoints = 0;

    polygon.forEach(polygonPath => {
      if (Array.isArray(polygonPath)) {
        polygonPath.forEach(point => {
          if (point && point.lat && point.lng) {
            totalLat += point.lat;
            totalLng += point.lng;
            totalPoints++;
          }
        });
      }
    });

    if (totalPoints > 0) {
      return { lat: totalLat / totalPoints, lng: totalLng / totalPoints };
    }
    return { lat: 38.659784, lng: -9.202765 };
  } else {
    // Single polygon - original logic
    const lat = polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length;
    const lng = polygon.reduce((sum, p) => sum + p.lng, 0) / polygon.length;
    return { lat, lng };
  }
};

export function SelectWorksheet({ mode }) {
  const [id, setId] = useState('');
  const [showModal, setShowModal] = useState(true);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (id.trim() === '') {
      alert("Please enter a valid Worksheet ID.");
      return;
    }
    if (mode === 'view') {
      navigate(`/worksheet/view/${id}`);
    } else if (mode === 'edit') {
      navigate(`/worksheet/edit/${id}`);
    } else {
      console.error("Invalid mode specified:", mode);
    }
  };

  return (
    <>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select Worksheet</h2>
            <form onSubmit={handleSubmit}>
              <label htmlFor="worksheetId">Worksheet ID:</label>
              <input
                type="text"
                id="worksheetId"
                value={id}
                onChange={(e) => setId(e.target.value)}
                ref={inputRef}
                required
                autoFocus
                className="form-input"
              />
              <button type="submit" className="form-button">Go</button>
              <button type="button" className="form-button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      {!showModal && (
        <div className="worksheet-selection">
          <h2>Select Worksheet</h2>
          <button onClick={() => setShowModal(true)} className="form-button">
            Select Worksheet
          </button>
        </div>
      )}
    </>
  );

}

export function UploadWorkSheet() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [worksheetData, setWorksheetData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  if (!token) {
    setTimeout(() => {
      navigate('/login');
    }, 2000);
    return;
  }

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError('');
    setWarning('');
    setWorksheetData(null);
    setShowPreview(false);
    setDetectedFormat('');

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          let normalizedData = null;
          let format = '';

          // Only accept GeoJSON format
          if (jsonData.type === "FeatureCollection") {
            // Validate GeoJSON
            const validation = validateGeoJSONWorksheet(jsonData);
            if (!validation.valid) {
              setError(`GeoJSON validation error: ${validation.error}`);
              return;
            }

            // Detect and handle coordinate systems
            const detectedCRS = detectCRSFromGeoJSON(jsonData);
            if (detectedCRS && detectedCRS.code !== 'EPSG:4326') {
              // Convert coordinates using local approximation (no external API calls)
              try {
                normalizedData = await convertGeoJSONToWorksheetWithCRS(jsonData, detectedCRS);
                format = `GeoJSON FeatureCollection (${detectedCRS.code} converted to WGS84)`;
                setWarning(`Coordinates converted from ${detectedCRS.code} to WGS84 using approximation. Map display may not be perfectly accurate.`);
              } catch (conversionError) {
                console.error("CRS conversion error:", conversionError);
                setWarning(`Unable to convert coordinates from ${detectedCRS.code}. Using original coordinates for preview - features may not display correctly on the map.`);
                normalizedData = convertGeoJSONToWorksheet(jsonData);
                format = 'GeoJSON FeatureCollection';
              }
            } else {
              // No CRS conversion needed or CRS is already WGS84
              normalizedData = convertGeoJSONToWorksheet(jsonData);
              format = 'GeoJSON FeatureCollection (WGS84)';
            }
          } else {
            setError("Only GeoJSON FeatureCollection format is supported. Please upload a valid GeoJSON file with worksheet metadata.");
            return;
          }

          if (normalizedData) {
            setWorksheetData(normalizedData);
            setDetectedFormat(format);
            setShowPreview(true);
          } else {
            setError("Unable to parse worksheet data. Please check the GeoJSON format and metadata structure.");
          }
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
          setError("Invalid JSON file. Please ensure the file is properly formatted GeoJSON.");
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch("/rest/worksheet/upload", {
        method: 'POST',
        headers: {
          'Authorization': token
        },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Worksheet uploaded successfully:", data);
        navigate('/'); // Redirect to the worksheets list or detail page
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to upload worksheet. Please try again later.");
      }
    } catch (error) {
      console.error("Error uploading worksheet:", error);
      setError("An error occurred while uploading the worksheet. Please try again later.");
    }
  };

  const handleCancelPreview = () => {
    setFile(null);
    setWorksheetData(null);
    setShowPreview(false);
    setDetectedFormat('');
    setError('');
    setWarning('');
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          {!showPreview ? (
            <div className="upload-worksheet-form">
              <h2 className="upload-worksheet-header">Upload WorkSheet</h2>

              <div className="form-section">
                <p style={{ marginBottom: '15px', color: '#666' }}>
                  Upload a GeoJSON file containing worksheet data with feature geometries. The file will be previewed before uploading to the server.
                </p>

                <label className="form-label" htmlFor="worksheet-file">
                  Select GeoJSON WorkSheet File:
                </label>
                <input
                  id="worksheet-file"
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileChange}
                  required
                  className="form-input"
                />

                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px' }}>Required GeoJSON Structure:</p>
                  <ul style={{ margin: '0', fontSize: '12px', color: '#666', paddingLeft: '20px' }}>
                    <li><strong>Type:</strong> Must be a FeatureCollection</li>
                    <li><strong>Features:</strong> Array of GeoJSON features with geometries (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon)</li>
                    <li><strong>Metadata:</strong> Optional metadata object containing worksheet details (title, status, AIGP info, operations, etc.)</li>
                  </ul>
                  <p style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>
                    <strong>Metadata structure:</strong> Include a "metadata" object at the root level with fields like: title, status, starting_date, finishing_date, aigp (with id, name, address, nif), operations array, etc.
                  </p>
                  <p style={{ margin: '5px 0 5px 0', fontSize: '12px', color: '#666' }}>
                    <strong>Coordinate Systems:</strong> Files with EPSG:3763 (Portuguese projected coordinates) are automatically converted to WGS84 for map display.
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#007bff' }}>
                    <strong>Sample file:</strong>
                    <a href="/sample-landit-geojson.json" download style={{ marginLeft: '5px', textDecoration: 'underline' }}>Download Sample GeoJSON</a>
                  </p>
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}
              {warning && <div className="form-warning" style={{
                color: '#856404',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0'
              }}>{warning}</div>}

              {file && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
                    ✓ File selected: {file.name}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="worksheet-form">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#e8f4fd',
                borderRadius: '8px',
                border: '1px solid #bee5eb'
              }}>
                <div>
                  <h2 className="worksheet-header" style={{ margin: '0 0 5px 0' }}>
                    Preview Uploaded WorkSheet
                  </h2>
                  <p style={{ margin: '0', fontSize: '14px', color: '#0c5460' }}>
                    Detected format: <strong>{detectedFormat}</strong><br />
                    Review the worksheet data below, then confirm upload to save it to the server.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    className="btn btn-secondary"
                    style={{ marginRight: '10px' }}
                  >
                    Choose Different File
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary"
                  >
                    Confirm & Upload to Server
                  </button>
                </div>
              </div>

              {worksheetData && (
                <WorksheetDisplay
                  form={worksheetData}
                  handleChange={(event) => {
                    const { name, value } = event.target;
                    setWorksheetData((prevForm) => ({
                      ...prevForm,
                      [name]: value
                    }));
                  }}
                  handleAigpChange={(event) => {
                    const { value } = event.target;
                    // Convert comma-separated string to array
                    const aigpArray = value.split(',').map(item => item.trim()).filter(item => item !== '');
                    setWorksheetData((prevForm) => ({
                      ...prevForm,
                      aigp: aigpArray
                    }));
                  }}
                  handleOperationChange={(index, event) => {
                    const { name, value } = event.target;
                    setWorksheetData((prevForm) => {
                      const operations = [...prevForm.operations];
                      operations[index] = {
                        ...operations[index],
                        [name]: value
                      };
                      return {
                        ...prevForm,
                        operations
                      };
                    });
                  }}
                  handleRemoveOperation={(index) => {
                    setWorksheetData((prevForm) => ({
                      ...prevForm,
                      operations: prevForm.operations.filter((_, i) => i !== index)
                    }));
                  }}
                  setForm={setWorksheetData}
                  onPolygonComplete={(polygonObject) => {
                    const path = polygonObject.getPath().getArray().map(latLng => ({
                      lat: latLng.lat(),
                      lng: latLng.lng()
                    }));
                    setWorksheetData((prevForm) => {
                      // Check if we already have polygons
                      const currentPolygons = prevForm.polygon || [];

                      // If current polygon is a single polygon (array of coordinates), convert to multiple polygon format
                      if (currentPolygons.length > 0 && !Array.isArray(currentPolygons[0])) {
                        // Convert single polygon to multiple polygon format and add new polygon
                        return {
                          ...prevForm,
                          polygon: [currentPolygons, path]
                        };
                      } else if (Array.isArray(currentPolygons) && currentPolygons.length > 0) {
                        // Already multiple polygons, add new one
                        return {
                          ...prevForm,
                          polygon: [...currentPolygons, path]
                        };
                      } else {
                        // First polygon, keep as single polygon format for backward compatibility
                        return {
                          ...prevForm,
                          polygon: path
                        };
                      }
                    });
                  }}
                  isViewMode={false}
                />
              )}

              {error && <div className="form-error">{error}</div>}
              {warning && <div className="form-warning" style={{
                color: '#856404',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0'
              }}>{warning}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// CRS Detection and Conversion Functions

/**
 * Detect the CRS from a GeoJSON object
 * @param {Object} geoJsonData - GeoJSON object
 * @returns {Object|null} - CRS information object or null if not detected
 */
function detectCRSFromGeoJSON(geoJsonData) {
  // Check for explicit CRS property
  if (geoJsonData.crs && geoJsonData.crs.properties) {
    const crsProps = geoJsonData.crs.properties;

    // Handle different CRS property formats
    if (crsProps.name) {
      const crsName = crsProps.name;

      // Handle EPSG format variations
      if (crsName.includes('EPSG')) {
        const epsgMatch = crsName.match(/EPSG[:\s]*(\d+)/i);
        if (epsgMatch) {
          const epsgCode = epsgMatch[1];
          return {
            code: `EPSG:${epsgCode}`,
            name: getCRSName(epsgCode),
            type: 'projected'
          };
        }
      }

      // Handle other named CRS
      return {
        code: crsName,
        name: crsName,
        type: 'unknown'
      };
    }

    // Handle code property
    if (crsProps.code) {
      return {
        code: crsProps.code,
        name: getCRSName(crsProps.code.replace('EPSG:', '')),
        type: 'projected'
      };
    }
  }

  // Check for CRS in the name property (legacy format)
  if (geoJsonData.name && typeof geoJsonData.name === 'string') {
    const nameStr = geoJsonData.name.toLowerCase();
    if (nameStr.includes('epsg')) {
      const epsgMatch = nameStr.match(/epsg[:\s]*(\d+)/i);
      if (epsgMatch) {
        const epsgCode = epsgMatch[1];
        return {
          code: `EPSG:${epsgCode}`,
          name: getCRSName(epsgCode),
          type: 'projected'
        };
      }
    }
  }

  // Heuristic detection based on coordinate ranges
  if (geoJsonData.features && geoJsonData.features.length > 0) {
    const sampleCoords = extractSampleCoordinates(geoJsonData.features[0]);
    if (sampleCoords) {
      const [x, y] = sampleCoords;

      // Check for Portuguese EPSG:3763 (typical ranges: X: -100000 to 400000, Y: -300000 to 300000)
      if (x > -200000 && x < 500000 && y > -400000 && y < 400000 && (Math.abs(x) > 180 || Math.abs(y) > 90)) {
        return {
          code: 'EPSG:3763',
          name: 'ETRS89 / Portugal TM06',
          type: 'projected'
        };
      }

      // Check for UTM zones (typical ranges for Portugal area)
      if (x > 100000 && x < 900000 && y > 4000000 && y < 5000000) {
        return {
          code: 'EPSG:32629', // UTM Zone 29N (most common for Portugal)
          name: 'WGS 84 / UTM zone 29N',
          type: 'projected'
        };
      }

      // If coordinates look like lat/lng, assume WGS84
      if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        return {
          code: 'EPSG:4326',
          name: 'WGS 84',
          type: 'geographic'
        };
      }
    }
  }

  // Default assumption - WGS84
  return {
    code: 'EPSG:4326',
    name: 'WGS 84',
    type: 'geographic'
  };
}

/**
 * Get human-readable CRS name by EPSG code
 * @param {string} epsgCode - EPSG code (without EPSG: prefix)
 * @returns {string} - Human-readable CRS name
 */
function getCRSName(epsgCode) {
  const knownCRS = {
    '4326': 'WGS 84',
    '3763': 'ETRS89 / Portugal TM06',
    '32629': 'WGS 84 / UTM zone 29N',
    '32628': 'WGS 84 / UTM zone 28N',
    '2154': 'RGF93 / Lambert-93',
    '3857': 'WGS 84 / Pseudo-Mercator'
  };

  return knownCRS[epsgCode] || `EPSG:${epsgCode}`;
}

/**
 * Extract sample coordinates from a feature geometry
 * @param {Object} feature - GeoJSON feature
 * @returns {Array|null} - [x, y] coordinates or null
 */
function extractSampleCoordinates(feature) {
  if (!feature.geometry || !feature.geometry.coordinates) {
    return null;
  }

  const coords = feature.geometry.coordinates;
  const geomType = feature.geometry.type;

  switch (geomType) {
    case 'Point':
      return coords;
    case 'LineString':
      return coords[0];
    case 'Polygon':
      return coords[0][0];
    case 'MultiPoint':
      return coords[0];
    case 'MultiLineString':
      return coords[0][0];
    case 'MultiPolygon':
      return coords[0][0][0];
    default:
      return null;
  }
}

/**
 * Convert coordinates using local approximation (no external API calls)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {string} sourceCRS - Source CRS code (e.g., 'EPSG:3763')
 * @param {string} targetCRS - Target CRS code (e.g., 'EPSG:4326')
 * @returns {Promise<Array>} - Converted [lng, lat] coordinates
 */
async function convertCoordinatesWithEPSGIO(x, y, sourceCRS, targetCRS = 'EPSG:4326') {
  try {
    // If source and target are the same, return as-is
    if (sourceCRS === targetCRS) {
      return [x, y];
    }

    // For EPSG:3763 (Portugal TM06) to EPSG:4326 (WGS84) conversion
    // Using simplified approximation - this is not precise but avoids external API calls
    if (sourceCRS === 'EPSG:3763' && targetCRS === 'EPSG:4326') {
      // Very rough approximation for Portuguese coordinates
      // These are approximate conversion factors - not precise!
      const lng = -9.0 + (x / 111320);  // Rough longitude conversion
      const lat = 39.5 + (y / 110540);  // Rough latitude conversion

      console.log(`Converted ${x}, ${y} (EPSG:3763) to ${lng}, ${lat} (WGS84) using approximation`);
      return [lng, lat];
    }

    // For other coordinate systems, return original coordinates with warning
    console.warn(`Coordinate conversion from ${sourceCRS} to ${targetCRS} not supported locally. Using original coordinates.`);
    return [x, y];

  } catch (error) {
    console.error('Coordinate conversion error:', error);
    return [x, y]; // Return original coordinates on error
  }
}

/**
 * Convert all coordinates in a geometry using EPSG.io API
 * @param {Array} coordinates - Geometry coordinates
 * @param {string} geometryType - Geometry type
 * @param {string} sourceCRS - Source CRS code
 * @param {string} targetCRS - Target CRS code
 * @returns {Promise<Array>} - Converted coordinates
 */
async function convertGeometryCoordinates(coordinates, geometryType, sourceCRS, targetCRS = 'EPSG:4326') {
  switch (geometryType) {
    case 'Point':
      return await convertCoordinatesWithEPSGIO(coordinates[0], coordinates[1], sourceCRS, targetCRS);

    case 'LineString':
      return await Promise.all(
        coordinates.map(coord => convertCoordinatesWithEPSGIO(coord[0], coord[1], sourceCRS, targetCRS))
      );

    case 'Polygon':
      return await Promise.all(
        coordinates.map(ring =>
          Promise.all(ring.map(coord => convertCoordinatesWithEPSGIO(coord[0], coord[1], sourceCRS, targetCRS)))
        )
      );

    case 'MultiPoint':
      return await Promise.all(
        coordinates.map(coord => convertCoordinatesWithEPSGIO(coord[0], coord[1], sourceCRS, targetCRS))
      );

    case 'MultiLineString':
      return await Promise.all(
        coordinates.map(line =>
          Promise.all(line.map(coord => convertCoordinatesWithEPSGIO(coord[0], coord[1], sourceCRS, targetCRS)))
        )
      );

    case 'MultiPolygon':
      return await Promise.all(
        coordinates.map(polygon =>
          Promise.all(polygon.map(ring =>
            Promise.all(ring.map(coord => convertCoordinatesWithEPSGIO(coord[0], coord[1], sourceCRS, targetCRS)))
          ))
        )
      );

    default:
      throw new Error(`Unsupported geometry type: ${geometryType}`);
  }
}

/**
 * Convert GeoJSON to worksheet with CRS conversion
 * @param {Object} geoJsonData - GeoJSON data
 * @param {Object} detectedCRS - Detected CRS information
 * @returns {Promise<Object>} - Converted worksheet data
 */
async function convertGeoJSONToWorksheetWithCRS(geoJsonData, detectedCRS) {
  // Create a copy of the original data
  const convertedGeoJSON = JSON.parse(JSON.stringify(geoJsonData));

  // Convert all feature coordinates if CRS conversion is needed
  if (detectedCRS.code !== 'EPSG:4326') {
    for (let i = 0; i < convertedGeoJSON.features.length; i++) {
      const feature = convertedGeoJSON.features[i];
      if (feature.geometry && feature.geometry.coordinates) {
        try {
          const convertedCoords = await convertGeometryCoordinates(
            feature.geometry.coordinates,
            feature.geometry.type,
            detectedCRS.code,
            'EPSG:4326'
          );
          feature.geometry.coordinates = convertedCoords;
        } catch (error) {
          console.error(`Failed to convert coordinates for feature ${i}:`, error);
          // Keep original coordinates if conversion fails
        }
      }
    }
  }

  // Use the existing conversion function with converted coordinates
  return convertGeoJSONToWorksheet(convertedGeoJSON);
}