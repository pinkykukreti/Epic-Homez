export function Notice({ children, error = false }) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function LoadState({ state, children }) {
  if (state.loading) return <Notice>Loading…</Notice>;
  if (state.error)
    return (
      <Notice error>
        {state.error} <button onClick={state.reload}>Try again</button>
      </Notice>
    );
  return children;
}
export function Pagination({ page, count, size = 12, onChange }) {
  const pages = Math.ceil(count / size);
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Empty({ title = "A little space for what’s next.", children }) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        ✧
      </span>
      <h3>{title}</h3>
      <p>
        {children ||
          "Our collection will appear here as products are published. Explore another category or get in touch."}
      </p>
    </div>
  );
}
export function ProductImage({ src, alt = "", ...props }) {
  return (
    <img
      src={src || "/fallback.svg"}
      alt={alt}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/fallback.svg";
      }}
      {...props}
    />
  );
}
