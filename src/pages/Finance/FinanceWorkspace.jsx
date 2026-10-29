import { cloneElement, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isDemoMode } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import useFinanceData from '../../hooks/useFinanceData';
import { openRegisterShift, closeRegisterShift, recordFinanceExpense, voidFinanceExpense, recordCashMovement, closeBusinessDay, FINANCE_WRITERS } from '../../services/financeCloud';
import { businessDate, datePreset, expectedShiftCash, buildFinanceReport, inDateRange, formatBusinessTime } from '../../utils/finance';
import { formatCurrency } from '../../utils/formatters';
import { printDayClose } from '../../utils/financePrint';
import LoadingButton from '../../components/LoadingButton';
import { FinanceState, Metrics, FinanceModal, DateFilters, FinanceTable, CsvButton } from '../../components/Finance/FinanceUI';

const titles = {
  expenses: ['Operating expenses', 'Record overhead payments such as packaging, utilities, and rent.'],
  cash: ['Cash drawer & reconciliation', 'Cash receipts, supplier payments, expenses, and register transfers.'],
  shifts: ['Register shifts & handover', 'Enter the opening float, record collections, then count the drawer before handover.'],
  close: ['Day close', 'Save a dated summary after every register shift has been reconciled.'],
};
const paymentLabel = (method) => ({ cash: 'Cash drawer', upi: 'UPI', bank: 'Bank' })[method] || method;
function Field({ label, children }) {
  const id = useId();
  return <div className="finance-field"><label className="label" htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>;
}

