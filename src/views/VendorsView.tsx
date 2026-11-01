import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Vendor, VendorStatus } from '../types';
import { VENDOR_STATUSES } from '../types';
import {
  VENDOR_CATEGORIES,
  VENDOR_STATUS_LABELS,
  vendorCategory,
} from '../domain/catalog';
import {
  computeVendorStats,
  missingEssentialVendors,
  vendorCategoryLabel,
} from '../domain/vendors';
import { formatMoney } from '../domain/money';
import { relativeDayLabel, todayIso } from '../domain/dates';
import { useApp } from '../state/AppContext';
import { Badge, EmptyState, ProgressBar, ViewHeader } from '../components/ui';
import { Modal } from '../components/Modal';
import { VendorEmailModal } from '../components/VendorEmailModal';

const STATUS_TONE = {
  researching: 'neutral',
  contacted: 'gold',
  quoted: 'accent',
  booked: 'sage',
  declined: 'danger',
} as const;

const STATUS_ORDER: VendorStatus[] = ['booked', 'quoted', 'contacted', 'researching', 'declined'];

export function VendorsView() {
  const { event, dispatch, toast } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VendorStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editor, setEditor] = useState<{
    open: boolean;
    vendor: Vendor | null;
    category?: string;
  }>({ open: false, vendor: null });
  const [emailVendor, setEmailVendor] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const stats = useMemo(() => computeVendorStats(event), [event]);
  const missingEssential = useMemo(() => missingEssentialVendors(stats), [stats]);
  const currency = event.basics.currency;

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return event.vendors
      .filter((vendor) => {
        if (statusFilter !== 'all' && vendor.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && vendor.category !== categoryFilter) return false;
        if (!text) return true;
        return `${vendor.name} ${vendor.contactName} ${vendor.email} ${vendor.notes} ${vendorCategoryLabel(event.type, vendor.category)}`
          .toLowerCase()
          .includes(text);
      })
      .slice()
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          a.name.localeCompare(b.name),
      );
  }, [categoryFilter, event.type, event.vendors, query, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: event.vendors.length };
    for (const status of VENDOR_STATUSES) {
      counts[status] = event.vendors.filter((vendor) => vendor.status === status).length;
    }
    return counts;
  }, [event.vendors]);

  return (
    <div className="view vendors-view">
      <ViewHeader
        eyebrow="The team behind the day"
        title="Vendors"
        description="Track who you have contacted, compare what is included, and keep the questions that surface the real cost next to every booking."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditor({ open: true, vendor: null })}
          >
            <Plus size={16} aria-hidden="true" /> Add vendor
          </button>
        }
      />

      <section className="vendor-hero" aria-labelledby="vendor-readiness-title">
        <div className="vendor-hero-copy">
          <p className="eyebrow">Readiness</p>
          <h2 id="vendor-readiness-title">
            {stats.essentialBooked} of {stats.essentialTotal} essentials booked
          </h2>
          <p>
            {missingEssential.length === 0
              ? 'The essential team is in place. Now protect the details: contracts, backups, and the final run-of-show.'
              : `${missingEssential.length} essential ${
                  missingEssential.length === 1 ? 'category is' : 'categories are'
                } still open. ${missingEssential.map((category) => category.label).join(', ')}.`}
          </p>
          <ProgressBar
            value={
              stats.essentialTotal > 0
                ? (stats.essentialBooked / stats.essentialTotal) * 100
                : 0
            }
            label="Essential vendor categories booked"
            tone={missingEssential.length > 1 ? 'gold' : 'sage'}
          />
        </div>
        <div className="vendor-hero-stats">
          <div>
            <Store size={17} aria-hidden="true" />
            <span>Booked</span>
            <strong>{stats.booked}</strong>
          </div>
          <div>
            <ClipboardList size={17} aria-hidden="true" />
            <span>Quotes in</span>
            <strong>{stats.quoted}</strong>
          </div>
          <div>
            <Wallet size={17} aria-hidden="true" />
            <span>Quote value</span>
            <strong>{formatMoney(stats.quotedValue, currency)}</strong>
          </div>
        </div>
      </section>

      <section className="panel category-readiness-panel" aria-labelledby="category-readiness-title">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Coverage map</p>
            <h2 id="category-readiness-title">Vendor categories</h2>
          </div>
          <span className="muted">Choose a category to add the right checklist.</span>
        </div>
        <div className="category-readiness-grid">
          {stats.categories.map((category) => {
            const def = vendorCategory(event.type, category.id);
            return (
              <div
                key={category.id}
                className={`readiness-card${category.booked ? ' is-booked' : ''}${
                  category.essential ? ' is-essential' : ''
                }`}
              >
                <div className="readiness-card-top">
                  <span className={`status-dot ${category.booked ? 'is-booked' : 'is-open'}`} aria-hidden="true" />
                  <span className="readiness-name">{category.label}</span>
                  {category.essential && <Badge tone="neutral">Essential</Badge>}
                </div>
                <p>
                  {category.booked
                    ? `${category.vendorCount} vendor${category.vendorCount === 1 ? '' : 's'} · booked`
                    : category.vendorCount > 0
                      ? `${category.vendorCount} in progress`
                      : 'Not started'}
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setEditor({ open: true, vendor: null, category: category.id })
                  }
                >
                  Add {def ? def.label.toLowerCase() : 'vendor'} <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel vendor-list-panel" aria-labelledby="vendor-list-title">
        <div className="panel-head vendor-list-head">
          <div>
            <p className="eyebrow">Your shortlist</p>
            <h2 id="vendor-list-title">
              {filtered.length === event.vendors.length
                ? `${event.vendors.length} vendors`
                : `${filtered.length} of ${event.vendors.length} vendors`}
            </h2>
          </div>
          <div className="vendor-toolbar">
            <div className="search-field">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="vendor-search" className="sr-only">
                Search vendors
              </label>
              <input
                id="vendor-search"
                type="search"
                className="input-control"
                placeholder="Search vendors, contacts, notes…"
                value={query}
                onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              />
            </div>
            <label htmlFor="vendor-category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="vendor-category-filter"
              className="select-control select-compact"
              value={categoryFilter}
              onChange={(changeEvent) => setCategoryFilter(changeEvent.target.value)}
            >
              <option value="all">All categories</option>
              {VENDOR_CATEGORIES[event.type].map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pipeline-tabs" role="group" aria-label="Filter vendors by status">
          <button
            type="button"
            className={`pipeline-tab${statusFilter === 'all' ? ' is-active' : ''}`}
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            All <span>{filterCounts.all}</span>
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              className={`pipeline-tab${statusFilter === status ? ' is-active' : ''}`}
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {VENDOR_STATUS_LABELS[status]} <span>{filterCounts[status]}</span>
            </button>
          ))}
        </div>

        {event.vendors.length === 0 ? (
          <EmptyState
            icon={<Store size={28} />}
            title="No vendors yet"
            description="Start with the essentials for this event. Each vendor gets a checklist of the questions that reveal the full cost, access, and cancellation terms."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditor({ open: true, vendor: null })}
              >
                <Plus size={16} aria-hidden="true" /> Add the first vendor
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={26} />}
            title="No vendors match those filters"
            description="Try another status, category, or search term."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="vendor-grid">
            {filtered.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                eventType={event.type}
                currency={currency}
                expanded={Boolean(expanded[vendor.id])}
                onToggleExpanded={() =>
                  setExpanded((current) => ({ ...current, [vendor.id]: !current[vendor.id] }))
                }
                onToggleCheck={(checkId) =>
                  dispatch({ type: 'TOGGLE_VENDOR_CHECK', vendorId: vendor.id, checkId })
                }
                onEdit={() => setEditor({ open: true, vendor })}
                onEmail={() => setEmailVendor(vendor)}
                onDelete={() => setDeleteTarget(vendor)}
              />
            ))}
          </div>
        )}
      </section>

      {missingEssential.length > 0 && (
        <section className="panel open-essentials-panel" aria-labelledby="open-essentials-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Still to secure</p>
              <h2 id="open-essentials-title">Before the essentials disappear</h2>
            </div>
            <ShieldAlert size={20} aria-hidden="true" />
          </div>
          <div className="open-essentials">
            {missingEssential.map((category) => (
              <div key={category.id} className="open-essential">
                <strong>{category.label}</strong>
                <p>
                  {category.vendorCount > 0
                    ? `${category.vendorCount} option${category.vendorCount === 1 ? '' : 's'} in progress — set a follow-up date.`
                    : 'No options recorded yet. Ask for availability, inclusions, and the full out-the-door price.'}
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditor({ open: true, vendor: null, category: category.id })}
                >
                  Add an option <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <VendorModal
        open={editor.open}
        vendor={editor.vendor}
        defaultCategory={editor.category}
        eventType={event.type}
        onClose={() => setEditor({ open: false, vendor: null })}
        onSave={(payload, existing) => {
          if (existing) {
            dispatch({ type: 'UPDATE_VENDOR', id: existing.id, patch: payload });
            toast('Vendor updated.', 'success');
          } else {
            dispatch({ type: 'ADD_VENDOR', vendor: payload });
            toast('Vendor added with a category checklist.', 'success');
          }
          setEditor({ open: false, vendor: null });
        }}
      />

      <VendorEmailModal
        open={Boolean(emailVendor)}
        vendor={emailVendor}
        onClose={() => setEmailVendor(null)}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Remove ${deleteTarget.name}?` : 'Remove vendor?'}
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Keep vendor
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!deleteTarget) return;
                dispatch({ type: 'DELETE_VENDOR', id: deleteTarget.id });
                toast('Vendor removed.', 'info');
                setDeleteTarget(null);
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Remove vendor
            </button>
          </>
        }
      >
        <p>
          This removes the vendor, their quote, and their checklist from this plan. Contracts and
          emails already sent are unaffected.
        </p>
      </Modal>
    </div>
  );
}

function VendorCard({
  vendor,
  eventType,
  currency,
  expanded,
  onToggleExpanded,
  onToggleCheck,
  onEdit,
  onEmail,
  onDelete,
}: {
  vendor: Vendor;
  eventType: ReturnType<typeof useApp>['event']['type'];
  currency: ReturnType<typeof useApp>['event']['basics']['currency'];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCheck: (checkId: string) => void;
  onEdit: () => void;
  onEmail: () => void;
  onDelete: () => void;
}) {
  const done = vendor.checklist.filter((item) => item.done).length;
  const total = vendor.checklist.length;
  const overdue =
    Boolean(vendor.followUp) &&
    vendor.followUp < todayIso() &&
    vendor.status !== 'booked' &&
    vendor.status !== 'declined';
  const visibleChecks = expanded ? vendor.checklist : vendor.checklist.slice(0, 3);
  const category = vendorCategory(eventType, vendor.category);

  return (
    <article className="vendor-card">
      <div className="vendor-card-top">
        <span className="vendor-category-mark">
          {category?.label ?? 'Vendor'}
          {category?.essential && <span className="vendor-essential-dot" title="Essential category" />}
        </span>
        <Badge tone={STATUS_TONE[vendor.status]}>{VENDOR_STATUS_LABELS[vendor.status]}</Badge>
      </div>
      <h3>{vendor.name}</h3>
      <div className="vendor-contact">
        {vendor.contactName && <span>{vendor.contactName}</span>}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`}>
            <Mail size={13} aria-hidden="true" /> {vendor.email}
          </a>
        )}
        {vendor.phone && (
          <a href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`}>
            <Phone size={13} aria-hidden="true" /> {vendor.phone}
          </a>
        )}
      </div>

      <div className="vendor-card-facts">
        <div>
          <span>Quote</span>
          <strong>{vendor.quote !== null ? formatMoney(vendor.quote, currency) : 'Not yet'}</strong>
        </div>
        <div>
          <span>Follow up</span>
          <strong className={overdue ? 'is-danger' : ''}>
            {vendor.followUp ? relativeDayLabel(vendor.followUp) : 'Not set'}
          </strong>
        </div>
      </div>

      {vendor.notes && <p className="vendor-notes">{vendor.notes}</p>}

      <div className="vendor-checklist">
        <button
          type="button"
          className="vendor-checklist-head"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span>
            <ClipboardList size={15} aria-hidden="true" /> Questions to ask
          </span>
          <span>
            {done}/{total} checked
          </span>
        </button>
        <ProgressBar
          value={total > 0 ? (done / total) * 100 : 0}
          label={`${vendor.name} checklist completion`}
          tone={done === total && total > 0 ? 'sage' : 'gold'}
          showValue={false}
        />
        {visibleChecks.length > 0 ? (
          <ul className="vendor-check-list">
            {visibleChecks.map((item) => (
              <li key={item.id}>
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleCheck(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="category-empty">No checklist questions for this category.</p>
        )}
        {total > 3 && (
          <button type="button" className="text-button vendor-check-more" onClick={onToggleExpanded}>
            {expanded ? 'Show fewer questions' : `Show all ${total} questions`}
          </button>
        )}
      </div>

      <div className="vendor-card-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={onEmail}>
          <Mail size={14} aria-hidden="true" /> Draft email
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="icon-button icon-button-small danger-text"
          onClick={onDelete}
          aria-label={`Remove ${vendor.name}`}
          title={`Remove ${vendor.name}`}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
      {vendor.followUp && (
        <p className={`vendor-follow-up${overdue ? ' is-danger' : ''}`}>
          <CalendarClock size={14} aria-hidden="true" />
          {overdue
            ? `Follow-up is overdue — ${relativeDayLabel(vendor.followUp)}`
            : `Follow up ${relativeDayLabel(vendor.followUp).toLowerCase()}`}
        </p>
      )}
    </article>
  );
}

type VendorPayload = {
  name: string;
  category: string;
  status: VendorStatus;
  quote: number | null;
  contactName: string;
  email: string;
  phone: string;
  followUp: string;
  notes: string;
};

function VendorModal({
  open,
  vendor,
  defaultCategory,
  eventType,
  onClose,
  onSave,
}: {
  open: boolean;
  vendor: Vendor | null;
  defaultCategory?: string;
  eventType: ReturnType<typeof useApp>['event']['type'];
  onClose: () => void;
  onSave: (payload: VendorPayload, existing: Vendor | null) => void;
}) {
  const categories = VENDOR_CATEGORIES[eventType];
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? categories[0].id);
  const [status, setStatus] = useState<VendorStatus>('researching');
  const [quote, setQuote] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const existing = vendor && vendor.id ? vendor : null;

  useEffect(() => {
    if (!open) return;
    setName(vendor?.name ?? '');
    setCategory(vendor?.category ?? defaultCategory ?? categories[0].id);
    setStatus(vendor?.status ?? 'researching');
    setQuote(vendor?.quote !== null && vendor?.quote !== undefined ? String(vendor.quote) : '');
    setContactName(vendor?.contactName ?? '');
    setEmail(vendor?.email ?? '');
    setPhone(vendor?.phone ?? '');
    setFollowUp(vendor?.followUp ?? '');
    setNotes(vendor?.notes ?? '');
    setError('');
  }, [open, vendor, defaultCategory, categories]);

  function save() {
    if (!name.trim()) {
      setError('Add the vendor or business name.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That email address does not look right. Leave it blank if you do not have one.');
      return;
    }
    const parsedQuote = quote.trim() === '' ? null : Number(quote);
    if (parsedQuote !== null && (!Number.isFinite(parsedQuote) || parsedQuote < 0)) {
      setError('Use a valid quote amount, or leave it blank.');
      return;
    }
    onSave(
      {
        name: name.trim(),
        category,
        status,
        quote: parsedQuote === null ? null : Math.round(parsedQuote),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        followUp,
        notes: notes.trim(),
      },
      existing,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit vendor' : 'Add a vendor'}
      description={
        existing
          ? 'Changing the category does not replace this vendor’s existing questions.'
          : 'New vendors get the standard questions for their category, so the first email covers the important ground.'
      }
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="vendor-form" className="btn btn-primary">
            {existing ? 'Save vendor' : 'Add vendor'}
          </button>
        </>
      }
    >
      <form
        id="vendor-form"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          save();
        }}
      >
        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="vendor-name" className="field-label">
              Business or vendor name <span className="required-mark">*</span>
            </label>
            <input
              id="vendor-name"
              className="input-control"
              value={name}
              maxLength={100}
              placeholder="e.g. Stone Barn at Willow Creek"
              onChange={(changeEvent) => setName(changeEvent.target.value)}
              data-autofocus
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-category" className="field-label">
              Category
            </label>
            <select
              id="vendor-category"
              className="select-control"
              value={category}
              onChange={(changeEvent) => setCategory(changeEvent.target.value)}
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.essential ? ' · essential' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="vendor-status" className="field-label">
              Status
            </label>
            <select
              id="vendor-status"
              className="select-control"
              value={status}
              onChange={(changeEvent) => setStatus(changeEvent.target.value as VendorStatus)}
            >
              {VENDOR_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {VENDOR_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="vendor-contact" className="field-label">
              Contact name
            </label>
            <input
              id="vendor-contact"
              className="input-control"
              value={contactName}
              maxLength={80}
              placeholder="Who are you speaking with?"
              onChange={(changeEvent) => setContactName(changeEvent.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-email" className="field-label">
              Email
            </label>
            <input
              id="vendor-email"
              type="email"
              className="input-control"
              value={email}
              maxLength={120}
              placeholder="Optional"
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-phone" className="field-label">
              Phone
            </label>
            <input
              id="vendor-phone"
              type="tel"
              className="input-control"
              value={phone}
              maxLength={40}
              placeholder="Optional"
              onChange={(changeEvent) => setPhone(changeEvent.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-quote" className="field-label">
              Quote
            </label>
            <input
              id="vendor-quote"
              type="number"
              min={0}
              step={1}
              className="input-control"
              value={quote}
              placeholder="Leave blank until quoted"
              onChange={(changeEvent) => setQuote(changeEvent.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-follow-up" className="field-label">
              Follow-up date
            </label>
            <input
              id="vendor-follow-up"
              type="date"
              className="input-control"
              value={followUp}
              onChange={(changeEvent) => setFollowUp(changeEvent.target.value)}
            />
          </div>
          <div className="field field-wide">
            <label htmlFor="vendor-notes" className="field-label">
              Notes
            </label>
            <textarea
              id="vendor-notes"
              className="textarea-control"
              rows={3}
              maxLength={500}
              value={notes}
              placeholder="What is included, what to confirm, who recommended them…"
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            />
          </div>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
