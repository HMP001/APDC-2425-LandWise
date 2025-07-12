import './TopBar.css';

export default function TopBar({ navigate, title }) {
  return (
    <div className="topbar">
      <button
        type="button"
        className="back-arrow"
        onClick={() => navigate(-1)}
        aria-label="Back to previous page"
      >
        &lt;
      </button>
      {title && <span className="topbar-title">{title}</span>}
      <button
        type="button"
        className="home-button"
        onClick={() => navigate('/')}
        aria-label="Go to home page"
      >
        &#8962;
      </button>
    </div>
  );
}

// For backward compatibility with old imports
export const topBar = (navigate) => <TopBar navigate={navigate} />;