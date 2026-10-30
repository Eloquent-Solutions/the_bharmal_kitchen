import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useCloudDocument from '../../hooks/useCloudDocument';
import useCloudCollection from '../../hooks/useCloudCollection';
import CloudState from '../../components/CloudState';
import LoadingButton from '../../components/LoadingButton';
import { CsvButton, FinanceModal, FinanceTable } from '../../components/Finance/FinanceUI';
import { saveBranchCloud, saveSettingsCloud } from '../../services/settingsCloud';
import { formatBusinessTime } from '../../utils/finance';
import { NOTIFICATION_DEFAULTS, POS_DEFAULTS, RESTAURANT_DEFAULTS } from '../../utils/settings';

const config = {
  restaurant: { id: 'restaurant', title: 'Restaurant details', note: 'Contact details appear on the customer page and on new bills. Closing pickup requests stops new customer requests; existing orders remain available to staff.', defaults: RESTAURANT_DEFAULTS, fields: [['name', 'Business name'], ['address', 'Pickup and receipt address'], ['phone', 'Contact phone'], ['email', 'Contact email', 'email'], ['gstin', 'GSTIN'], ['fssai', 'FSSAI number'], ['googleMapUrl', 'Google Maps link', 'url']], switches: [['isOpen', 'Accept new customer pickup requests']] },
  tax: { id: 'restaurant', title: 'Tax and bill calculation', note: 'Applies to new bills only. Existing bill totals and receipts retain their saved tax breakdown.', defaults: RESTAURANT_DEFAULTS, fields: [['cgstRate', 'CGST (%)', 'number'], ['sgstRate', 'SGST (%)', 'number'], ['serviceCharge', 'Service charge (%)', 'number']], switches: [['roundOff', 'Round the final bill to the nearest rupee']] },
  pos: { id: 'pos', title: 'POS workflow', note: 'Automatic printing creates durable jobs for a paired Windows print station. Keep its browser tab and local bridge open to send them.', defaults: POS_DEFAULTS, fields: [], switches: [['autoPrintKOTOnOrder', 'Queue kitchen tickets when a bill is saved'], ['autoPrintReceipt', 'Queue a customer receipt when a bill is saved'], ['requireCustomerPhone', 'Require a customer phone number at POS checkout']] },
  notifications: { id: 'notifications', title: 'Notifications', note: 'Alerts work while a staff browser is open. Browser permission is granted separately on each computer.', defaults: NOTIFICATION_DEFAULTS, fields: [], switches: [['soundAlertOnNewOrder', 'Sound for incoming kitchen orders and pickup requests'], ['soundAlertOnKOTReady', 'Sound when an order becomes ready'], ['browserPushNotifications', 'Show browser notifications'], ['lowStockAlerts', 'Show low stock notifications']] },
};
export default function SettingsWorkspace({ screen = 'restaurant' }) {
  const info = config[screen];
  const state = useCloudDocument('settings', info.id);
  const [form, setForm] = useState(info.defaults);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (state.value) setForm({ ...info.defaults, ...state.value }); }, [state.value, info]);
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try {
      const keys = [...info.fields, ...info.switches].map(([key]) => key);
      if (screen === 'pos') keys.push('defaultPaymentMethod');
      await saveSettingsCloud(info.id, Object.fromEntries(keys.map((key) => [key, form[key]])));
      toast.success('Settings saved.');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  }
  return <div className="finance-page" style={{ maxWidth: 960 }}><header><h2>{info.title}</h2><p>{info.note}</p></header><CloudState state={state}>
    <form className="card settings-form" onSubmit={save}><div className="settings-grid">{info.fields.map(([key, label, type = 'text']) => <label className="finance-field" key={key}>{label}<input className="input" type={type} required={key === 'name' || type === 'number'} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined} step={type === 'number' ? '0.01' : undefined} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
      {info.switches.map(([key, label]) => <label className="finance-checkbox" key={key}><input type="checkbox" checked={form[key] === true} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>)}
      {screen === 'pos' && <label className="finance-field">Default payment method<select className="input" value={form.defaultPaymentMethod} onChange={(event) => setForm({ ...form, defaultPaymentMethod: event.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option></select></label>}
      {screen === 'notifications' && <button type="button" className="btn btn-secondary" onClick={async () => { if (!('Notification' in window)) return toast.error('Browser notifications are unavailable.'); const permission = await Notification.requestPermission(); toast(permission === 'granted' ? 'Notifications allowed on this computer.' : 'Notifications are not allowed on this computer.'); }}>Allow notifications on this computer</button>}
      <div><LoadingButton className="btn btn-primary" type="submit" loading={busy} loadingText="Saving…">Save settings</LoadingButton></div>
    </form></CloudState></div>;
}
export function AuditWorkspace() {
  const state = useCloudCollection('audit_logs', 'createdAt', 200);
  const [search, setSearch] = useState('');
  const rows = state.rows.filter((row) => `${row.action} ${row.actor} ${row.target}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="finance-page"><header><h2>Audit log</h2><p>Latest 200 saved settings, printing, and recipe changes. Records cannot be edited or cleared.</p></header><CloudState state={state}><div className="finance-actions"><input className="input" aria-label="Search audit log" placeholder="Search action, person, or record" value={search} onChange={(event) => setSearch(event.target.value)} /><CsvButton name="audit-log.csv" rows={[["Time", "Person", "Action", "Record"], ...rows.map((row) => [row.createdAt, row.actor, row.action, row.target])]} /></div><FinanceTable rows={rows} empty="No matching activity" emptyDescription="Saved settings, recipe acceptance, and print actions appear here." columns={[{ key: 'createdAt', label: 'Time', render: (row) => formatBusinessTime(row.createdAt) }, { key: 'actor', label: 'Person' }, { key: 'action', label: 'Action' }, { key: 'target', label: 'Record' }]} /></CloudState></div>;
}
export function BranchWorkspace() {
  const state = useCloudCollection('branches');
  const [form, setForm] = useState(null); const [busy, setBusy] = useState(false);
  return <div className="finance-page"><header className="finance-heading"><div><h2>Branch contacts</h2><p>Contact directory only. Inventory, billing, and cash register are shared. Pickup address is controlled in Restaurant details.</p></div><button className="btn btn-primary" onClick={() => setForm({ name: '', address: '', phone: '', active: true })}>Add branch contact</button></header><CloudState state={state}><FinanceTable rows={state.rows} empty="No branch contacts yet" emptyDescription="Add a branch contact to keep its address and phone in the directory." columns={[{ key: 'name', label: 'Branch' }, { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }, { key: 'active', label: 'Status', render: (row) => row.active === false ? 'Inactive' : 'Active' }, { key: 'edit', label: 'Actions', render: (row) => <button className="btn btn-secondary btn-sm" onClick={() => setForm(row)}>Edit</button> }]} /></CloudState>
    {form && <FinanceModal title="Branch contact" busy={busy} onClose={() => setForm(null)}><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await saveBranchCloud(form); setForm(null); toast.success('Branch contact saved.'); } catch (error) { toast.error(error.message); } finally { setBusy(false); } }}>{[['name', 'Name'], ['address', 'Address'], ['phone', 'Phone']].map(([key, label]) => <label className="finance-field" key={key}>{label}<input className="input" required={key !== 'phone'} value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}<label className="finance-checkbox"><input type="checkbox" checked={form.active !== false} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Active</label><LoadingButton className="btn btn-primary" loading={busy} type="submit">Save contact</LoadingButton></form></FinanceModal>}
  </div>;
}
