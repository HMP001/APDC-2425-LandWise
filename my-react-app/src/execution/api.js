// Utility API functions for execution sheet operations
export async function editOperationRequest(executionId, operationData) {
  const res = await fetch('/rest/execution/editOperation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      execution_id: executionId,
      operation: operationData
    })
  });
  if (!res.ok) throw new Error('Failed to edit operation');
  return await res.json();
}

export async function assignOperationRequest(payload) {
  const res = await fetch('/rest/execution/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to assign operation');
  return await res.json();
}

export async function startActivityRequest(payload) {
  const res = await fetch('/rest/execution/startActivity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to start activity');
  return await res.json();
}

export async function stopActivityRequest(payload) {
  const res = await fetch('/rest/execution/stopActivity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to stop activity');
  return await res.json();
}