export default function CheckRequests(response, token, navigate) {
  if (!token) {
    console.error("No authentication token provided.");
    return;
  }
  if (response.status === 400) {
    console.error("Bad request, please check your input.");
    return response.error || "Bad request, please check your input.";
  } else if (response.status === 401) {
    console.warn("Unauthorized access, redirecting to login.");
    sessionStorage.removeItem('authToken');
    navigate('/login');
  } else if (response.status === 403) {
    console.warn("Forbidden access, redirecting to home.");
    navigate('/');
  } else if (response.status >= 500) {
    console.error("Server error occurred.");
    return "Server error occurred, please try again later.";
  } else if (!response.ok) {
    console.error("An unexpected error occurred:", response.statusText);
  }

}
