import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CheckRequests(response, navigate) {
  if (response.status === 400) {
    toast.error("Bad request, please check your input.");
    console.error("Bad request, please check your input.");
  } else if (response.status === 401) {
    toast.warn(
      <>
        Session expired.<br />
        Please log in again.
      </>
    );
    console.warn("Unauthorized access, redirecting to login.");
    sessionStorage.removeItem('userInfo'); // Clear user info
    navigate('/login');
  } else if (response.status === 403) {
    toast.warn(
      <>
        Forbidden access.<br />
        You do not have permission to perform this action.
      </>
    );
    console.warn("Forbidden access.");
  } else if (response.status >= 500) {
    toast.error(
      <div>
        <div>Server error occurred.</div>
        <div>Please try again later.</div>
        <div>{defaultErrorMessage}</div>
      </div>
    );
    console.error("Server error occurred.");
    return "Server error occurred, please try again later.";
  } else if (!response.ok) {
    toast.error(
      <div>
        <div>An unexpected error occurred.</div>
        <div>{defaultErrorMessage}</div>
      </div>
    );
    console.error("An unexpected error occurred:", response.statusText);
  }

}

const defaultErrorMessage = "Please check console for more information";
