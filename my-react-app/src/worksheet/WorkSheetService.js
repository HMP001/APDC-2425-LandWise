import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, DrawingManager, Polygon, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import './WorkSheet.css';
import CheckRequests from '../CheckRequests';
import '../AuthForm.css';
import proj4 from 'proj4'

export async function fetchWorkSheet(id, navigate, generic = false) {
  const endpoint = generic ? `/rest/worksheet/view/${id}` : `/rest/worksheet/viewDetailed/${id}`;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    let error = CheckRequests(response, navigate);
    if (!response.ok) {
      throw new Error(`Error fetching worksheet: ${error}`);
    }
    const data = filterWorksheetFields(await response.json());
    return data;
  } catch (error) {
    console.error("Error fetching worksheet:", error);
    throw error; // Re-throw the error to be handled in the component
  }
}

// Utility to remove unwanted fields from the worksheet object
function filterWorksheetFields(data) {
  const {
    created_at,
    updated_at,
    created_by,
    updated_by,
    ...filteredForm
  } = data;
  return filteredForm;
}

export const WorksheetDisplay = React.memo(function WorksheetDisplay({
  worksheet,
  setWorksheet,
  isViewMode
}) {
  const operations = Array.isArray(worksheet.operations) ? worksheet.operations : [];
  const mapRef = useRef(null);
  const [hasAutoCenter, setHasAutoCenter] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const onPolygonComplete = (polygonObject) => {
    const path = polygonObject.getPath().getArray().map(latLng => [
      latLng.lng(),
      latLng.lat()
    ]);

    const newFeature = {
      key: Date.now(), // Use timestamp as unique key
      type: 'Feature',
      properties: {
        polygon_id: Date.now(), // Use timestamp as unique ID
        UI_id: 'Unknown', // Placeholder for UI ID
        aigp: 'Unknown', // Empty AIGP array
        rural_property_id: 'Unknown' // Placeholder for rural property ID
      },
      geometry: {
        type: 'Polygon',
        coordinates: [path]
      }
    };

    polygonObject.setMap(null); // Remove the polygon from the map

    setWorksheet((prevForm) => {
      const updatedAigp = { ...(prevForm.aigp || {}) };
      const aigpKey = newFeature.properties.aigp;
      updatedAigp[aigpKey] = (updatedAigp[aigpKey] || 0) + 1; // Increment AIGP count
      return {
        ...prevForm,
        aigp: updatedAigp,
        features: { ...prevForm.features, [newFeature.key]: newFeature }
      };
    });
    setSelectedFeature(newFeature.key); // Set the newly created feature as selected
  };

  const center = () => {
    if (!selectedFeature) return { lat: 38.659784, lng: -9.202765 };
    const feature = worksheet.features[selectedFeature];
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return { lat: 38.659784, lng: -9.202765 };
    console.log("centering on feature:", feature);
    const bounds = getFeatureBounds(feature);
    if (bounds && !bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds);
      const center = bounds.getCenter();
      return { lat: center.lat(), lng: center.lng() };
    }
    return { lat: 38.659784, lng: -9.202765 };
  };

  // Function to center map on a specific feature and select it
  const centerOnFeature = (feature) => {
    if (!feature.geometry || !feature.geometry.coordinates) return;
    console.log("Centering on feature:", feature);
    setSelectedFeature(feature.key);
  };

  // Auto-center on first feature when features are loaded
  const handleMapLoad = (map) => {
    mapRef.current = map;
    if (!hasAutoCenter && worksheet.features && Object.values(worksheet.features).length > 0 && mapRef.current) {
      centerOnFeature(worksheet.features[Object.keys(worksheet.features)[0]]);
      setHasAutoCenter(true);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [originalCoords, setOriginalCoords] = useState(null);
  const selectedPolygonRef = useRef(null);

  // Reset editing state and stack when selectedFeature changes
  useEffect(() => {
    setIsEditing(false);
    setOriginalCoords(null);
  }, [selectedFeature]);

  const handleEditClick = () => {
    if (selectedFeature && worksheet.features[selectedFeature]) {
      setOriginalCoords(
        worksheet.features[selectedFeature].geometry.coordinates[0].map(coord => [...coord])
      );
      setIsEditing(true);
    }
  };

  const handleUndoAllEdits = () => {
    if (!selectedFeature || !worksheet.features[selectedFeature]) return;

    // Get the original coordinates from the state variable (not redeclaring)
    const polygon = selectedPolygonRef.current?.polygon;

    if (polygon && polygon.getPath && originalCoords) {
      const path = polygon.getPath();

      // Clear and rebuild the path with original coordinates
      path.clear();
      originalCoords.forEach(([lng, lat]) => {
        path.push(new window.google.maps.LatLng(lat, lng));
      });

      console.log("All edits undone, polygon reset to original state");
    }
  };

  const handleStopEditing = () => {
    const polygon = selectedPolygonRef.current?.polygon;
    if (!polygon || !polygon.getPath) {
      setIsEditing(false);
      return;
    }
    const path = polygon.getPath();
    const newCoords = path.getArray().map(latLng => [latLng.lng(), latLng.lat()]);
    setWorksheet(prevForm => ({
      ...prevForm,
      features: {
        ...prevForm.features,
        [selectedFeature]: {
          ...prevForm.features[selectedFeature],
          geometry: {
            ...prevForm.features[selectedFeature].geometry,
            coordinates: [newCoords]
          }
        }
      }
    }));
    setIsEditing(false);
    setOriginalCoords(null);
  };

  const editingControls = (
    <div style={{ display: 'flex', gap: 20, marginTop: 10, justifyContent: 'center' }}>
      {!isEditing ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleEditClick}
          style={{ fontSize: '12px', padding: '5px 10px' }}
          disabled={!selectedFeature}
        >
          Edit Polygon
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleStopEditing}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            Stop Editing
          </button>
          <button
            type="button"
            className="btn btn-warning"
            style={{ fontSize: '12px', padding: '5px 10px' }}
            onClick={handleUndoAllEdits}
            disabled={!originalCoords || originalCoords.length === 0}
          >
            Reset to Original
          </button>
        </>
      )}
    </div>
  );

  const renderFeatureOnMap = (feature, index) => {
    if (!feature.geometry) return null;

    const { type, coordinates } = feature.geometry;
    const baseColor = `hsl(${(index * 60) % 360}, 70%, 60%)`;
    const strokeColor = `hsl(${(index * 60) % 360}, 70%, 40%)`;
    const ruralPropertyId = feature.properties?.rural_property_id;
    const isSelected = String(selectedFeature) === String(feature.key);

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
        const isCurrentlySelected = String(selectedFeature) === String(feature.key);

        const polygonElement = (
          <Polygon
            key={isCurrentlySelected && isEditing ? `editing-${feature.key}` : `feature-polygon-${feature.key}`}
            paths={coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }))}
            options={{
              fillColor: baseColor,
              fillOpacity: 0.5,
              strokeWeight: 2,
              strokeColor: strokeColor
            }}
            onClick={() => centerOnFeature(feature)}
            editable={!isViewMode && isCurrentlySelected && isEditing}
            ref={isCurrentlySelected ? selectedPolygonRef : null}
          />
        );

        // Add rural property ID label and directions button if available and feature is selected
        if (ruralPropertyId && isSelected) {
          const centroid = calculatePolygonCentroid(coordinates[0]);
          const labelElement = (
            <InfoWindow
              key={`feature-polygon-label-${feature.key}`}
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
                <br />
                <button
                  type="button"
                  className="btn btn-info"
                  style={{ fontSize: '11px', marginTop: '4px', padding: '2px 8px' }}
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${centroid.lat},${centroid.lng}`;
                    window.open(url, '_blank');
                  }}
                >
                  Get Directions
                </button>
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

  // Add this before your return statement
  const featureKeys = Object.keys(worksheet.features);
  const selectedIndex = featureKeys.findIndex(key => String(key) === String(selectedFeature));
  const windowSize = 20; // Show 20 features at a time (10 before, 10 after)

  // Calculate start and end
  let start = Math.max(0, selectedIndex - Math.floor(windowSize / 2));
  let end = start + windowSize;
  if (end > featureKeys.length) {
    end = featureKeys.length;
    start = Math.max(0, end - windowSize);
  }
  const showNext = end < featureKeys.length;
  const showPrev = start > 0;

  const visibleFeatures = featureKeys.slice(start + (showPrev ? 1 : 0), end - (showNext ? 1 : 0));

  console.log("Visible features:", visibleFeatures);
  console.log("Start index:", start, "End index:", end);

  const [jumpKey, setJumpKey] = useState('');
  const handleJumpToKey = () => {
    if (jumpKey && worksheet.features[jumpKey]) {
      setSelectedFeature(jumpKey);
      setJumpKey('');
    } else {
      alert(`Feature with key ${jumpKey} does not exist.`);
      setJumpKey('');
    }
  };

  return (
    <>
      <MemoizedGeneralInfo worksheet={worksheet} setWorksheet={setWorksheet} isViewMode={isViewMode} />

      <MemoizedAigpInput worksheet={worksheet} setWorksheet={setWorksheet} isViewMode={isViewMode} />

      <MemoizedOperations operations={operations} setWorksheet={setWorksheet} isViewMode={isViewMode} />

      <MemoizedSelectedFeature worksheet={worksheet} setWorksheet={setWorksheet} selectedFeature={selectedFeature} setSelectedFeature={setSelectedFeature} isViewMode={isViewMode} />

      {/* Feature Navigation Controls */}
      {worksheet.features && featureKeys.length > 0 && (
        <fieldset className="form-section">
          <legend>Feature Navigation</legend>
          <div style={{ padding: '10px', backgroundColor: '#e8f4fd', borderRadius: '4px', border: '1px solid #bee5eb' }}>
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ margin: '0', fontSize: '14px', color: '#0c5460' }}>
                Navigate Features ({featureKeys.length} features)
                {selectedFeature && worksheet.features[selectedFeature] && <span style={{ fontWeight: 'normal' }}> - Selected: {worksheet.features[selectedFeature].properties?.aigp || 'Unknown'}-{worksheet.features[selectedFeature].properties?.polygon_id || 'Unknown'}</span>}
              </h4>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
              {showPrev && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px', margin: '2px' }}
                  onClick={() => setSelectedFeature(featureKeys[start - 1])}
                >
                  &laquo; Prev
                </button>
              )}
              {visibleFeatures.map((key, index) => {
                const feature = worksheet.features[key];
                const isSelected = String(selectedFeature) === String(feature.key);
                const displayLabel = feature.properties?.aigp && feature.properties?.polygon_id
                  ? `${feature.properties.aigp}-${feature.properties.polygon_id}`
                  : feature.properties?.aigp || `${feature.geometry?.type} ${start + index + 1}`;
                return (
                  <button
                    key={`center-feature-${feature.key}`}
                    type="button"
                    onClick={() => setSelectedFeature(feature.key)}
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
              {showNext && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px', margin: '2px' }}
                  onClick={() => setSelectedFeature(featureKeys[end])}
                >
                  Next &raquo;
                </button>
              )}
            </div>
            {/* Centered Jump Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '5px' }}>
              <input
                type="text"
                value={jumpKey}
                onChange={e => setJumpKey(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleJumpToKey();
                  }
                }}
                placeholder="Jump to key"
                style={{ fontSize: '11px', padding: '3px 8px', minWidth: '80px' }}
              />
              <button
                type="button"
                className="btn btn-info"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={handleJumpToKey}
              >
                Jump
              </button>
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
              {worksheet.features && Object.values(worksheet.features).length > 0
                ? `${Object.values(worksheet.features).length} feature(s) loaded`
                : worksheet.polygon && worksheet.polygon.length > 0
                  ? `${Array.isArray(worksheet.polygon[0]) ? worksheet.polygon.length : 1} polygon(s) drawn`
                  : 'No features or polygons loaded'
              }
            </p>
            {((worksheet.features && Object.values(worksheet.features).length > 0) || (worksheet.polygon && worksheet.polygon.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFeature(null); // Clear selected feature
                  Object.values(worksheet.features).forEach(feature => {
                    const aigp = feature.properties?.aigp;
                    if (aigp && worksheet.aigp && worksheet.aigp[aigp]) {
                      // Decrement count for the AIGP in the worksheet
                      setWorksheet((prevForm) => {
                        const updatedAigp = { ...prevForm.aigp };
                        updatedAigp[aigp]--;
                        if (updatedAigp[aigp] <= 0) delete updatedAigp[aigp];
                        return { ...prevForm, aigp: updatedAigp };
                      });
                    }
                  });
                  // Clear all features and polygons
                  setWorksheet((prevForm) => ({ ...prevForm, polygon: [], features: {} }));
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
          onLoad={handleMapLoad}
          id="drawing-manager-example"
          mapContainerStyle={{ height: "400px", width: "100%" }}
          center={center()}
          zoom={16}
        >
          {!isViewMode && (
            <DrawingManager
              onPolygonComplete={onPolygonComplete}
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
          {worksheet.features && Object.keys(worksheet.features).length > 0 && (
            Object.values(worksheet.features).flatMap((feature, index) => {
              const rendered = renderFeatureOnMap(feature, index);
              // Handle both single elements and arrays of elements
              return Array.isArray(rendered) ? rendered : [rendered];
            }).filter(element => element !== null)
          )}
        </GoogleMap>
        {selectedFeature && !isViewMode && editingControls}
      </fieldset>
    </>
  )
});

const MemoizedGeneralInfo = React.memo(function GeneralInfo({ worksheet, setWorksheet, isViewMode }) {
  const [localWorksheet, setLocalWorksheet] = useState(worksheet);
  const handleLocalChange = (event) => {
    const { name, value } = event.target;
    setLocalWorksheet((prevForm) => ({
      ...prevForm,
      [name]: value
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    // Update the main worksheet state with the local changes
    setWorksheet((prevForm) => ({
      ...prevForm,
      [name]: value
    }));
  };
  return <>
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
          value={localWorksheet.id || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          required
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="title">Title:</label>
        <input
          className="form-input"
          id="title"
          type="text"
          name="title"
          value={localWorksheet.title || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          required
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="status">Status:</label>
        <input
          className="form-input"
          id="status"
          type="text"
          name="status"
          value={localWorksheet.status || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          required
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="starting_date">Starting Date:</label>
        <input
          className="form-input"
          id="starting_date"
          type="date"
          name="starting_date"
          value={localWorksheet.starting_date || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="finishing_date">Finishing Date:</label>
        <input
          className="form-input"
          id="finishing_date"
          type="date"
          name="finishing_date"
          value={localWorksheet.finishing_date || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="issue_date">Issue Date:</label>
        <input
          className="form-input"
          id="issue_date"
          type="date"
          name="issue_date"
          value={localWorksheet.issue_date || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="award_date">Award Date:</label>
        <input
          className="form-input"
          id="award_date"
          type="date"
          name="award_date"
          value={localWorksheet.award_date || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="service_provider_id">Service Provider ID:</label>
        <input
          className="form-input"
          id="service_provider_id"
          type="text"
          name="service_provider_id"
          value={localWorksheet.service_provider_id || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="issuing_user_id">Issuing User ID:</label>
        <input
          className="form-input"
          id="issuing_user_id"
          type="text"
          name="issuing_user_id"
          value={localWorksheet.issuing_user_id || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />

        <label className="form-label" htmlFor="posa_code">POSA Code:</label>
        <input
          className="form-input"
          id="posa_code"
          type="text"
          name="posa_code"
          value={localWorksheet.posa_code || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />
        <label className="form-label" htmlFor="posa_description">POSA Description:</label>
        <input
          className="form-input"
          id="posa_description"
          type="text"
          name="posa_description"
          value={localWorksheet.posa_description || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />
        <label className="form-label" htmlFor="posp_code">POSP Code:</label>
        <input
          className="form-input"
          id="posp_code"
          type="text"
          name="posp_code"
          value={localWorksheet.posp_code || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />
        <label className="form-label" htmlFor="posp_description">POSP Description:</label>
        <input
          className="form-input"
          id="posp_description"
          type="text"
          name="posp_description"
          value={localWorksheet.posp_description || ""}
          onChange={handleLocalChange}
          onBlur={handleChange}
          disabled={isViewMode}
        />
      </div>
    </fieldset>
  </>
});

const MemoizedAigpInput = React.memo(function AigpInput({ worksheet, setWorksheet, isViewMode }) {
  // Local state for AIGP input
  const [aigpInput, setAigpInput] = useState(Object.keys(worksheet.aigp || {}).join(', '));
  useEffect(() => {
    setAigpInput(Object.keys(worksheet.aigp || {}).join(', '));
  }, [worksheet.aigp]);

  const handleAigpInputChange = (event) => {
    setAigpInput(event.target.value);
  };

  const handleAigpBlur = () => {
    // Convert comma-separated string to array and create AIGP objects
    const aigpArray = aigpInput.split(',').map(item => item.trim()).filter(item => item !== '');
    setWorksheet((prevForm) => {
      const newAigp = {};
      aigpArray.forEach(aigp => {
        if (aigp) {
          // Check if any features are already using this AIGP
          const existingCount = Object.values(prevForm.features || {}).filter(
            feature => feature.properties?.aigp === aigp
          ).length;
          // Set count to existing usage or default to 0 for new AIGPs
          newAigp[aigp] = existingCount > 0 ? existingCount : Number.MAX_SAFE_INTEGER; // Use a large number for new AIGPs
        }
      });
      return {
        ...prevForm,
        aigp: newAigp
      };
    });
  };
  return <>
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
          value={aigpInput}
          onChange={handleAigpInputChange}
          onBlur={handleAigpBlur}
          disabled={isViewMode}
          placeholder="Enter AIGP values separated by commas"
        />
        <small style={{ fontSize: '12px', color: '#666', gridColumn: '1 / -1' }}>
          Enter multiple AIGP values separated by commas (e.g., "AIGP001, AIGP002, AIGP003")
        </small>
      </div>
    </fieldset>
  </>
});

const MemoizedOperations = React.memo(function Operations({ operations, setWorksheet, isViewMode }) {
  const [localOperations, setLocalOperations] = useState(operations);

  const handleLocalOperationChange = (index, event) => {
    const { name, value } = event.target;
    setLocalOperations((prevOperations) => {
      const updatedOperations = [...prevOperations];
      updatedOperations[index] = {
        ...updatedOperations[index],
        [name]: value
      };
      return updatedOperations;
    });
  };

  const handleOperationChange = (index, event) => {
    const { name, value } = event.target;
    setWorksheet((prevForm) => {
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
  };

  const handleRemoveOperation = (index) => {
    setWorksheet((prevForm) => ({
      ...prevForm,
      operations: prevForm.operations.filter((_, i) => i !== index)
    }));
  };
  return <>
    {/* Operations */}
    <fieldset className="form-section">
      <legend>Operations</legend>
      {localOperations.map((operation, index) => (
        <div key={index} className="operation">
          <label className="form-label" htmlFor={`operation_code_${index}`}>Operation Code:</label>
          <input
            className="form-input"
            id={`operation_code_${index}`}
            type="text"
            name="operation_code"
            value={operation.operation_code || ""}
            onChange={(e) => handleLocalOperationChange(index, e)}
            onBlur={(e) => handleOperationChange(index, e)}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor={`operation_description_${index}`}>Operation Description:</label>
          <input
            className="form-input"
            id={`operation_description_${index}`}
            type="text"
            name="operation_description"
            value={operation.operation_description || ""}
            onChange={(e) => handleLocalOperationChange(index, e)}
            onBlur={(e) => handleOperationChange(index, e)}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor={`area_ha_${index}`}>Area (ha):</label>
          <input
            className="form-input"
            id={`area_ha_${index}`}
            type="number"
            name="area_ha"
            value={operation.area_ha || ""}
            onChange={(e) => handleLocalOperationChange(index, e)}
            onBlur={(e) => handleOperationChange(index, e)}
            disabled={isViewMode}
          />
          {!isViewMode && localOperations.length > 1 && (
            <button
              className="btn btn-danger btn-small"
              type="button"
              onClick={() => handleRemoveOperation(index)}
              disabled={isViewMode || localOperations.length === 1}
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
          onClick={() => {
            if (localOperations.length >= 5) {
              console.warn("Maximum of 5 operations allowed");
              alert("Maximum of 5 operations allowed");
              return;
            }
            setWorksheet((prevForm) => ({
              ...prevForm,
              operations: [...prevForm.operations, { operation_code: '', operation_description: '', area_ha: '' }]
            }))
          }
          }>
          Add Operation
        </button>
      )}
    </fieldset>
  </>
});

const MemoizedSelectedFeature = React.memo(function SelectedFeature({ worksheet, setWorksheet, selectedFeature, setSelectedFeature, isViewMode }) {
  const [localSelectedFeature, setLocalSelectedFeature] = useState(worksheet.features[selectedFeature] || null);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    setLocalSelectedFeature(worksheet.features[selectedFeature] || null);
    setKeyError('');
  }, [selectedFeature, worksheet.features]);

  const handleLocalSelectedFeatureChange = (event) => {
    const { name, value } = event.target;
    if (
      name === 'polygon_id' &&
      worksheet.features[value] &&
      String(value) !== String(selectedFeature) // Only error if not the original key
    ) {
      setKeyError('This polygon_id already exists. Please choose a unique one.');
    } else {
      setKeyError('');
    }
    setLocalSelectedFeature((prev) => {
      if (name === 'polygon_id') {
        return {
          ...prev,
          key: value,
          properties: {
            ...prev.properties,
            polygon_id: value
          }
        };
      }
      return {
        ...prev,
        properties: {
          ...prev.properties,
          [name]: value
        }
      };
    });
  };

  const handleSelectedFeatureChange = (event) => {
    const { name, value } = event.target;
    // On blur, if polygon_id is not unique, revert to previous key
    if (name === 'polygon_id' && String(value) !== String(selectedFeature)) {
      if (worksheet.features[value]) {
        setKeyError(`This polygon_id already exists: "${value}". Please choose a unique one.`);
        setLocalSelectedFeature(prev => ({
          ...prev,
          key: selectedFeature,
          properties: {
            ...prev.properties,
            polygon_id: selectedFeature
          }
        }));
        return;
      }
    }
    setWorksheet((prevForm) => {
      let updatedFeatures = { ...prevForm.features };

      let updatedAigp = { ...prevForm.aigp };

      if (name === 'aigp') {
        // Handle AIGP count update
        const oldAigp = updatedFeatures[selectedFeature]?.properties?.aigp;
        const newAigp = value;

        // Decrement old AIGP count
        if (oldAigp && updatedAigp[oldAigp]) {
          updatedAigp[oldAigp]--;
          if (updatedAigp[oldAigp] <= 0) {
            // Always create a new object reference without the key
            const { [oldAigp]: _removed, ...rest } = updatedAigp;
            updatedAigp = { ...rest };
          }
        }
        // Increment new AIGP count
        if (newAigp) {
          updatedAigp[newAigp] = (updatedAigp[newAigp] || 0) + 1;
        }
      }

      if (name === 'polygon_id' && String(value) !== String(selectedFeature)) {
        updatedFeatures[value] = {
          ...updatedFeatures[selectedFeature],
          key: value,
          properties: {
            ...updatedFeatures[selectedFeature].properties,
            polygon_id: value
          }
        };
        delete updatedFeatures[selectedFeature];
        setSelectedFeature(value);
      } else {
        updatedFeatures[selectedFeature] = {
          ...updatedFeatures[selectedFeature],
          properties: {
            ...updatedFeatures[selectedFeature].properties,
            [name]: value
          }
        };
      }
      return { ...prevForm, features: updatedFeatures, aigp: updatedAigp };
    });
  };

  return <>
    {/* Selected Feature Details */}
    {localSelectedFeature && (
      <fieldset className="form-section">
        <legend>Selected Feature Details</legend>
        <div className="form-grid">
          <label className="form-label" htmlFor="feature_aigp">AIGP:</label>
          <input
            className="form-input"
            id="feature_aigp"
            type="text"
            name="aigp"
            value={localSelectedFeature.properties?.aigp || ""}
            onChange={handleLocalSelectedFeatureChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSelectedFeatureChange(e);
              }
            }}
            onBlur={handleSelectedFeatureChange}
            disabled={isViewMode}
            readOnly={isViewMode}
          />

          <label className="form-label" htmlFor="feature_ui_id">UI ID (LandIT Worker):</label>
          <input
            className="form-input"
            id="feature_ui_id"
            type="text"
            name="UI_id"
            value={localSelectedFeature.properties?.UI_id || ""}
            onChange={handleLocalSelectedFeatureChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSelectedFeatureChange(e);
              }
            }}
            onBlur={handleSelectedFeatureChange}
            disabled={isViewMode}
            readOnly={isViewMode}
          />

          <label className="form-label" htmlFor="feature_polygon_id">Polygon ID:</label>
          <div className="input-error-container">
            <input
              className="form-input"
              id="feature_polygon_id"
              type="text"
              name="polygon_id"
              value={localSelectedFeature.properties?.polygon_id || ""}
              onChange={handleLocalSelectedFeatureChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSelectedFeatureChange(e);
                }
              }}
              onBlur={handleSelectedFeatureChange}
              disabled={isViewMode}
              readOnly={isViewMode}
            />
            {keyError && (
              <div className="form-error-inline">
                {keyError}
              </div>
            )}
          </div>

          <label className="form-label" htmlFor="feature_rural_property_id">Rural Property ID:</label>
          <input
            className="form-input"
            id="feature_rural_property_id"
            type="text"
            name="rural_property_id"
            value={localSelectedFeature.properties?.rural_property_id || ""}
            onChange={handleLocalSelectedFeatureChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSelectedFeatureChange(e);
              }
            }}
            onBlur={handleSelectedFeatureChange}
            disabled={isViewMode}
            readOnly={isViewMode}
          />

          <label className="form-label" htmlFor="feature_geometry_type">Geometry Type:</label>
          <input
            className="form-input"
            id="feature_geometry_type"
            type="text"
            value={localSelectedFeature.geometry?.type || ""}
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
          <>
            {!isViewMode && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ fontSize: '12px', padding: '5px 15px', marginLeft: '10px' }}
                onClick={() => {
                  // Remove the selected feature from the worksheet
                  setWorksheet(prevForm => {
                    const newFeatures = { ...prevForm.features };
                    const removedFeature = newFeatures[selectedFeature];
                    delete newFeatures[selectedFeature];

                    // If the removed feature had an AIGP, decrement its count
                    let updatedAigp = { ...prevForm.aigp };
                    const aigpKey = removedFeature.properties?.aigp;
                    if (aigpKey && updatedAigp[aigpKey]) {
                      updatedAigp[aigpKey]--;
                      if (updatedAigp[aigpKey] <= 0) {
                        // Remove the key with a new object reference
                        const { [aigpKey]: _, ...rest } = updatedAigp;
                        updatedAigp = rest;
                      }
                    }

                    setTimeout(() => {
                      const featureKeys = Object.keys(newFeatures);
                      // If no features left, clear selected feature
                      if (featureKeys.length === 0) {
                        setSelectedFeature(null);
                      } else {
                        setSelectedFeature(featureKeys[0] || null);
                      }
                    }, 0);
                    return { ...prevForm, aigp: updatedAigp, features: newFeatures };
                  });

                }}
              >
                Remove Feature
              </button>
            )}
          </>
        </div>
      </fieldset>
    )}
  </>
});

/**
 * Fetches a worksheet by ID, checks for errors, and normalizes the data.
 * Use this instead of fetchWorkSheet directly in View and Edit.
 * @param {string} id - Worksheet ID
 * @param {function} navigate - Navigation function
 * @param {boolean} [generic=false] - If true, fetches generic worksheet view
 * @returns {Promise<Object>} - Normalized worksheet object
 */
export async function fetchWsNorm(id, navigate, generic = false) {
  try {
    const data = await fetchWorkSheet(id, navigate, generic);
    if (!data) throw new Error("No data found for the given ID");
    const normalizedData = normalizeWorksheet(data);
    normalizedData.id = id;
    return normalizedData;
  } catch (err) {
    console.error("Error fetching and normalizing worksheet:", err);
    throw err;
  }
}

export async function worksheetToGeoJSON(worksheet, crsCode = 'EPSG:4326') {
  const features = await Promise.all(
    Object.values(worksheet.features).map(async (feature) => {
      try {
        const convertCoords = await convertGeometryCoordinates(feature.geometry.coordinates, feature.geometry.type, 'EPSG:4326', crsCode);
        console.log(`Converted coordinates for feature ${feature.key}:`, convertCoords);
        const { key, ...featureWithoutKey } = feature;
        return {
          ...featureWithoutKey,
          geometry: {
            ...feature.geometry,
            coordinates: convertCoords
          }
        };
      } catch (error) {
        console.error(`Error converting coordinates for feature ${feature.key}:`, error);
        return null; // Skip this feature if conversion fails
      }
    })
  );

  const aigp = Object.keys(worksheet.aigp || {});

  return {
    type: 'FeatureCollection',
    name: worksheet.title,
    crs: {
      type: 'name',
      properties: { name: `urn:ogc:def:crs:${crsCode}` }
    },
    features: features.filter(f => f), // Filter out any null features that failed conversion
    metadata: {
      id: worksheet.id,
      title: worksheet.title,
      status: worksheet.status,
      starting_date: worksheet.starting_date,
      finishing_date: worksheet.finishing_date,
      issue_date: worksheet.issue_date,
      service_provider_id: worksheet.service_provider_id,
      award_date: worksheet.award_date,
      issuing_user_id: worksheet.issuing_user_id,
      aigp: aigp,
      posa_code: worksheet.posa_code,
      posa_description: worksheet.posa_description,
      posp_code: worksheet.posp_code,
      posp_description: worksheet.posp_description,
      operations: worksheet.operations
    }
  };
}

// Helper function to normalize AIGP data from various formats
// Helper function to normalize AIGP data from various formats
export function normalizeAigpData(aigpData) {
  // If it's already an object (count map), check for stringified array keys
  if (aigpData && typeof aigpData === 'object' && !Array.isArray(aigpData)) {
    const keys = Object.keys(aigpData);
    if (keys.length === 1 && keys[0].startsWith('["') && keys[0].endsWith('"]')) {
      try {
        const arr = JSON.parse(keys[0]);
        if (Array.isArray(arr)) {
          const map = {};
          arr.forEach(aigp => { if (aigp) map[aigp] = Number.MAX_SAFE_INTEGER; });
          return map;
        }
      } catch (e) { }
    }
    return aigpData;
  }

  // If it's a stringified array, parse it
  if (typeof aigpData === 'string') {
    let parsed;
    try {
      parsed = JSON.parse(aigpData);
      if (Array.isArray(parsed)) {
        const map = {};
        parsed.forEach(aigp => { if (aigp) map[aigp] = Number.MAX_SAFE_INTEGER; });
        return map;
      }
    } catch (e) {
      // Not a JSON array, treat as comma-separated
      if (aigpData.trim() === '') return {};
      const map = {};
      aigpData.split(',').map(item => item.trim()).filter(item => item !== '').forEach(aigp => {
        map[aigp] = Number.MAX_SAFE_INTEGER;
      });
      return map;
    }
  }

  // If it's already an array, convert to count map
  if (Array.isArray(aigpData)) {
    const map = {};
    aigpData.forEach(aigp => { if (aigp) map[aigp] = Number.MAX_SAFE_INTEGER; });
    return map;
  }

  // Default fallback
  return {};
}

// Simple normalization function for backward compatibility with existing data
export function normalizeWorksheet(data) {
  let featuresArray = [];
  if (Array.isArray(data.features)) {
    featuresArray = data.features;
  } else if (typeof data.features === "string" && data.features.trim() !== "") {
    try {
      featuresArray = JSON.parse(data.features);
    } catch (e) {
      console.error("Failed to parse features JSON:", e, data.features);
      featuresArray = [];
    }
  }
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
    issuing_user_id: data.issuing_user_id || '',
    posa_code: data.posa_code || '',
    posa_description: data.posa_description || '',
    posp_code: data.posp_code || '',
    posp_description: data.posp_description || '',
    aigp: normalizeAigpData(data.aigp),
    operations: Array.isArray(data.operations) ? data.operations : (typeof data.operations === "string" ? JSON.parse(data.operations) : []),
    features: Object.fromEntries(
      featuresArray.map((feature, idx) => {
        // Ensure each feature has a unique key
        const key = feature.properties?.polygon_id || feature.properties?.id || `${Date.now()}_${idx}`;;
        return [key, { ...feature, key }];
      })
    )
  };
}

function getFeatureBounds(feature) {
  const bounds = new window.google.maps.LatLngBounds();

  const addCoords = (coords) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(addCoords);
    } else if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      bounds.extend({ lat: coords[1], lng: coords[0] });
    }
  };

  if (feature.geometry) {
    switch (feature.geometry.type) {
      case 'Polygon':
        addCoords(feature.geometry.coordinates[0]);
        break;
      case 'MultiPolygon':
        feature.geometry.coordinates.forEach(polygon => addCoords(polygon[0]));
        break;
      case 'LineString':
        addCoords(feature.geometry.coordinates);
        break;
      case 'MultiLineString':
        feature.geometry.coordinates.forEach(addCoords);
        break;
      case 'Point':
        addCoords(feature.geometry.coordinates);
        break;
      case 'MultiPoint':
        feature.geometry.coordinates.forEach(addCoords);
        break;
      default:
        break;
    }
  }
  return bounds;
}

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

async function ensureProj4Definition(epsgCode) {
  if (proj4.defs[epsgCode]) return; // Already defined
  const codeNum = epsgCode.replace('EPSG:', '');
  const url = `https://epsg.io/${codeNum}.proj4`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch EPSG definition for ${epsgCode}`);
    }
    const proj4Def = await response.text();
    proj4.defs(epsgCode, proj4Def);
  } catch (error) {
    console.error(`Error fetching EPSG definition for ${epsgCode}:`, error);
    throw new Error(`Could not load EPSG definition for ${epsgCode}. Please ensure you have internet access or the definition is available locally.`);
  }
}

