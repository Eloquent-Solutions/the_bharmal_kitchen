/**
 * Customer Inquiries & Hotel Recruitment Inbox
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Admin view to review:
 *  - Job applications from chefs, kitchen staff & waiters
 *  - Bulk catering & Royal Thaal requests
 *  - Customer queries & order assistance
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  Briefcase,
  Phone,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import {
  getInboxMessages,
  deleteInboxMessage,
  updateInboxMessageStatus,
} from '../../services/dataService';
import { formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMessages(getInboxMessages());
  };

  const filtered = messages.filter((m) => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.message?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleToggleStatus = (msg) => {
    const next = msg.status === 'responded' ? 'unread' : 'responded';
    const updated = updateInboxMessageStatus(msg.id, next);
    setMessages(updated);
    toast.success(`Message marked as ${next.toUpperCase()}`);
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage((prev) => ({ ...prev, status: next }));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this message permanently?')) {
      const updated = deleteInboxMessage(id);
      setMessages(updated);
      if (selectedMessage?.id === id) setSelectedMessage(null);
      toast.success('Message deleted from inbox');
    }
  };

  const counts = {
    all: messages.length,
    joining: messages.filter((m) => m.type === 'joining').length,
    catering: messages.filter((m) => m.type === 'catering').length,
    general: messages.filter((m) => m.type === 'general' || m.type === 'order_issue').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Inquiries & Applications Inbox</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Review customer inquiries, catering bookings, and job applications submitted from the website.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `All Inquiries (${counts.all})` },
          { id: 'joining', label: `🧑‍🍳 Job Applications (${counts.joining})` },
          { id: 'catering', label: `✨ Bulk Catering (${counts.catering})` },
          { id: 'general', label: `💬 Customer Queries (${counts.general})` },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${filterType === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType(t.id)}
            style={{ fontSize: '12px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Grid: List & Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedMessage ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
        {/* Messages Table / List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Showing {filtered.length} messages
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                <Mail size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '13px' }}>No messages found in this category</p>
              </div>
            ) : (
              filtered.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isJob = msg.type === 'joining';
                const isCatering = msg.type === 'catering';

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(245, 158, 11, 0.08)'
                        : msg.status === 'unread'
                        ? 'rgba(255, 255, 255, 0.02)'
                        : 'transparent',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: msg.status === 'unread' ? '800' : '600', fontSize: '13px' }}>
                          {msg.name}
                        </span>
                        {isJob && <span className="badge badge-warning" style={{ fontSize: '9px' }}>Job Application</span>}
                        {isCatering && <span className="badge badge-info" style={{ fontSize: '9px' }}>Bulk Catering</span>}
                        {msg.status === 'unread' && <span className="badge badge-success" style={{ fontSize: '9px' }}>New</span>}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: msg.status === 'unread' ? '600' : 'normal' }}>
                        {msg.subject || 'Inquiry'}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '380px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.message}
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        📞 {msg.phone} {msg.email && `• ✉️ ${msg.email}`} • {formatDateTime(msg.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(msg.id)}
                        title="Delete"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Message Reader / Reply Panel */}
        {selectedMessage && (
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>{selectedMessage.name}</span>
                    <span className={`badge ${selectedMessage.status === 'responded' ? 'badge-neutral' : 'badge-success'}`}>
                      {selectedMessage.status === 'responded' ? 'Responded' : 'Needs Response'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Received on {formatDateTime(selectedMessage.createdAt)}
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedMessage(null)}
                >
                  Close
                </button>
              </div>

              {/* Contact Info Card */}
              <div style={{ background: 'var(--bg-glass-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Phone Number</div>
                  <a href={`tel:${selectedMessage.phone}`} style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    📞 {selectedMessage.phone}
                  </a>
                </div>
                {selectedMessage.email && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Email</div>
                    <a href={`mailto:${selectedMessage.email}`} style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      ✉️ {selectedMessage.email}
                    </a>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Category</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
                    {selectedMessage.type?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Message Subject & Body */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Subject</div>
                <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '2px' }}>
                  {selectedMessage.subject}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Message</div>
                <div style={{ fontSize: '13px', lineHeight: 1.6, padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleToggleStatus(selectedMessage)}
              >
                <CheckCircle2 size={14} /> Mark as {selectedMessage.status === 'responded' ? 'Unread' : 'Responded'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`tel:${selectedMessage.phone}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Phone size={14} /> Call Applicant
                </a>
                {selectedMessage.email && (
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Regarding your message at The Bharmals Kitchen`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Mail size={14} /> Send Email
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
