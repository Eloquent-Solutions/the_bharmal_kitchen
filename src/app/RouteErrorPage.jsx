import { useRouteError } from 'react-router-dom';

export default function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : '';
  const isAssetError = /dynamically imported module|module script|mime type|chunkloaderror/i.test(message);

  return (
    <div className="loading-screen" role="alert">
      <h2>{isAssetError ? 'A new version is available' : 'This page could not be loaded'}</h2>
      <p>{isAssetError
        ? 'Reload the app to continue with the latest version.'
        : 'Please reload the app. If the problem continues, contact your administrator.'}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Reload App
      </button>
    </div>
  );
}
