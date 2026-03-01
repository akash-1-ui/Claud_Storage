function Uploadloader({ progress = 0, status = "Uploading..." }) {
  const normalizedProgress = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 100)
    : 0;

  return (
    <div className="uploadloader" role="status" aria-live="polite">
      <div className="uploadloader-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="uploadloader-status">{status || "Uploading..."}</p>
      <p className="uploadloader-progress">
        {normalizedProgress > 0 ? `${normalizedProgress}% complete` : "Starting upload..."}
      </p>
    </div>
  );
}

export default Uploadloader;