export default function FinanceWorkspace({ view }) {
  const data = useFinanceData();
  const { user, role } = useAuth();
  const canWrite = FINANCE_WRITERS.includes(role) && !isDemoMode;
  const [range, setRange] = useState(() => datePreset('month'));
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const active = data.shifts.find((shift) => shift.id === data.register?.activeShiftId);
  const activeDate = data.register?.businessDate;
  const todayClosed = data.register?.lastClosedDate >= businessDate();
  const date = selectedDate || activeDate || businessDate();
  const closed = data.closes.find((entry) => entry.id === date && entry.schemaVersion === 2);
  const report = buildFinanceReport(data, date, date);
  const expenses = data.expenses.filter((expense) => inDateRange(expense.businessDate || businessDate(expense.date), range.from, range.to)
    && `${expense.title} ${expense.category}`.toLowerCase().includes(search.toLowerCase()));
  const shifts = data.shifts.filter((shift) => shift.schemaVersion === 2 && inDateRange(shift.businessDate, range.from, range.to))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const cash = data.entries.filter((entry) => entry.method === 'cash' && inDateRange(entry.businessDate, range.from, range.to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function open(type, target) {
    setDialog({ type, target });
    setForm(type === 'shift' ? { id: `SHF-${crypto.randomUUID()}`, shiftName: 'Main register', businessDate: activeDate || businessDate(), openingCash: '' }
      : type === 'expense' ? { id: `EXP-${crypto.randomUUID()}`, title: '', category: 'Packaging', amount: '', method: 'cash', reference: '' }
        : type === 'cash' ? { id: `CASH-${crypto.randomUUID()}`, direction: 'in', amount: '', reason: '' }
          : type === 'closeShift' ? { id: target.id, actualCash: '', note: '' } : { reason: '' });
  }
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (dialog.type === 'shift') await openRegisterShift(form, undefined, user);
      if (dialog.type === 'expense') await recordFinanceExpense(form, undefined, user);
      if (dialog.type === 'cash') await recordCashMovement(form, undefined, user);
      if (dialog.type === 'closeShift') await closeRegisterShift(form, undefined, user);
      if (dialog.type === 'void') await voidFinanceExpense(dialog.target.id, form.reason, undefined, user);
      setDialog(null); toast.success('Finance record saved.');
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }
  async function finalize() {
    if (busy) return;
    setBusy(true);
    try { await closeBusinessDay({ date, acknowledgeUnpaid: acknowledge }, undefined, user); toast.success('Business day closed.'); }
    catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }

  return <FinanceState data={data}><div className="finance-page">
    <div className="finance-heading"><div><h2>{titles[view][0]}</h2><p>{titles[view][1]}</p></div><div className="finance-actions">
      {view === 'shifts' && <button className="btn btn-primary" disabled={!canWrite || Boolean(active) || todayClosed} onClick={() => open('shift')}>Open register shift</button>}
      {view === 'expenses' && <button className="btn btn-primary" disabled={!canWrite || !active} title={!active ? 'Open a register shift first' : ''} onClick={() => open('expense')}>Record expense</button>}
      {view === 'cash' && <button className="btn btn-primary" disabled={!canWrite || !active} onClick={() => open('cash')}>Record cash in / out</button>}
    </div></div>
    {isDemoMode && <p className="finance-note">Finance preview. Use the development Firebase project to record and verify transactions.</p>}
    {!active && view !== 'close' && <p className="finance-note">{todayClosed ? 'Today’s business day is closed. The next register shift can be opened on the next business date.' : <>No register shift is open. <Link to="/finance/shifts">Open a shift</Link> before recording bills, payments, expenses, or cash movements.</>}</p>}
    {view === 'shifts' && <>
      {active && <section className="card finance-register"><div className="finance-heading"><div><span className="badge badge-success">Open · {active.businessDate}</span><h3>{active.shiftName}</h3><p>Opened by {active.createdBy} · {formatBusinessTime(active.openedAt)} IST</p></div><button className="btn btn-primary" disabled={!canWrite} onClick={() => open('closeShift', active)}>Count cash & close shift</button></div>
        <Metrics items={[["Opening cash", formatCurrency(active.openingCash)], ['Cash collected', formatCurrency(active.cashSales)], ['UPI collected', formatCurrency(active.upiSales)], ['Expected drawer', formatCurrency(expectedShiftCash(active))]]} /></section>}
      <DateFilters range={range} setRange={setRange} />
      <FinanceTable rows={shifts} empty="No register shifts for this period" columns={[
        { key: 'shiftName', label: 'Shift' }, { key: 'businessDate', label: 'Business date' }, { key: 'createdBy', label: 'Opened by' },
        { key: 'openingCash', label: 'Opening', render: (row) => formatCurrency(row.openingCash) },
        { key: 'expectedCash', label: 'Expected', render: (row) => formatCurrency(row.status === 'open' ? expectedShiftCash(row) : row.expectedCash) },
        { key: 'actualCash', label: 'Counted', render: (row) => row.status === 'closed' ? formatCurrency(row.actualCash) : 'Awaiting count' },
        { key: 'variance', label: 'Difference', render: (row) => row.status === 'closed' ? <span className={row.variance ? 'finance-negative' : 'finance-positive'}>{formatCurrency(row.variance)}</span> : '—' },
        { key: 'status', label: 'Status' }, { key: 'note', label: 'Handover note' },
      ]} />
    </>}
    {view === 'expenses' && <>
      <p className="finance-note">Record ingredient and utensil purchases in Purchasing → Purchase Bills. Enter each expense once; its cash movement is recorded automatically. Reversals retain the original record and are available during the active shift.</p>
      <Metrics items={[["Posted expenses in view", formatCurrency(expenses.filter((expense) => expense.status !== 'void').reduce((sum, expense) => sum + Number(expense.amount), 0))], ['Records', expenses.length]]} />
      <DateFilters range={range} setRange={setRange}><input className="input" aria-label="Search expenses" placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} /><CsvButton name="expenses.csv" rows={[["Date", "Description", "Category", "Method", "Amount", "Status"], ...expenses.map((entry) => [entry.businessDate || entry.date, entry.title, entry.category, entry.method || entry.paymentMode, entry.amount, entry.status || 'posted'])]} /></DateFilters>
      <FinanceTable rows={expenses} columns={[
        { key: 'date', label: 'Date', render: (row) => row.businessDate || row.date }, { key: 'title', label: 'Description' }, { key: 'category', label: 'Category' },
        { key: 'method', label: 'Paid through', render: (row) => paymentLabel(row.method || row.paymentMode) },
        { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) }, { key: 'createdBy', label: 'Recorded by', render: (row) => row.createdBy || row.recordedBy || 'Legacy record' },
        { key: 'status', label: 'Status', render: (row) => row.status === 'void' ? `Reversed: ${row.voidReason}` : 'Posted' },
        { key: 'action', label: 'Action', render: (row) => canWrite && row.shiftId === active?.id && row.status === 'posted' ? <button className="btn btn-secondary btn-sm" onClick={() => open('void', row)}>Reverse</button> : '—' },
      ]} />
    </>}
    {view === 'cash' && <>
      <Metrics items={[["Opening cash", formatCurrency(active?.openingCash || 0)], ['Cash collected · active shift', formatCurrency(active?.cashSales || 0)], ['Cash expenses & suppliers', formatCurrency(Number(active?.cashExpenses || 0) + Number(active?.supplierCash || 0))], ['Expected drawer · active shift', active ? formatCurrency(expectedShiftCash(active)) : 'No open shift']]} />
      <p className="finance-note">Expected cash = opening cash + paid cash bills + cash in − cash out − cash expenses − supplier cash payments. UPI and unpaid pickup bills do not enter the drawer. Cash in/out records transfers; use Expenses for operating costs.</p>
      <DateFilters range={range} setRange={setRange}><CsvButton name="cash-ledger.csv" rows={[["Date", "Time", "Type", "Direction", "Reason", "Amount", "Recorded by"], ...cash.map((entry) => [entry.businessDate, entry.createdAt, entry.kind, entry.direction, entry.reason, entry.amount, entry.createdBy])]} /></DateFilters>
      <FinanceTable rows={cash} columns={[
        { key: 'createdAt', label: 'Time · IST', render: (row) => formatBusinessTime(row.createdAt) }, { key: 'businessDate', label: 'Business date' }, { key: 'kind', label: 'Type' },
        { key: 'reason', label: 'Description' }, { key: 'createdBy', label: 'Recorded by' },
        { key: 'amount', label: 'Cash movement', render: (row) => <span className={row.direction === 'in' ? 'finance-positive' : 'finance-negative'}>{row.direction === 'in' ? '+' : '−'}{formatCurrency(row.amount)}</span> },
      ]} />
    </>}
    {view === 'close' && <>
      <div className="card finance-actions"><Field label="Business date"><input type="date" className="input" value={date} max={businessDate()} onChange={(event) => { setSelectedDate(event.target.value); setAcknowledge(false); }} /></Field>
        {closed ? <><span className="badge badge-success">Closed by {closed.createdBy}</span><button className="btn btn-secondary" onClick={() => { try { printDayClose(closed); } catch (error) { toast.error(error.message); } }}>Print saved close</button></> : <span className="badge badge-warning">{activeDate === date ? 'Awaiting day close' : 'No open business day on this date'}</span>}</div>
      <Metrics items={[["Billed sales", formatCurrency(closed?.grossSales ?? report.grossSales)], ['Collections', formatCurrency(closed?.collected ?? report.collected), 'Based on payment date'], ['Operating expenses', formatCurrency(closed?.expenses ?? report.expenseTotal)], ['Unpaid bills', formatCurrency(closed?.outstanding ?? report.outstanding)]]} />
      {(closed?.missingTax ?? report.missingTax) > 0 && <p className="finance-note">{closed?.missingTax ?? report.missingTax} historical bills lack a complete tax breakdown.</p>}
      {Boolean(closed?.legacyPayments) && <p className="finance-note">This close includes {closed.legacyPayments} older receipts outside the register ledger. They are included in collections and are not assigned to a new shift’s expected cash.</p>}
      {!closed && <div className="card finance-register"><p>Business dates use Rajkot time (Asia/Kolkata). Close each register shift before finalizing. A saved day close is retained as an audit snapshot; outstanding pickup payments can be collected in a later shift.</p>
        {active && activeDate === date && <p className="finance-note"><Link to="/finance/shifts">Count and close the active register shift first.</Link></p>}
        {report.outstanding > 0 && <label className="finance-checkbox"><input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} />I have reviewed the unpaid bills; they will carry forward for collection.</label>}
        <LoadingButton className="btn btn-primary" loading={busy} loadingText="Closing business day…" disabled={!canWrite || Boolean(active) || activeDate !== date || (report.outstanding > 0 && !acknowledge)} onClick={finalize}>Finalize business day</LoadingButton>
      </div>}
      <FinanceTable rows={closed?.shifts || data.shifts.filter((shift) => shift.businessDate === date && shift.schemaVersion === 2)} empty="No register shifts on this date" columns={[
        { key: 'shiftName', label: 'Shift' }, { key: 'openingCash', label: 'Opening', render: (row) => formatCurrency(row.openingCash) },
        { key: 'expectedCash', label: 'Expected', render: (row) => row.expectedCash == null ? 'Awaiting close' : formatCurrency(row.expectedCash) },
        { key: 'actualCash', label: 'Counted', render: (row) => row.actualCash == null ? 'Awaiting count' : formatCurrency(row.actualCash) },
        { key: 'variance', label: 'Difference', render: (row) => row.variance == null ? '—' : formatCurrency(row.variance) },
      ]} />
      <h3>Saved day closes</h3><FinanceTable rows={data.closes.filter((row) => row.schemaVersion === 2).sort((a, b) => b.businessDate.localeCompare(a.businessDate))} columns={[
        { key: 'businessDate', label: 'Date', render: (row) => <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(row.businessDate)}>{row.businessDate}</button> },
        { key: 'grossSales', label: 'Billed', render: (row) => formatCurrency(row.grossSales) }, { key: 'collected', label: 'Collected', render: (row) => formatCurrency(row.collected) },
        { key: 'variance', label: 'Cash difference', render: (row) => formatCurrency(row.variance) }, { key: 'createdBy', label: 'Closed by' },
      ]} />
    </>}
    {dialog && <FinanceModal title={{ shift: 'Open register shift', expense: 'Record operating expense', cash: 'Record cash transfer', closeShift: 'Count cash & close shift', void: 'Reverse expense' }[dialog.type]} busy={busy} onClose={() => setDialog(null)}>
      <form onSubmit={save}><fieldset disabled={busy} style={{ display: 'contents' }}>
        {dialog.type === 'shift' && <><Field label="Shift name"><input autoFocus required maxLength={100} className="input" value={form.shiftName} onChange={change('shiftName')} /></Field><Field label="Business date · Rajkot"><input required type="date" max={businessDate()} className="input" value={form.businessDate} onChange={change('businessDate')} /></Field><Field label="Opening cash actually in the drawer (₹)"><input required type="number" min="0" step="0.01" className="input" value={form.openingCash} onChange={change('openingCash')} /></Field></>}
        {dialog.type === 'expense' && <><Field label="Description"><input autoFocus required maxLength={200} className="input" value={form.title} onChange={change('title')} /></Field><Field label="Category"><select className="input" value={form.category} onChange={change('category')}>{['Packaging', 'Utilities', 'Rent', 'Maintenance', 'Transport', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Paid through"><select className="input" value={form.method} onChange={change('method')}>{['cash', 'upi', 'bank'].map((value) => <option key={value} value={value}>{paymentLabel(value)}</option>)}</select></Field><Field label="Receipt / reference (optional)"><input className="input" maxLength={100} value={form.reference} onChange={change('reference')} /></Field></>}
        {dialog.type === 'cash' && <><Field label="Direction"><select className="input" value={form.direction} onChange={change('direction')}><option value="in">Cash in / top-up</option><option value="out">Cash out / bank deposit / withdrawal</option></select></Field><Field label="Reason"><input autoFocus required maxLength={500} className="input" value={form.reason} onChange={change('reason')} /></Field></>}
        {['cash', 'expense'].includes(dialog.type) && <Field label="Amount (₹)"><input required type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={change('amount')} /></Field>}
        {dialog.type === 'closeShift' && <><p>Expected drawer: <strong>{formatCurrency(expectedShiftCash(active))}</strong></p><Field label="Physical cash counted (₹)"><input autoFocus required type="number" min="0" step="0.01" className="input" value={form.actualCash} onChange={change('actualCash')} /></Field><Field label="Handover note · required for a difference"><textarea maxLength={500} className="input" value={form.note} onChange={change('note')} /></Field><p>Closing retains the shift and its cash difference for review.</p></>}
        {dialog.type === 'void' && <><p>Reverse {formatCurrency(dialog.target.amount)} for {dialog.target.title} in the current shift.</p><Field label="Reason"><textarea autoFocus required maxLength={500} className="input" value={form.reason} onChange={change('reason')} /></Field></>}
      </fieldset><div className="finance-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><LoadingButton type="submit" className="btn btn-primary" loading={busy} loadingText="Saving…">{dialog.type === 'closeShift' ? 'Save count & close' : dialog.type === 'void' ? 'Reverse expense' : 'Save'}</LoadingButton></div></form>
    </FinanceModal>}
  </div></FinanceState>;
}
