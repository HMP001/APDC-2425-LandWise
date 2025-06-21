import './TopBar.css';

export const topBar = (navigate) => {
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
      <button
        type="button"
        className="home-button"
        onClick={() => navigate('/')}
        aria-label="Go to home page"
      >
        &#8962;
      </button>
    </div>
  )
};