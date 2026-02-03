import './css/loader.css';

function Loader() {
  return (
    <div id="loader-wrapper">
      <div className="card">
        <div className="loader">
          <p>loading</p>
          <div className="words">
            <span className="word">PHOTOS</span>
            <span className="word">VIDEOS</span>
            <span className="word">ZIP</span>
            <span className="word">PDF</span>
            <span className="word">PNG</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loader;
