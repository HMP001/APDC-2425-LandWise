import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleMap, LoadScript, DrawingManager, Polygon } from '@react-google-maps/api';
import { topBar } from './TopBar';
import './WorkSheet.css';

async function fetchWorkSheet(token, id) {
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
  return (
    <>
      {/* General Info */}
      <fieldset className="form-section">
        <legend>General Information</legend>
        <div className="form-grid">
          <label className="form-label" htmlFor="title">Title:</label>
          <input
            className="form-input"
            id="title"
            type="text"
            name="title"
            value={form.title}
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
            value={form.status}
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
            value={form.starting_date}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="finishing_date">Finishing Date:</label>
          <input
            className="form-input"
            id="finishing_date"
            type="date"
            name="finishing_date"
            value={form.finishing_date}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="issue_date">Issue Date:</label>
          <input
            className="form-input"
            id="issue_date"
            type="date"
            name="issue_date"
            value={form.issue_date}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="award_date">Award Date:</label>
          <input
            className="form-input"
            id="award_date"
            type="date"
            name="award_date"
            value={form.award_date}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="service_provider_id">Service Provider ID:</label>
          <input
            className="form-input"
            id="service_provider_id"
            type="text"
            name="service_provider_id"
            value={form.service_provider_id}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <label className="form-label" htmlFor="posa_code">POSA Code:</label>
          <input
            className="form-input"
            id="posa_code"
            type="text"
            name="posa_code"
            value={form.posa_code}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posa_description">POSA Description:</label>
          <input
            className="form-input"
            id="posa_description"
            type="text"
            name="posa_description"
            value={form.posa_description}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posp_code">POSP Code:</label>
          <input
            className="form-input"
            id="posp_code"
            type="text"
            name="posp_code"
            value={form.posp_code}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="posp_description">POSP Description:</label>
          <input
            className="form-input"
            id="posp_description"
            type="text"
            name="posp_description"
            value={form.posp_description}
            onChange={handleChange}
            disabled={isViewMode}
          />
        </div>
      </fieldset>

      {/* AIGP Details */}
      <fieldset className="form-section">
        <legend>AIGP Details</legend>
        <div className="form-grid">
          <label className="form-label" htmlFor="aigp_id">AIGP ID:</label>
          <input
            className="form-input"
            id="aigp_id"
            type="text"
            name="id"
            value={form.aigp.id}
            onChange={handleAigpChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="aigp_name">AIGP Name:</label>
          <input
            className="form-input"
            id="aigp_name"
            type="text"
            name="name"
            value={form.aigp.name}
            onChange={handleAigpChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="aigp_address">AIGP Address:</label>
          <input
            className="form-input"
            id="aigp_address"
            type="text"
            name="address"
            value={form.aigp.address}
            onChange={handleAigpChange}
            disabled={isViewMode}
          />
          <label className="form-label" htmlFor="aigp_nif">AIGP NIF:</label>
          <input
            className="form-input"
            id="aigp_nif"
            type="text"
            name="nif"
            value={form.aigp.nif}
            onChange={handleAigpChange}
            disabled={isViewMode}
          />
        </div>
      </fieldset>

      {/* Operations */}
      <fieldset className="form-section">
        <legend>Operations</legend>
        {form.operations.map((operation, index) => (
          <div key={index} className="operation">
            <label className="form-label" htmlFor={`operation_code_${index}`}>Operation Code:</label>
            <input
              className="form-input"
              id={`operation_code_${index}`}
              type="text"
              name="operation_code"
              value={operation.operation_code}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            <label className="form-label" htmlFor={`operation_description_${index}`}>Operation Description:</label>
            <input
              className="form-input"
              id={`operation_description_${index}`}
              type="text"
              name="operation_description"
              value={operation.operation_description}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            <label className="form-label" htmlFor={`area_ha_${index}`}>Area (ha):</label>
            <input
              className="form-input"
              id={`area_ha_${index}`}
              type="number"
              name="area_ha"
              value={operation.area_ha}
              onChange={(e) => handleOperationChange(index, e)}
              disabled={isViewMode}
            />
            {form.operations.length > 1 &&
              (
                <button
                  type="button"
                  onClick={() => handleRemoveOperation(index)}
                  disabled={isViewMode || form.operations.length === 1}
                  style={{ marginLeft: 10, marginTop: 10 }}
                >
                  Remove
                </button>
              )}
          </div>
        ))}
        {!isViewMode && (
          <button
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

      {/* Polygon */}
      <fieldset className="form-section">
        <legend>Polygon Coordinates</legend>
        <LoadScript
          googleMapsApiKey=""
          libraries={['drawing']}
        >
          <GoogleMap
            id="drawing-manager-example"
            mapContainerStyle={{ height: "400px", width: "100%" }}
            zoom={16}
            center={{ lat: 38.659784, lng: -9.202765 }}
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
            {form.polygon && form.polygon.length > 2 && (
              <Polygon
                paths={form.polygon}
                options={{
                  fillColor: "#ffff00",
                  fillOpacity: 0.5,
                  strokeWeight: 1
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>
      </fieldset>
    </>
  )
};

export default function WorkSheet({ mode, id = useParams }) {
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
    aigp: { id: '', name: '', address: '', nif: '' },
    operations: [{ operation_code: '', operation_description: '', area_ha: '' }],
    polygon: [{ lat: '', lng: '' }]
  });
  const [initialForm, setInitialForm] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const polygonRef = useRef(null);

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
          if (!data) {
            throw new Error("No data found for the given ID");
          }
          setForm(data);
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

  const handleAigpChange = (event) => {
    const { name, value } = event.target;
    setForm((prevForm) => ({
      ...prevForm,
      aigp: {
        ...prevForm.aigp,
        [name]: value
      }
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
  };

  const handleRemoveOperation = (index) => {
    setForm((prevForm) => ({
      ...prevForm,
      operations: prevForm.operations.filter((_, i) => i !== index)
    }));
  };

  const onPolygonComplete = (polygonObject) => {
    // Remove previous polygon from map
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    polygonRef.current = polygonObject;
    // Save polygon coordinates to form
    const path = polygonObject.getPath().getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng()
    }));
    setForm((prevForm) => ({
      ...prevForm,
      polygon: path
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("rest/worksheet/create", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(token, form)
      });
      if (response.ok) {
        const data = await response.json();
        console.log("WorkSheet created successfully:", data);
        navigate('/worksheets'); // Redirect to the worksheets list or detail page
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
export function ViewWorkSheet({ id = useParams }) {
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
    aigp: { id: '', name: '', address: '', nif: '' },
    operations: [{ operation_code: '', operation_description: '', area_ha: '' }],
    polygon: [{ lat: '', lng: '' }]
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
        setForm(data);
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