proj4.defs("EPSG:3763", "+proj=tmerc +lat_0=39.6682583333333 +lon_0=-8.13310833333333 +k=1 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
proj4.defs("EPSG:4326", proj4.WGS84);

/**
 * Convert coordinates using local approximation (no external API calls)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {string} sourceCRS - Source CRS code (e.g., 'EPSG:3763')
 * @param {string} targetCRS - Target CRS code (e.g., 'EPSG:4326')
 * @returns {Promise<Array>} - Converted [lng, lat] coordinates
 */
async function convertCoordinates(x, y, sourceCRS, targetCRS = 'EPSG:4326') {
  try {
    // If source and target are the same, return as-is
    if (sourceCRS === targetCRS) {
      return [x, y];
    }

    // For EPSG:3763 (Portugal TM06) to EPSG:4326 (WGS84) conversion
    if (sourceCRS === 'EPSG:3763' && targetCRS === 'EPSG:4326') {
      const latlng = proj4('EPSG:3763', 'EPSG:4326', [x, y]);

      return latlng;
    }
    await ensureProj4Definition(sourceCRS); // Ensure proj4 definition is loaded

    // For other coordinate systems, return espg.io coordinates with warning
    console.warn(`Coordinate conversion from ${sourceCRS} to ${targetCRS} not completely supported. Using espg.io proj4 definition.`);
    return proj4(sourceCRS, targetCRS, [x, y]);

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
export async function convertGeometryCoordinates(coordinates, geometryType, sourceCRS, targetCRS = 'EPSG:4326') {
  switch (geometryType) {
    case 'Point':
      return await convertCoordinates(coordinates[0], coordinates[1], sourceCRS, targetCRS);

    case 'LineString':
      return await Promise.all(
        coordinates.map(coord => convertCoordinates(coord[0], coord[1], sourceCRS, targetCRS))
      );

    case 'Polygon':
      return await Promise.all(
        coordinates.map(ring =>
          Promise.all(ring.map(coord => convertCoordinates(coord[0], coord[1], sourceCRS, targetCRS)))
        )
      );

    case 'MultiPoint':
      return await Promise.all(
        coordinates.map(coord => convertCoordinates(coord[0], coord[1], sourceCRS, targetCRS))
      );

    case 'MultiLineString':
      return await Promise.all(
        coordinates.map(line =>
          Promise.all(line.map(coord => convertCoordinates(coord[0], coord[1], sourceCRS, targetCRS)))
        )
      );

    case 'MultiPolygon':
      return await Promise.all(
        coordinates.map(polygon =>
          Promise.all(polygon.map(ring =>
            Promise.all(ring.map(coord => convertCoordinates(coord[0], coord[1], sourceCRS, targetCRS)))
          ))
        )
      );

    default:
      throw new Error(`Unsupported geometry type: ${geometryType}`);
  }
}

export function DeleteWorkSheet({ worksheetId, onClose }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/rest/worksheet/delete/${worksheetId}`, {
        method: 'DELETE',
        headers: {
        }
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/'); // Redirect to the worksheets list or home page
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to delete worksheet. Please try again later.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error deleting worksheet:", error);
      setError("An error occurred while deleting the worksheet. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="delete-worksheet-container" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        minWidth: 320,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        position: 'relative'
      }}>
        <button
          onClick={() => {
            if (onClose) onClose();
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer'
          }}
          aria-label="Close"
          type="button"
        >&times;</button>
        <h2>Delete WorkSheet</h2>
        <p>Are you sure you want to delete the worksheet with ID: <strong>{worksheetId}</strong>?</p>
        <button onClick={handleDelete} className="btn btn-danger" disabled={loading || success}>
          {loading ? (
            <>
              Deleting...
              <span className="spinner" />
            </>
          ) : (
            'Delete WorkSheet'
          )}
        </button>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Worksheet deleted successfully!</div>}
      </div>
    </div>
  );
}

export function GenericWorksheetDisplay({ worksheetData, showActions = false, onViewDetails, onClose }) {

  return (
    <div className="generic-worksheet-content">
      <div className="worksheet-info-grid">
        <div className="info-row">
          <span className="info-label">ID:</span>
          <span className="info-value">{worksheetData.id}</span>
        </div>

        {worksheetData.title && (
          <div className="info-row">
            <span className="info-label">Title:</span>
            <span className="info-value">{worksheetData.title}</span>
          </div>
        )}

        {worksheetData.status && (
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`info-value status-${worksheetData.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {worksheetData.status}
            </span>
          </div>
        )}

        {worksheetData.starting_date && (
          <div className="info-row">
            <span className="info-label">Starting Date:</span>
            <span className="info-value">{worksheetData.starting_date}</span>
          </div>
        )}

        {worksheetData.finishing_date && (
          <div className="info-row">
            <span className="info-label">Finishing Date:</span>
            <span className="info-value">{worksheetData.finishing_date}</span>
          </div>
        )}

        {worksheetData.issue_date && (
          <div className="info-row">
            <span className="info-label">Issue Date:</span>
            <span className="info-value">{worksheetData.issue_date}</span>
          </div>
        )}

        {worksheetData.award_date && (
          <div className="info-row">
            <span className="info-label">Award Date:</span>
            <span className="info-value">{worksheetData.award_date}</span>
          </div>
        )}

        {worksheetData.service_provider_id && (
          <div className="info-row">
            <span className="info-label">Service Provider:</span>
            <span className="info-value">{worksheetData.service_provider_id}</span>
          </div>
        )}

        {worksheetData.aigp && Object.keys(worksheetData.aigp).length > 0 && (
          <div className="info-row">
            <span className="info-label">AIGP:</span>
            <div className="info-value">
              <div className="aigp-list">
                {Object.keys(worksheetData.aigp).map((aigp, index) => (
                  <span key={index} className="aigp-tag">
                    {aigp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showActions && (
        <div className="generic-worksheet-actions">
          {onViewDetails && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => onViewDetails(worksheetData.id)}
            >
              View Full Details
            </button>
          )}
          {onClose && (
            <button
              className="btn btn-secondary btn-small"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
