import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import EmptyState from '../EmptyState';
import { isFinanceEnabled } from '../../firebase/config';
import { datePreset, downloadFinanceCsv } from '../../utils/finance';
import './Finance.css';

export function FinanceState({ data, children }) {
  if (!isFinanceEnabled) return <div className="card"><h2>Finance review is not enabled</h2><p>Enable the finance release flag in the development environment to review these modules.</p></div>;
  if (data.loading) return <div className="finance-message"><div className="spinner" /><p>Loading The Bharmals Kitchen…</p></div>;
  if (data.error) return <div className="card"><h2>Finance data could not load</h2><p>{data.error}</p><button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button></div>;
  return children;
}

export function Metrics({ items }) {
  return <div className="finance-metrics">{items.map(([label, value, note]) => <div className="card" key={label}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>)}</div>;
}

export function FinanceModal({ title, busy, onClose, children }) {
  const container = useRef(null);
  const state = useRef({ busy, onClose });
  state.current = { busy, onClose };
  useEffect(() => {
    const previous = document.activeElement;
    container.current?.querySelector('input, select, textarea, button')?.focus();
    const key = (event) => {
      if (event.key === 'Escape' && !state.current.busy) state.current.onClose();
      if (event.key === 'Tab') {
        const elements = [...container.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onClick={() => { if (!busy) onClose(); }}><section ref={container} className="modal-content finance-modal" role="dialog" aria-modal="true" aria-labelledby="finance-modal-title" onClick={(event) => event.stopPropagation()}>
    <div className="finance-heading"><h3 id="finance-modal-title">{title}</h3><button type="button" className="btn-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={19} /></button></div>{children}
  </section></div>;
}

export function DateFilters({ range, setRange, children }) {
  return <div className="card finance-filters"><div className="finance-actions">{[['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month'], ['all', 'All time']].map(([key, label]) => <button key={key} className="btn btn-secondary btn-sm" onClick={() => setRange(datePreset(key))}>{label}</button>)}</div>
    <div className="finance-actions"><label className="label">From<input type="date" className="input" value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} /></label><label className="label">To<input type="date" className="input" value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} /></label>{children}</div></div>;
}

export function FinanceTable({ columns, rows, empty = 'No records for this period', caption }) {
  return <div className="card finance-table">{rows.length ? <div className="table-container"><table className="table">{caption && <caption className="sr-only">{caption}</caption>}<thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || row.date || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={empty} description="Records will appear here when transactions are recorded." />}</div>;
}

export function CsvButton({ name, rows, disabled }) {
  return <button className="btn btn-secondary" disabled={disabled || rows.length < 2} onClick={() => downloadFinanceCsv(name, rows)}>Export CSV</button>;
}
