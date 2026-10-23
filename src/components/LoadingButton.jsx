export default function LoadingButton({ loading = false, loadingText = 'Working…', children, disabled, ...props }) {
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading}>
      {loading ? (
        <span className="button-loading-content" role="status">
          <span className="button-loading-spinner" aria-hidden="true" />
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
