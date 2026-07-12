import React from 'react';

const LoadingSpinner = ({ text = 'Loading...', fullScreen = false }) => {
  const inner = (
    <div className="d-flex flex-column align-items-center gap-2">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <small className="text-muted">{text}</small>
    </div>
  );

  if (fullScreen)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        {inner}
      </div>
    );

  return <div className="d-flex justify-content-center py-5">{inner}</div>;
};

export default LoadingSpinner;
