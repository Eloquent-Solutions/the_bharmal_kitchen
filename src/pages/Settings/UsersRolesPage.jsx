/**
 * Users & Roles (RBAC) Management — Admin Panel
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD for system users, role assignment, and per-user tab visibility.
 * Admin can invite users via email, assign roles, and control which
 * sidebar tabs each user is allowed to see.
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  Send,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import {
  getUsers,
  saveUser,
  deleteUser,
} from '../../services/dataService';
import { NAVIGATION } from '../../constants/navigation';
import { ROLES } from '../../constants/roles';
import { isDemoMode } from '../../firebase/config';
import toast from 'react-hot-toast';

// All available tab IDs from the navigation
const ALL_TAB_IDS = NAVIGATION.map((n) => n.id);

const ROLE_OPTIONS = Object.values(ROLES);

const ROLE_DESCRIPTIONS = {
  Owner: 'Full access to all modules, financials, settings, staff, reports, and admin.',
  Admin: 'Full access to all modules, financials, settings, staff, reports, and admin.',
  Manager: 'Most modules except admin settings and user management.',
  Chef: 'KDS kitchen display, recipe BOM, raw materials, category edit. No revenue or prices.',
  Cashier: 'POS billing, orders CRUD, table management, day close. No profit or staff data.',
  Waiter: 'Dine-in ordering, table status, guest service. No financials.',
  Captain: 'Table service, floor management, delivery and captain assignments.',
  'Kitchen Staff': 'Kitchen display only, order status updates. No menu management.',
  'Inventory Manager': 'Inventory, raw materials, recipes, purchasing, stock.',
  Accountant: 'Reports, expenses, salary, financials, audit logs.',
  Staff: 'Dashboard only. Minimal access.',
  'Awaiting Role': 'Newly registered user awaiting admin role & tab assignment.',
};

export default function UsersRolesPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Cashier',
    status: 'active',
    allowedTabs: [...ALL_TAB_IDS], // All tabs by default
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Cashier');
  const [inviteTabs, setInviteTabs] = useState([...ALL_TAB_IDS]);

  useEffect(() => {
    refreshData();
    window.addEventListener('tbk_users_updated', refreshData);
    return () => window.removeEventListener('tbk_users_updated', refreshData);
  }, []);

  const refreshData = () => {
    setUsers(getUsers());
  };

  // Get default tabs for a role
  const getDefaultTabsForRole = (role) => {
    switch (role) {
      case 'Owner':
      case 'Admin':
      case 'Manager':
        return [...ALL_TAB_IDS];
      case 'Chef':
      case 'Kitchen Staff':
        return ['kitchen'];
      case 'Cashier':
        return ['dashboard', 'pos', 'orders', 'tables'];
      case 'Waiter':
        return ['dashboard', 'pos', 'orders', 'tables'];
      case 'Captain':
        return ['dashboard', 'tables', 'orders'];
      case 'Inventory Manager':
        return ['dashboard', 'inventory', 'purchasing'];
      case 'Accountant':
        return ['dashboard', 'finance', 'reports'];
      default:
        return ['dashboard'];
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'Cashier', status: 'active', allowedTabs: getDefaultTabsForRole('Cashier') });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active',
      allowedTabs: u.allowedTabs || [...ALL_TAB_IDS],
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (u) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const handleRoleChange = (newRole) => {
    setFormData({
      ...formData,
      role: newRole,
      allowedTabs: getDefaultTabsForRole(newRole),
    });
  };

  const handleInviteRoleChange = (newRole) => {
    setInviteRole(newRole);
    setInviteTabs(getDefaultTabsForRole(newRole));
  };

  const toggleTab = (tabId, isInvite = false) => {
    if (isInvite) {
      setInviteTabs((prev) =>
        prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        allowedTabs: prev.allowedTabs.includes(tabId)
          ? prev.allowedTabs.filter((t) => t !== tabId)
          : [...prev.allowedTabs, tabId],
      }));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    const isAwaiting = editingUser && (editingUser.status === 'awaiting_role' || editingUser.status === 'pending_approval' || editingUser.role === 'Awaiting Role');

    const payload = {
      ...(editingUser || {}),
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      status: isAwaiting ? 'active' : formData.status,
      allowedTabs: formData.allowedTabs,
      updatedAt: new Date().toISOString(),
    };

    const updated = saveUser(payload);
    setUsers(updated);
    setIsModalOpen(false);
    toast.success(
      isAwaiting
        ? `Role "${formData.role}" assigned & user activated!`
        : editingUser
        ? 'User profile updated!'
        : 'User created successfully!'
    );
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    const updated = deleteUser(userToDelete.id);
    setUsers(updated);
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    toast.success('User access revoked & removed');
  };

  const toggleStatus = (u) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    const updated = saveUser({ ...u, status: newStatus });
    setUsers(updated);
    toast.success(`User ${u.name} ${newStatus === 'active' ? 'reactivated' : 'suspended'}`);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    // Create a pending user record
    const newUser = {
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: 'pending_invite',
      allowedTabs: inviteTabs,
      invitedAt: new Date().toISOString(),
    };

    const updated = saveUser(newUser);
    setUsers(updated);
    setIsInviteModalOpen(false);
    setInviteEmail('');

    // In production, this would send an email via Cloud Functions
    toast.success(`📧 Invitation sent to ${inviteEmail}! When the user signs up with this email, they will automatically receive the "${inviteRole}" role.`);
  };

  const filtered = users.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const TabGrid = ({ selectedTabs, onToggle }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginTop: '4px' }}>
      {NAVIGATION.map((nav) => {
        const isSelected = selectedTabs.includes(nav.id);
        return (
          <button
            key={nav.id}
            type="button"
            onClick={() => onToggle(nav.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: 'var(--radius-md)',
              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
              background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-glass-subtle)',
              color: isSelected ? 'var(--color-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isSelected ? <Eye size={12} /> : <EyeOff size={12} />}
            {nav.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Users & Access Control</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            {isDemoMode
              ? 'Manage system users, assign roles, and control which tabs each user can see.'
              : 'Ask each staff member to sign in with Google first, then edit their account here to assign a role and tabs.'}
          </p>
        </div>
        {isDemoMode && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => setIsInviteModalOpen(true)}>
            <Mail size={16} /> Invite via Email
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add User
          </button>
        </div>}
      </div>

      {/* Roles Reference */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={16} style={{ color: 'var(--color-primary)' }} /> System Roles
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
            <div key={role} style={{ padding: '8px', background: 'var(--bg-glass-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '3px', color: 'var(--color-primary)' }}>{role}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Registrations Alert */}
      {users.filter((u) => u.status === 'awaiting_role' || u.status === 'pending_approval' || u.role === 'Awaiting Role').length > 0 && (
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-warning)', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div>
            <strong style={{ color: 'var(--color-warning)' }}>
              🔔 {users.filter((u) => u.status === 'awaiting_role' || u.status === 'pending_approval' || u.role === 'Awaiting Role').length} User(s) Awaiting Role Assignment
            </strong>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
              These users recently signed up. Click "Assign Role" in the table to select their role and visible tabs.
            </p>
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              const pending = users.find((u) => u.status === 'awaiting_role' || u.status === 'pending_approval' || u.role === 'Awaiting Role');
              if (pending) handleOpenEdit(pending);
            }}
          >
            Review & Assign
          </button>
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" className="input" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '36px', height: '38px' }} />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total: <strong>{filtered.length}</strong> users
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Visible Tabs</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isAwaiting = u.status === 'awaiting_role' || u.status === 'pending_approval' || u.role === 'Awaiting Role';
                const isInvited = u.status === 'pending_invite';

                return (
                  <tr key={u.id} style={{ backgroundColor: isAwaiting ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                    <td style={{ fontWeight: '700' }}>{u.name}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${isAwaiting ? 'badge-warning' : 'badge-info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '10px', color: 'var(--text-tertiary)', maxWidth: '200px' }}>
                      {(u.allowedTabs || ALL_TAB_IDS).length === ALL_TAB_IDS.length
                        ? 'All Tabs'
                        : (u.allowedTabs || []).map((t) => {
                            const nav = NAVIGATION.find((n) => n.id === t);
                            return nav?.label || t;
                          }).join(', ')}
                    </td>
                    <td>
                      {isAwaiting ? (
                        <span className="badge badge-warning" style={{ animation: 'pulse 2s infinite' }}>
                          ⏳ Awaiting Role
                        </span>
                      ) : isInvited ? (
                        <span className="badge badge-neutral">📧 Invited</span>
                      ) : (
                        <button
                          className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === 'active' ? '● Active' : '✕ Suspended'}
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        {isAwaiting && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                            onClick={() => handleOpenEdit(u)}
                          >
                            Assign Role
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => handleOpenEdit(u)} title="Edit"><Edit2 size={14} /></button>
                        <button className="btn-icon" onClick={() => handleOpenDelete(u)} title="Delete" style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
              {editingUser ? 'Edit User Profile' : 'Add System User'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input type="text" required className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" required className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Assigned Role</label>
                <select className="input" value={formData.role} onChange={(e) => handleRoleChange(e.target.value)}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {ROLE_DESCRIPTIONS[formData.role] || ''}
                </p>
              </div>

              <div>
                <label className="label">Visible Sidebar Tabs (Admin Controls)</label>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Select which tabs this user can see. Only highlighted tabs will be visible in their sidebar.
                </p>
                <TabGrid selectedTabs={formData.allowedTabs} onToggle={(id) => toggleTab(id)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite via Email Modal */}
      {isInviteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} style={{ color: 'var(--color-primary)' }} /> Invite User via Email
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Send an invitation. When the invited person signs up with this email, they will automatically receive the assigned role and tab visibility.
            </p>

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Email Address *</label>
                <input type="email" required className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="newstaff@gmail.com" />
              </div>

              <div>
                <label className="label">Assign Role</label>
                <select className="input" value={inviteRole} onChange={(e) => handleInviteRoleChange(e.target.value)}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Allowed Tabs for This User</label>
                <TabGrid selectedTabs={inviteTabs} onToggle={(id) => toggleTab(id, true)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsInviteModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Send size={14} /> Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>Revoke User Access</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Remove <strong>{userToDelete?.name}</strong> from the system permanently?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Revoke & Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
