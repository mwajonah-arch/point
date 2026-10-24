import React, { useState, useEffect, useRef, useCallback, useMemo } from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, LogOut, Package, TrendingUp,
  AlertTriangle, Users, Settings as SettingsIcon, Receipt, CheckCircle, X,
  Pill, Edit2, ChevronRight, Banknote, CreditCard, Smartphone, LayoutDashboard,
  ClipboardList, Info, Printer, MessageCircle, Camera, MoreHorizontal, Check, ArrowRight, Clock, Lock
} from 'https://esm.sh/lucide-react@0.383.0?deps=react@18';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------------------------------------------------------------------- */
/* Supabase connection                                                    */
/* ---------------------------------------------------------------------- */
/* URL and anon key come from config.js, loaded before this file. */

const configCheck = (() => {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    return { ready: false, reason: 'config.js is missing SUPABASE_URL or SUPABASE_ANON_KEY.' };
  }
  if (window.SUPABASE_URL.includes('YOUR_') || window.SUPABASE_ANON_KEY.includes('YOUR_')) {
    return { ready: false, reason: 'config.js still has the placeholder text — paste your real Project URL and anon key.' };
  }
  try {
    // eslint-disable-next-line no-new
    new URL(window.SUPABASE_URL);
  } catch (e) {
    return { ready: false, reason: `SUPABASE_URL isn't a valid web address: "${window.SUPABASE_URL}". It should look like https://abcdefgh.supabase.co (with https:// at the front, no extra spaces or quotes).` };
  }
  return { ready: true, reason: '' };
})();
const configReady = configCheck.ready;

// A valid-looking placeholder URL so createClient doesn't throw before we can
// show the "finish setup" screen further down.
const supabase = createClient(
  configReady ? window.SUPABASE_URL : 'https://placeholder.supabase.co',
  configReady ? window.SUPABASE_ANON_KEY : 'placeholder'
);

// supabase-js's functions.invoke() drops the actual JSON body an edge
// function sends back whenever the response status isn't 2xx — you get a
// generic "Edge Function returned a non-2xx status code" instead of e.g.
// "Incorrect PIN for this login type." This unwraps the real message from
// the response so the UI can show what the server actually said.
async function invokeFn(name, options) {
  const { data, error } = await supabase.functions.invoke(name, options);
  if (error) {
    let message = error.message || 'Something went wrong. Please try again.';
    let body = null;
    try {
      body = await error.context.json();
      if (body && body.error) message = body.error;
    } catch (e) {
      // Response wasn't JSON (e.g. a network failure) — keep the generic message.
    }
    // A response that couldn't be parsed as JSON at all (error.context has
    // no usable body) means the request never really reached the function
    // — a genuine connectivity failure, worth retrying later. A response
    // that DID parse as JSON is the function deliberately rejecting the
    // request (bad PIN, out of stock, expired session) — retrying that
    // later would just fail the same way again, so callers that need to
    // decide "queue for retry" vs "this is a real rejection" can check
    // `network` here instead of guessing from the message text.
    return { data: null, error: { message, network: !body }, body };
  }
  return { data, error: null };
}

// Which backend collects M-Pesa payments. "paystack" (default) uses the
// paystack-* edge functions; set window.PAYMENT_PROVIDER = "daraja" in
// config.js to go back to the direct Safaricom functions.
const PAYMENT_PROVIDER = window.PAYMENT_PROVIDER || 'paystack';
const MPESA_PUSH_FN = PAYMENT_PROVIDER === 'paystack' ? 'paystack-charge' : 'mpesa-stk-push';
const MPESA_QUERY_FN = PAYMENT_PROVIDER === 'paystack' ? 'paystack-verify' : 'mpesa-stk-query';

/* ---------------------------------------------------------------------- */
/* Seed data                                                               */
/* ---------------------------------------------------------------------- */

const DEFAULT_INVENTORY = [
  { id: 'p1', name: 'Paracetamol 500mg', category: 'Pain Relief', sku: 'PCM-500', price: 50, stock: 200, reorderLevel: 30, expiry: '2027-03-01', requiresRx: false },
  { id: 'p2', name: 'Ibuprofen 400mg', category: 'Pain Relief', sku: 'IBU-400', price: 80, stock: 150, reorderLevel: 25, expiry: '2026-11-15', requiresRx: false },
  { id: 'p3', name: 'Amoxicillin 500mg', category: 'Antibiotics', sku: 'AMX-500', price: 250, stock: 60, reorderLevel: 20, expiry: '2026-09-10', requiresRx: true },
  { id: 'p4', name: 'Metformin 500mg', category: 'Diabetes', sku: 'MET-500', price: 180, stock: 40, reorderLevel: 15, expiry: '2027-01-20', requiresRx: true },
  { id: 'p5', name: 'Amlodipine 5mg', category: 'Cardiovascular', sku: 'AML-5', price: 220, stock: 8, reorderLevel: 10, expiry: '2026-12-05', requiresRx: true },
  { id: 'p6', name: 'Cetirizine 10mg', category: 'Allergy', sku: 'CET-10', price: 90, stock: 100, reorderLevel: 20, expiry: '2027-05-01', requiresRx: false },
  { id: 'p7', name: 'Omeprazole 20mg', category: 'Digestive', sku: 'OMP-20', price: 150, stock: 55, reorderLevel: 15, expiry: '2026-10-18', requiresRx: true },
  { id: 'p8', name: 'ORS Sachets', category: 'First Aid', sku: 'ORS-01', price: 40, stock: 300, reorderLevel: 50, expiry: '2027-08-01', requiresRx: false },
  { id: 'p9', name: 'Vitamin C 1000mg', category: 'Vitamins', sku: 'VITC-1000', price: 350, stock: 70, reorderLevel: 15, expiry: '2027-02-14', requiresRx: false },
  { id: 'p10', name: 'Cough Syrup 100ml', category: 'Respiratory', sku: 'CGH-100', price: 280, stock: 45, reorderLevel: 10, expiry: '2026-08-30', requiresRx: false },
  { id: 'p11', name: 'Elastic Bandage', category: 'First Aid', sku: 'BND-01', price: 120, stock: 80, reorderLevel: 15, expiry: '2028-01-01', requiresRx: false },
  { id: 'p12', name: 'Hand Sanitizer 250ml', category: 'Hygiene', sku: 'SNT-250', price: 200, stock: 90, reorderLevel: 20, expiry: '2028-06-01', requiresRx: false },
  { id: 'p13', name: 'Multivitamin Syrup (Kids)', category: 'Vitamins', sku: 'MVK-100', price: 320, stock: 6, reorderLevel: 10, expiry: '2026-09-05', requiresRx: false },
];

const DEFAULT_STAFF = [
  { id: 's1', name: 'Admin', role: 'admin' },
  { id: 's2', name: 'Grace Wanjiru', role: 'staff', canManageInventory: false },
  { id: 's3', name: 'Kevin Otieno', role: 'staff', canManageInventory: false },
];

const DEFAULT_SETTINGS = { pharmacyName: 'Amani Pharmacy', currency: 'KSh', taxRate: 16, sessionTimeoutMinutes: 5, theme: 'earthy' };

const EXPIRY_WINDOW_DAYS = 30;

// Whole days between today and a product's expiry date. Negative means
// already expired. Returns null when there's no expiry date on file.
function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function expiryLabel(days) {
  if (days === null) return '';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `Expires in ${days}d`;
}

// The dashboard and the Inventory tab both use these, so "low", "out" and
// "expiring" always mean the same thing — and the counts match everywhere.
function stockState(p) {
  const stock = Number(p.stock) || 0;
  if (stock <= 0) return 'out';
  return stock <= (Number(p.reorderLevel) || 0) ? 'low' : 'ok';
}
// Expiry only raises an alert while there is stock on the shelf to act on.
function expiryState(p) {
  if ((Number(p.stock) || 0) <= 0) return null;
  const d = daysUntilExpiry(p.expiry);
  if (d === null) return null;
  if (d < 0) return 'expired';
  return d <= EXPIRY_WINDOW_DAYS ? 'soon' : null;
}
function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
// "10:10 PM" today, "Yesterday 10:10 PM", otherwise "24 Oct, 10:10 PM".
function formatWhen(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayDiff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

// Small coloured label used for stock / expiry / sale status.
const PILL_TONES = {
  red:   { color: 'var(--red)', bg: 'var(--red-pale)' },
  amber: { color: 'color-mix(in srgb, var(--amber) 72%, #000)', bg: 'var(--amber-pale)' },
  green: { color: 'var(--pine)', bg: 'var(--pine-pale)' },
  grey:  { color: 'var(--muted)', bg: 'var(--bg)' },
};
function StatusPill({ tone = 'grey', children, title, style }) {
  const t = PILL_TONES[tone] || PILL_TONES.grey;
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      lineHeight: 1.5, whiteSpace: 'nowrap', color: t.color, background: t.bg, ...style
    }}>{children}</span>
  );
}

/* ---------------------------------------------------------------------- */
/* Storage helpers — backed by Supabase, shared across every device       */
/*                                                                        */
/* Every key also mirrors into localStorage on this device. If a save     */
/* can't reach Supabase (no signal / wifi down), the change still applies */
/* immediately on screen and is marked "dirty" locally. Dirty keys are    */
/* retried automatically — on a timer, and the moment the browser         */
/* reports it's back online — until they successfully sync.               */
/* ---------------------------------------------------------------------- */

const STORE_KEYS = ['staff', 'settings', 'inventoryLog'];
const CACHE_PREFIX = 'pos_cache_';
const DIRTY_PREFIX = 'pos_dirty_';
const TOKEN_KEY = 'pos_session_token';

/* Session token issued by staff-login. Writes to kv_store go through the
   save-kv edge function and are rejected server-side without a valid,
   unexpired one of these — see save-kv/index.ts. */
let sessionToken = (() => {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
})();

function setSessionToken(token) {
  sessionToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) { /* ignore */ }
}

// Peek at a token's expiry without verifying its signature — just for UX,
// so an obviously-expired token doesn't restore a session that save-kv
// would immediately reject anyway. The server is the real check.
function tokenExpiresAt(token) {
  try {
    const [body] = token.split('.');
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch (e) {
    return null;
  }
}

// Same idea as tokenExpiresAt: peek at role/canManageInventory so a
// restored session's UI matches what this token actually carries. This
// matters because permission changes an admin makes don't retroactively
// rewrite an already-issued token — they take effect on that staff
// member's next login — so showing the cached staffList value here could
// display an "Inventory" button a stale token would just get 403'd on.
function tokenClaims(token) {
  try {
    const [body] = token.split('.');
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded));
    return { role: json.role, canManageInventory: !!json.canManageInventory };
  } catch (e) {
    return null;
  }
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('local cache write failed for', key, e);
  }
}

function markDirty(key) {
  try { localStorage.setItem(DIRTY_PREFIX + key, '1'); } catch (e) { /* ignore */ }
}
function clearDirty(key) {
  try { localStorage.removeItem(DIRTY_PREFIX + key); } catch (e) { /* ignore */ }
}
function isDirty(key) {
  try { return localStorage.getItem(DIRTY_PREFIX + key) === '1'; } catch (e) { return false; }
}
function getDirtyKeys() {
  return STORE_KEYS.filter(isDirty);
}

// Offline queue for the per-row writes: stock decrements at checkout,
// admin product upserts/deletes, and now sale insert/void/settle too.
// These don't fit the existing whole-blob markDirty/flushDirtyKeys
// mechanism above — each entry here is one specific action to retry, not
// "this whole key is stale" — so they get their own small queue, flushed
// the same way (on reconnect and by the same background poll). Started
// out inventory-only (hence the localStorage key name, kept as-is so any
// already-queued actions on a device aren't dropped by this change);
// record-sale actions now share it too.
const PENDING_INVENTORY_KEY = 'pos_pending_inventory_actions';

function getPendingSyncActions() {
  try { return JSON.parse(localStorage.getItem(PENDING_INVENTORY_KEY) || '[]'); }
  catch (e) { return []; }
}
function setPendingSyncActions(actions) {
  try { localStorage.setItem(PENDING_INVENTORY_KEY, JSON.stringify(actions)); }
  catch (e) { /* ignore */ }
}
function hasPendingSyncActions() {
  return getPendingSyncActions().length > 0;
}
function queueSyncAction(action) {
  setPendingSyncActions([...getPendingSyncActions(), action]);
}

async function flushPendingSyncActions() {
  const actions = getPendingSyncActions();
  if (actions.length === 0) return;
  const remaining = [];
  for (const action of actions) {
    try {
      let error;
      if (action.type === 'adjust-stock') {
        ({ error } = await invokeFn('adjust-stock', { body: { token: sessionToken, items: action.items, direction: action.direction } }));
      } else if (action.type === 'log-activity') {
        ({ error } = await invokeFn('log-activity', { body: { token: sessionToken, ...action.entry } }));
      } else if (action.type === 'record-sale') {
        ({ error } = await invokeFn('record-sale', {
          body: {
            token: sessionToken, action: action.saleAction, sale: action.sale, id: action.id,
            reason: action.reason, voidedBy: action.voidedBy, method: action.method, settledBy: action.settledBy,
            mpesaReceipt: action.mpesaReceipt, paymentRef: action.paymentRef, paymentTxnId: action.paymentTxnId,
          },
        }));
      } else {
        ({ error } = await invokeFn('manage-inventory', { body: { token: sessionToken, action: action.type, product: action.product, id: action.id } }));
      }
      // Only a genuine connectivity failure gets requeued. A real
      // rejection (out of stock, expired session, bad fields) will fail
      // the exact same way every time it's retried, so requeuing it would
      // just leave it stuck in the pending count forever — surface it
      // once via console.error instead and drop it.
      if (error && error.network) {
        remaining.push(action);
      } else if (error) {
        console.error('Sync action rejected, not retrying:', action, error.message);
      }
    } catch (e) {
      remaining.push(action); // still offline — keep it queued
    }
  }
  setPendingSyncActions(remaining);
}

// Row <-> product shape mapping for the 'inventory' table (snake_case
// columns in Postgres, camelCase fields everywhere in the UI).
function rowToProduct(r) {
  return {
    id: r.id, name: r.name, category: r.category, sku: r.sku,
    price: Number(r.price), stock: Number(r.stock),
    reorderLevel: Number(r.reorder_level), expiry: r.expiry || '',
    requiresRx: Boolean(r.requires_rx),
  };
}

async function getInventoryRows() {
  // Same dirty-first pattern as getOrInit: while there's an unsynced local
  // change queued (see flushPendingSyncActions), trust what's on
  // screen instead of overwriting it with a server read that predates it.
  if (hasPendingSyncActions()) {
    const cached = readCache('inventory');
    if (cached !== null) return cached;
  }
  try {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    const products = (data || []).map(rowToProduct);
    writeCache('inventory', products);
    return products;
  } catch (e) {
    console.error('inventory read failed, using local cache', e);
    return readCache('inventory') || DEFAULT_INVENTORY;
  }
}

// The 'sales' table stores each sale as one jsonb row (see
// sales-migration.sql) rather than column-by-column, since the sale
// shape evolves in this file over time. The row's own id/timestamps are
// metadata; the sale object the rest of the app works with is just data.
function rowToSale(r) {
  return r.data;
}

async function getSalesRows() {
  // Same dirty-first pattern as getInventoryRows: while there's an
  // unsynced local sale action queued (see flushPendingSyncActions),
  // trust what's on screen instead of overwriting it with a server read
  // that predates it.
  if (hasPendingSyncActions()) {
    const cached = readCache('sales');
    if (cached !== null) return cached;
  }
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    const sales = (data || []).map(rowToSale);
    writeCache('sales', sales);
    return sales;
  } catch (e) {
    console.error('sales read failed, using local cache', e);
    return readCache('sales') || [];
  }
}

function rowToActivity(r) {
  return {
    id: r.id,
    timestamp: r.ts,
    staffId: r.staff_id,
    staffName: r.staff_name || 'Unknown',
    action: r.action,
    productName: r.subject || '',
    sku: r.sku || '',
    detail: r.detail || '',
    before: r.before || null,
    after: r.after || null,
    refId: r.ref_id || null,
    amount: r.amount != null ? Number(r.amount) : null,
  };
}

// Newest 1000 events. If the activity_log table hasn't been created yet
// (activity-log-setup.sql not run), fall back to the old kv_store array so
// the app keeps working through the migration.
async function getActivityRows() {
  try {
    const { data, error } = await supabase.from('activity_log').select('*').order('ts', { ascending: false }).limit(1000);
    if (error) throw error;
    const rows = (data || []).map(rowToActivity);
    writeCache('activityLog', rows);
    return rows;
  } catch (e) {
    console.error('activity log read failed, falling back', e);
    try {
      return await getOrInit('inventoryLog', []);
    } catch (e2) {
      return readCache('activityLog') || [];
    }
  }
}

async function getOrInit(key, defaultValue) {
  // Trust the local copy while it has unsynced changes — a server read
  // right now would just be stale and would clobber what's on screen.
  if (isDirty(key)) {
    const cached = readCache(key);
    if (cached !== null) return cached;
  }
  try {
    const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    if (!data) {
      await saveShared(key, defaultValue);
      return defaultValue;
    }
    writeCache(key, data.value);
    return data.value;
  } catch (e) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    return defaultValue;
  }
}

async function saveShared(key, value) {
  // Always cache locally first so the UI and any offline session reflect
  // the change immediately, regardless of what the network does.
  writeCache(key, value);
  try {
    // Writes go through save-kv, not a direct table write — it checks the
    // session token and, for 'staff'/'settings', that the session is an
    // admin's, before touching the database. See save-kv/index.ts.
    const { data, error } = await invokeFn('save-kv', { body: { token: sessionToken, key, value } });
    if (error || !data || data.error) throw (error || new Error((data && data.error) || 'save failed'));
    clearDirty(key);
    return true;
  } catch (e) {
    markDirty(key);
    return false;
  }
}

// Attempt to push any keys that failed to sync earlier. Safe to call often —
// it's a no-op when nothing is dirty.
async function flushDirtyKeys() {
  for (const key of getDirtyKeys()) {
    const cached = readCache(key);
    if (cached !== null) await saveShared(key, cached);
  }
}

const SESSION_KEY = 'pos_session_staff_id';

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatMoney(amount, currency) {
  return currency + ' ' + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Normalizes a locally-formatted Kenyan number (07XX XXX XXX, +254..., etc.)
// into the plain digits-with-country-code format wa.me requires. Returns
// null if there's nothing usable to build a link from.
function toWhatsappDigits(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = '254' + digits.slice(1);
  else if (digits.length === 9) digits = '254' + digits; // e.g. "7XX XXX XXX" with no leading 0
  return digits;
}

function isSameDay(iso, ref) {
  const d = new Date(iso);
  return d.toDateString() === ref.toDateString();
}

// Tracks whether a CSS media query currently matches, re-rendering on
// change (window resize, orientation change, devtools resize). Used to
// pick between layouts in JS rather than shipping both and hiding one
// with CSS — keeps a single source of truth instead of duplicated markup.
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// Downloads the given sales as a CSV file — used for accounting / KRA
// records, since sales otherwise only ever live inside the app.
function exportSalesCsv(salesList, settings) {
  const header = ['Date/Time', 'Sale ID', 'Cashier', 'Payment Method', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Status'];
  const rows = salesList.map((s) => [
    new Date(s.timestamp).toLocaleString(),
    s.id,
    s.cashier,
    s.paymentMethod + (s.paymentMethod === 'account' ? (s.settled ? ' (settled)' : ' (unpaid)') : ''),
    s.customerName || '',
    s.items.map((i) => `${i.qty} x ${i.name}`).join('; '),
    Number(s.subtotal).toFixed(2),
    Number(s.tax).toFixed(2),
    Number(s.total).toFixed(2),
    s.voided ? `Voided${s.voidReason ? ': ' + s.voidReason : ''}` : 'Completed',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------- */
/* Barcode scanning                                                       */
/* ---------------------------------------------------------------------- */

// Cheap USB/Bluetooth barcode scanners work as "keyboard wedges" — they
// simply type each digit of the barcode very fast (usually well under
// 30ms between characters) and finish with an Enter. A human typing never
// gets close to that speed, so buffering keystrokes and resetting the
// buffer whenever the gap between two keys is too large reliably tells a
// scanner burst apart from normal typing, with no dedicated input focus
// required — this listens globally so a scan works whether or not the
// search box happens to be focused. Only exact SKU matches turn into an
// action, so an accidental fast typist just gets ignored, not disrupted.
function useBarcodeScanner(onScan, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let buffer = '';
    let lastTime = 0;
    const SCAN_GAP_MS = 60;
    const MIN_LENGTH = 4;

    const handler = (e) => {
      const now = Date.now();
      if (now - lastTime > SCAN_GAP_MS) buffer = '';
      lastTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= MIN_LENGTH) onScan(buffer);
        buffer = '';
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onScan, enabled]);
}

// Camera-based scanning using the browser's native Shape Detection API
// Camera-based scanning. Chrome/Android get the native Shape Detection API
// (window.BarcodeDetector) — zero extra download, hardware-accelerated.
// Everywhere else (Safari on iOS/macOS, Firefox, older Chrome) falls back
// to ZXing, a pure JS/WASM decoder that only needs getUserMedia + canvas —
// it's lazy-loaded from esm.sh so browsers that have the native API never
// pay for it. If neither path works (camera denied, or the fallback
// library fails to load with no network), the UI degrades to a clear
// "use a hardware scanner instead" message rather than failing silently.
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];

// Without an explicit focusMode hint, some phones (mainly Android/Chrome)
// do a single focus pass when the camera opens instead of continuously
// refocusing as it's moved into position over a barcode — that's what
// shows up as a slow, blurry focus right after the scanner opens.
// 'advanced' constraints are best-effort: browsers that don't support
// focusMode (Safari) just ignore this entry rather than failing the
// whole getUserMedia call. A capped ideal resolution also helps here —
// it's plenty for barcode decoding and autofocus settles faster on a
// smaller frame than it does hunting across a full-res feed.
const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [{ focusMode: 'continuous' }],
  },
};

function BarcodeScannerModal({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('loading'); // 'loading' | 'native' | 'zxing' | 'unsupported'
  const [nativeSupported] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

  // onDetect is often a fresh function identity on every parent render
  // (e.g. the app re-fetches inventory on a 15s poll / realtime push, which
  // recreates callbacks memoized on it). Routing calls through a ref means
  // the camera effect below can ignore that churn entirely and never
  // restart mid-scan just because the parent re-rendered for an unrelated
  // reason.
  const onDetectRef = useRef(onDetect);
  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

  useEffect(() => {
    let stream;
    let rafId;
    let cancelled = false;
    let zxingControls;
    let detected = false;
    const fire = (code) => {
      if (detected) return;
      detected = true;
      onDetectRef.current(code);
    };

    const runNative = async () => {
      const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
      stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMode('native');

      const tick = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) { fire(codes[0].rawValue); return; }
        } catch (err) {
          // Transient per-frame decode errors are normal — keep scanning.
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    const runZxing = async () => {
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
        import('https://esm.sh/@zxing/browser@0.1.5'),
        import('https://esm.sh/@zxing/library@0.21.3'),
      ]);
      if (cancelled) return;
      const formatMap = {
        ean_13: BarcodeFormat.EAN_13, ean_8: BarcodeFormat.EAN_8,
        upc_a: BarcodeFormat.UPC_A, upc_e: BarcodeFormat.UPC_E,
        code_128: BarcodeFormat.CODE_128, code_39: BarcodeFormat.CODE_39,
        qr_code: BarcodeFormat.QR_CODE,
      };
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS.map((f) => formatMap[f]));
      const codeReader = new BrowserMultiFormatReader(hints);
      setMode('zxing');
      zxingControls = await codeReader.decodeFromConstraints(
        CAMERA_CONSTRAINTS,
        videoRef.current,
        (result) => { if (result) fire(result.getText()); }
      );
      if (cancelled) zxingControls.stop();
    };

    (async () => {
      try {
        if (nativeSupported) {
          await runNative();
        } else {
          await runZxing();
        }
      } catch (err) {
        if (cancelled) return;
        // Native path failing mid-flight (rare) still has a fallback worth
        // trying before giving up entirely.
        if (nativeSupported) {
          try { await runZxing(); return; } catch (zxErr) { /* fall through to error below */ }
        }
        setError(
          err && err.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access and try again.'
            : 'Camera scanning isn\'t available on this device.'
        );
        setMode('unsupported');
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (zxingControls) zxingControls.stop();
    };
  }, [nativeSupported]);

  return (
    <div className="pos-modal-backdrop" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--paper)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="pos-serif" style={{ fontSize: 16, fontWeight: 700 }}>Scan barcode</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        {mode === 'unsupported' && (
          <EmptyState icon={AlertTriangle} title="Couldn't start the camera"
            subtitle={`${error} A USB or Bluetooth barcode scanner will still work automatically, anywhere in the app — just point and click to fire the trigger.`} />
        )}
        {mode !== 'unsupported' && (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: '32% 8%', border: '2px solid var(--pine-light)', borderRadius: 8, pointerEvents: 'none' }} />
          </div>
        )}
        {mode !== 'unsupported' && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>Line the barcode up inside the frame.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Global styles                                                          */
/* ---------------------------------------------------------------------- */

// Each theme is just a set of CSS custom-property values plus a heading
// font. Swapping themes never touches component code — every screen reads
// colors via var(--pine) etc., so one variable-block swap re-skins the
// whole app instantly.
const THEMES = {
  earthy: {
    label: 'Earthy',
    swatch: ['#16423C', '#FBF9F3', '#C97A2B'],
    vars: {
      pine: '#16423C', pineLight: '#2F6B57', pinePale: '#E7EEE9',
      paper: '#FBF9F3', bg: '#EEF1EA', ink: '#202822', muted: '#6B776E', border: '#D9DFD4',
      amber: '#C97A2B', amberPale: '#FBEEDD', red: '#B23A48', redPale: '#FBE7E8',
    },
    fontSerif: "'Zilla Slab', serif",
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');",
  },
  clinical: {
    label: 'Clinical',
    swatch: ['#0B5394', '#FFFFFF', '#2E7BB8'],
    vars: {
      pine: '#0B5394', pineLight: '#2E7BB8', pinePale: '#E5EEF6',
      paper: '#FFFFFF', bg: '#F1F4F8', ink: '#1A2733', muted: '#64748B', border: '#D7DEE7',
      amber: '#C97A2B', amberPale: '#FBEEDD', red: '#C0392B', redPale: '#FBE5E3',
    },
    fontSerif: "'Inter', sans-serif",
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');",
  },
  modern: {
    label: 'Modern',
    swatch: ['#18181B', '#FFFFFF', '#D97706'],
    vars: {
      pine: '#18181B', pineLight: '#3F3F46', pinePale: '#F1F1F3',
      paper: '#FFFFFF', bg: '#FAFAFA', ink: '#18181B', muted: '#71717A', border: '#E4E4E7',
      amber: '#D97706', amberPale: '#FEF3E2', red: '#DC2626', redPale: '#FEE2E2',
    },
    fontSerif: "'Inter', sans-serif",
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');",
  },
};
const DEFAULT_THEME = 'earthy';

function buildStyles(themeKey) {
  const t = THEMES[themeKey] || THEMES[DEFAULT_THEME];
  const v = t.vars;
  return `
${t.fontImport}

.pos-root {
  --pine: ${v.pine};
  --pine-light: ${v.pineLight};
  --pine-pale: ${v.pinePale};
  --paper: ${v.paper};
  --bg: ${v.bg};
  --ink: ${v.ink};
  --muted: ${v.muted};
  --border: ${v.border};
  --amber: ${v.amber};
  --amber-pale: ${v.amberPale};
  --red: ${v.red};
  --red-pale: ${v.redPale};
  --font-serif: ${t.fontSerif};
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
}
.pos-root *, .pos-root *::before, .pos-root *::after { box-sizing: border-box; }
.pos-serif { font-family: var(--font-serif); }
.pos-mono { font-family: 'IBM Plex Mono', monospace; }
.pos-root button { font-family: 'Inter', sans-serif; cursor: pointer; }
.pos-root input, .pos-root select { font-family: 'Inter', sans-serif; }
.pos-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.pos-scroll::-webkit-scrollbar-thumb { background: #C7D0C0; border-radius: 4px; }

/* Icon-only buttons (edit / delete / info / close). Fixed hit area kept
   comfortably tappable on touch screens regardless of the icon's own size. */
.pos-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: none; border: none; padding: 0; color: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s ease;
}
.pos-icon-btn:hover:not(:disabled) { background: var(--pine-pale); }
.pos-icon-btn:active:not(:disabled) { background: var(--border); }
.pos-icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pos-icon-btn-danger:hover:not(:disabled) { background: var(--red-pale); }
@media (max-width: 860px) {
  .pos-icon-btn { width: 40px; height: 40px; }
}

/* Shimmering placeholder blocks for first-load / slow-connection states. */
@keyframes pos-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
.pos-skeleton {
  background-image: linear-gradient(90deg, var(--pine-pale) 25%, var(--border) 37%, var(--pine-pale) 63%);
  background-size: 600px 100%;
  animation: pos-shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes pos-spin { to { transform: rotate(360deg); } }

/* ---- Checkout ---- */
@keyframes pco-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pos-modal.pos-checkout {
  width: 440px; max-width: 100%; max-height: min(92vh, 780px);
  display: flex; flex-direction: column; overflow: hidden;
  background: #fff; border-radius: 14px; padding: 0;
  box-shadow: 0 18px 50px rgba(22,66,60,0.28);
  animation: pco-in 0.18s ease-out;
}
.pco-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px 12px 22px; }
.pco-form { display: flex; flex-direction: column; min-height: 0; flex: 1; margin: 0; }
.pco-body { padding: 0 22px 18px; overflow-y: auto; flex: 1; min-height: 0; }
.pco-foot { padding: 14px 22px 18px; border-top: 1px solid var(--border); background: var(--paper); }

.pco-items { max-height: 128px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px; }
.pco-item { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--border); }
.pco-item:last-child { border-bottom: none; }

.pco-total { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; background: var(--pine); color: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }

.pco-rx { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.35; padding: 11px 12px; margin-bottom: 14px; border-radius: 10px; background: var(--amber-pale); border: 1px solid #E9C99C; color: #5C3A12; cursor: pointer; }
.pco-rx input { margin-top: 2px; width: 16px; height: 16px; accent-color: var(--pine); flex-shrink: 0; }
.pco-rx-ok { background: var(--pine-pale); border-color: #B5CBBD; color: var(--pine); }

.pco-methods { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.pco-method { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 11px 4px; font-size: 12.5px; font-weight: 500; border-radius: 10px; border: 1px solid var(--border); background: #fff; color: var(--ink); transition: background-color 0.12s ease, border-color 0.12s ease; }
.pco-method:hover:not(:disabled):not([aria-checked="true"]) { background: var(--paper); border-color: #C3CCBE; }
.pco-method[aria-checked="true"] { border-color: var(--pine); background: var(--pine-pale); color: var(--pine); font-weight: 600; box-shadow: inset 0 0 0 1px var(--pine); }
.pco-method:disabled { opacity: 0.4; cursor: not-allowed; }

.pco-panel { padding-bottom: 2px; }
.pco-label { display: block; font-size: 12.5px; font-weight: 500; color: var(--ink); margin-bottom: 5px; }
.pco-input { width: 100%; padding: 11px 12px; border-radius: 9px; border: 1px solid var(--border); background: #fff; font-size: 15px; color: var(--ink); }
.pco-input:disabled { background: var(--paper); color: var(--muted); }
.pco-input[aria-invalid="true"] { border-color: var(--red); }
.pco-code { font-size: 17px; letter-spacing: 2px; text-transform: uppercase; }
.pco-code::placeholder { letter-spacing: 0; text-transform: none; font-size: 14px; }
.pco-help { font-size: 12px; line-height: 1.4; color: var(--muted); margin: 7px 0 0; }
.pco-msg { display: flex; align-items: flex-start; gap: 5px; font-size: 12.5px; line-height: 1.4; margin: 7px 0 0; }
.pco-msg-bad { color: var(--red); }
.pco-msg-ok { color: var(--pine-light); }
.pco-msg-warn { color: #8A5314; }
.pco-msg svg { margin-top: 2px; flex-shrink: 0; }
.pco-result { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-top: 12px; padding: 9px 12px; border-radius: 9px; background: var(--paper); }

.pco-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.pco-chip { padding: 7px 11px; border-radius: 8px; border: 1px solid var(--border); background: #fff; color: var(--ink); font-size: 12.5px; font-weight: 600; }
.pco-chip:hover { background: var(--paper); }
.pco-chip-strong { border-color: var(--pine); background: var(--pine-pale); color: var(--pine); }
.pco-chip-quiet { color: var(--muted); font-weight: 500; }

.pco-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px; margin-bottom: 14px; border-radius: 10px; background: var(--bg); }
.pco-seg button { padding: 8px 6px; border: none; border-radius: 8px; background: transparent; color: var(--muted); font-size: 12.5px; font-weight: 500; }
.pco-seg button[aria-checked="true"] { background: #fff; color: var(--pine); font-weight: 600; box-shadow: 0 1px 3px rgba(22,66,60,0.16); }

.pco-check { display: flex; gap: 10px; align-items: flex-start; font-size: 12.5px; line-height: 1.4; margin-top: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--paper); cursor: pointer; }
.pco-check input { margin-top: 2px; width: 16px; height: 16px; accent-color: var(--pine); flex-shrink: 0; }
.pco-check-on { border-color: #B5CBBD; background: var(--pine-pale); }

.pco-wait { text-align: center; padding: 16px 0 6px; }
.pco-wait-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
.pco-spinner { width: 34px; height: 34px; margin: 0 auto 12px; border: 3px solid var(--pine-pale); border-top-color: var(--pine); border-radius: 50%; animation: pos-spin 0.8s linear infinite; }

.pco-primary { width: 100%; padding: 14px 0; border: none; border-radius: 11px; background: var(--pine); color: #fff; font-size: 15px; font-weight: 600; transition: background-color 0.12s ease; }
.pco-primary:hover:not(:disabled) { background: var(--pine-light); }
.pco-primary:disabled { background: #B9C4B4; cursor: not-allowed; }

.pco-method:focus-visible, .pco-chip:focus-visible, .pco-seg button:focus-visible, .pco-primary:focus-visible,
.pco-input:focus-visible, .pco-rx:focus-within, .pco-check:focus-within { outline: 2px solid var(--pine-light); outline-offset: 2px; }

@media (max-width: 600px) {
  .pos-modal-backdrop.pco-backdrop { align-items: flex-end; padding: 0; }
  .pos-modal.pos-checkout { width: 100%; max-height: 94vh; border-radius: 16px 16px 0 0; }
  .pco-head { padding: 16px 16px 10px 18px; }
  .pco-body { padding: 0 18px 16px; }
  .pco-foot { padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px)); }
  .pco-input { font-size: 16px; } /* stops iOS zooming into the field */
}
@media (prefers-reduced-motion: reduce) {
  .pos-modal.pos-checkout { animation: none; }
  .pco-spinner { animation-duration: 2s; }
}

/* ---- Cashier screen ---- */
.pcs-search { position: relative; flex: 1 1 260px; }
.pcs-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.pcs-search input { width: 100%; padding: 11px 38px 11px 36px; border-radius: 10px; border: 1px solid var(--border); background: #fff; font-size: 14px; color: var(--ink); }
.pcs-search input:focus-visible { outline: 2px solid var(--pine-light); outline-offset: 1px; }
.pcs-search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); color: var(--muted); }
.pcs-kbd { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 11px; line-height: 1.5; padding: 0 6px; border: 1px solid var(--border); border-radius: 5px; background: var(--paper); color: var(--muted); pointer-events: none; }
.pcs-scan { display: flex; align-items: center; gap: 8px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--border); background: #fff; color: var(--ink); font-size: 13.5px; font-weight: 500; }
.pcs-scan:hover { background: var(--paper); }

.pcs-chips { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0 12px; }
.pcs-chip { flex: 0 0 auto; padding: 7px 13px; border-radius: 999px; border: 1px solid var(--border); background: #fff; color: var(--ink); font-size: 12.5px; font-weight: 500; white-space: nowrap; transition: background-color 0.12s ease; }
.pcs-chip:hover:not([aria-pressed="true"]) { background: var(--paper); }
.pcs-chip[aria-pressed="true"] { background: var(--pine); border-color: var(--pine); color: #fff; font-weight: 600; }

.pcs-section-label { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.pcs-quick { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 6px; margin-bottom: 10px; }
.pcs-quick-btn { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 116px; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: #fff; text-align: left; transition: background-color 0.2s ease, border-color 0.2s ease; }
.pcs-quick-btn:hover { border-color: var(--pine-light); }
.pcs-quick-btn[data-flash="true"] { border-color: var(--pine); background: var(--pine-pale); }

.pcs-results { font-size: 12.5px; color: var(--muted); margin: -2px 0 10px; }
.pcs-link { background: none; border: none; padding: 6px 8px; border-radius: 7px; font-size: 12.5px; font-weight: 500; color: var(--pine); }
.pcs-link:hover { background: var(--pine-pale); }

.pcs-tile { position: relative; display: flex; flex-direction: column; min-height: 112px; text-align: left; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 13px 13px 11px; cursor: pointer; transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease; }
.pcs-tile:hover:not(.pcs-out) { border-color: var(--pine-light); box-shadow: 0 2px 10px rgba(22,66,60,0.10); }
.pcs-tile:active:not(.pcs-out) { transform: scale(0.985); }
.pcs-tile:focus-visible { outline: 2px solid var(--pine-light); outline-offset: 2px; }
.pcs-out { opacity: 0.55; cursor: not-allowed; background: var(--paper); }
.pcs-incart { border-color: var(--pine); box-shadow: inset 0 0 0 1px var(--pine); }
.pcs-badge { position: absolute; top: -8px; left: 12px; background: var(--pine); color: #fff; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; }
.pcs-rx { align-self: flex-start; font-size: 10px; font-weight: 700; color: var(--amber); border: 1px solid var(--amber); border-radius: 5px; padding: 1px 5px; margin-bottom: 5px; }
.pcs-name { font-size: 15px; font-weight: 600; line-height: 1.25; padding-right: 22px; margin-bottom: 2px; }
.pcs-meta { font-size: 10.5px; color: var(--muted); margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcs-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; }
.pcs-price { font-size: 15px; font-weight: 500; white-space: nowrap; }
.pcs-stock { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px; white-space: nowrap; }
.pcs-stock-ok { background: var(--pine-pale); color: var(--pine); }
.pcs-stock-low { background: var(--amber-pale); color: var(--amber); }
.pcs-stock-out { background: var(--red-pale); color: var(--red); }

.pcs-cart-head { padding: 14px 14px 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.pcs-count { font-size: 11.5px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--pine-pale); color: var(--pine); }
.pcs-line { padding: 12px 0; border-bottom: 1px solid var(--border); }
.pcs-line-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.pcs-line-name { font-size: 13.5px; font-weight: 500; line-height: 1.3; }
.pcs-unit { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.pcs-line-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.pcs-step { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: 9px; background: #fff; overflow: hidden; }
.pcs-step button { width: 34px; height: 32px; border: none; background: none; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.pcs-step button:hover:not(:disabled) { background: var(--pine-pale); }
.pcs-step button:disabled { color: #B9C4B4; cursor: not-allowed; }
.pcs-step span { min-width: 30px; text-align: center; font-size: 14px; font-weight: 600; }

.pcs-charge { width: 100%; padding: 14px 0; border: none; border-radius: 11px; background: var(--pine); color: #fff; font-size: 15.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background-color 0.12s ease; }
.pcs-charge:hover:not(:disabled) { background: var(--pine-light); }
.pcs-charge:disabled { background: #B9C4B4; cursor: not-allowed; }
.pcs-charge kbd { font: inherit; font-size: 11px; opacity: 0.8; border: 1px solid rgba(255,255,255,0.45); border-radius: 5px; padding: 0 5px; }

.pcs-chip:focus-visible, .pcs-scan:focus-visible, .pcs-quick-btn:focus-visible, .pcs-step button:focus-visible, .pcs-charge:focus-visible, .pcs-link:focus-visible { outline: 2px solid var(--pine-light); outline-offset: 2px; }

@media (max-width: 860px) {
  .pcs-kbd, .pcs-charge kbd { display: none; }
  .pcs-step button { width: 40px; height: 38px; }
  .pcs-scan { padding: 0 14px; min-height: 42px; }
}

/* Structural classes (kept plain on desktop, overridden below on mobile) */
.pos-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: var(--pine); color: #fff; flex-wrap: wrap; gap: 8px; }
.pos-topbar-right { display: flex; align-items: center; gap: 16px; }
.pos-staff-layout { display: flex; height: calc(100vh - 62px); }
.pos-product-panel { flex: 1; padding: 20px; overflow-y: auto; }
.pos-filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.pos-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.pos-cart-panel { width: 340px; background: var(--paper); border-left: 1px solid var(--border); display: flex; flex-direction: column; }
.pos-cart-close-btn { display: none; }
.pos-cart-mobile-bar { display: none; }
.pos-admin-layout { display: flex; height: calc(100vh - 62px); }
.pos-admin-nav { width: 200px; background: var(--paper); border-right: 1px solid var(--border); padding: 18px 12px; }
.pos-admin-nav-btn { width: 100%; }
.pos-admin-content { flex: 1; overflow-y: auto; padding: 24px; }
.pos-table-scroll { overflow-x: auto; }
.pos-modal-backdrop { position: fixed; inset: 0; background: rgba(22,66,60,0.35); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; }
.pos-modal { width: 380px; max-width: 100%; }

@media (max-width: 860px) {
  .pos-topbar { padding: 12px 16px; }
  .pos-topbar-right { gap: 10px; }
  .pos-sync-indicator { display: none; }

  .pos-staff-layout { display: block; height: auto; min-height: calc(100vh - 62px); }
  .pos-product-panel { padding: 14px 14px 96px; }
  .pos-product-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 8px; }

  .pos-cart-panel { display: none; }
  .pos-cart-panel.pos-cart-open {
    display: flex; position: fixed; inset: 0; z-index: 70; width: 100%; border-left: none;
  }
  .pos-cart-close-btn { display: flex; }
  .pos-cart-mobile-bar {
    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; width: 100%;
    background: var(--pine); color: #fff; padding: 12px 16px; align-items: center; border: none;
    justify-content: space-between; box-shadow: 0 -4px 14px rgba(0,0,0,0.15);
  }

  .pos-admin-layout { display: block; height: auto; min-height: calc(100vh - 62px); }
  .pos-admin-nav { width: 100%; display: flex; overflow-x: auto; padding: 10px 12px; border-right: none; border-bottom: 1px solid var(--border); gap: 6px; }
  .pos-admin-nav-btn { width: auto; white-space: nowrap; margin-bottom: 0 !important; }
  .pos-admin-content { padding: 16px; }

  .pos-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .pos-dash-columns { grid-template-columns: 1fr !important; gap: 20px !important; }
  .pos-inv-toolbar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
}

/* Dashboard panels — a header, a scrolling list of tappable rows, a footer. */
.pos-panel { background: var(--paper); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.pos-panel-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 12px; border-bottom: 1px solid var(--border); }
.pos-panel-icon { width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pos-panel-body { overflow-y: auto; max-height: 356px; }
.pos-panel-sub { padding: 8px 16px 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background: var(--bg); border-bottom: 1px solid var(--border); }
.pos-link-btn { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--pine); white-space: nowrap; }
.pos-link-btn:hover { background: var(--pine-pale); }
.pos-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); font-size: 13px; }
.pos-row:last-child { border-bottom: none; }
.pos-row-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 16px; background: none; border: none; border-bottom: 1px solid var(--border); text-align: left; color: inherit; font-size: 13px; }
.pos-row-btn:last-child { border-bottom: none; }
.pos-row-btn:hover { background: var(--pine-pale); }
.pos-row-btn:focus-visible, .pos-link-btn:focus-visible, .pos-chip:focus-visible, .pos-stat-btn:focus-visible { outline: 2px solid var(--pine-light); outline-offset: -2px; }
.pos-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.pos-stat-btn { display: block; width: 100%; padding: 0; border: none; background: none; text-align: left; color: inherit; border-radius: 12px; transition: transform .12s ease, box-shadow .12s ease; }
.pos-stat-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.07); }

/* Inventory: filter chips, status pills, inline stock stepper */
.pos-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--paper); color: var(--ink); font-size: 12.5px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.pos-chip:hover { background: var(--pine-pale); }
.pos-chip .pos-chip-n { font-size: 11px; font-weight: 700; padding: 0 7px; min-width: 20px; text-align: center; border-radius: 999px; background: var(--pine-pale); color: var(--pine); line-height: 1.6; }
.pos-chip .pos-chip-n.warn { background: var(--red-pale); color: var(--red); }
.pos-chip.on, .pos-chip.on:hover { background: var(--pine); border-color: var(--pine); color: #fff; }
.pos-chip.on .pos-chip-n, .pos-chip.on .pos-chip-n.warn { background: rgba(255,255,255,0.22); color: #fff; }
.pos-chip-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.pos-chip-row::-webkit-scrollbar { display: none; }
.pos-field { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px; background: #fff; color: var(--ink); height: 36px; }
.pos-inv-row { transition: background-color .12s ease; }
.pos-inv-row:hover { background: color-mix(in srgb, var(--pine-pale) 55%, transparent); }
.pos-stepper { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; background: #fff; overflow: hidden; flex-shrink: 0; }
.pos-stepper.dirty { border-color: var(--pine); box-shadow: 0 0 0 2px var(--pine-pale); }
.pos-stepper button { width: 28px; height: 30px; border: none; background: none; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); padding: 0; }
.pos-stepper button:hover:not(:disabled) { background: var(--pine-pale); color: var(--pine); }
.pos-stepper button:disabled { opacity: 0.35; cursor: not-allowed; }
.pos-stepper input { width: 46px; height: 30px; border: none; border-left: 1px solid var(--border); border-right: 1px solid var(--border); border-radius: 0; text-align: center; font-size: 13px; font-weight: 600; background: transparent; padding: 0; -moz-appearance: textfield; }
.pos-stepper input::-webkit-outer-spin-button, .pos-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.pos-stepper input:focus { outline: none; background: var(--pine-pale); }
.pos-mini-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); background: #fff; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; }
.pos-mini-btn:hover:not(:disabled) { background: var(--pine-pale); }
.pos-mini-btn.ok { background: var(--pine); border-color: var(--pine); color: #fff; }
.pos-mini-btn.ok:hover:not(:disabled) { background: var(--pine-light); }
.pos-mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pos-inv-card { background: var(--paper); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
@media (max-width: 860px) {
  .pos-stepper button { width: 38px; height: 38px; }
  .pos-stepper input { width: 54px; height: 38px; font-size: 16px; }
  .pos-mini-btn { width: 38px; height: 38px; }
  .pos-field { height: 40px; font-size: 16px; }
  .pos-panel-body { max-height: 420px; }
}

/* Printing a receipt: hide everything else on the page, show only the
   receipt content, full-width, with no shadows/backdrops. */
@media print {
  body * { visibility: hidden; }
  .pos-receipt-print, .pos-receipt-print * { visibility: visible; }
  .pos-receipt-print {
    position: fixed; left: 0; top: 0; width: 100% !important; max-width: 100% !important;
    max-height: none !important; box-shadow: none !important; border-radius: 0 !important;
  }
  .pos-no-print { display: none !important; }
}
`;
}

/* ---------------------------------------------------------------------- */
/* Login                                                                   */
/* ---------------------------------------------------------------------- */

function LoginScreen({ settings, onLogin, notice }) {
  const [tab, setTab] = useState('staff');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // PIN checking happens server-side now — the browser never holds
      // the full staff/PIN list, so there's nothing here to inspect.
      const { data, error: fnError } = await invokeFn('staff-login', { body: { pin, role: tab } });
      if (fnError || !data || data.error || !data.user || !data.token) {
        setError((data && data.error) || (fnError && fnError.message) || 'Incorrect PIN for this login type.');
        setPin('');
        inputRef.current?.focus();
        return;
      }
      onLogin(data.user, data.token);
    } catch (err) {
      setError('Could not reach the login service. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <style>{buildStyles(settings.theme)}</style>
      <div style={{ width: 360, maxWidth: '100%', background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--border)', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--pine)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Pill size={26} />
        </div>
        <h1 className="pos-serif" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>{settings.pharmacyName}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>Point of sale</p>

        {notice && (
          <div style={{ background: 'var(--amber-pale)', color: '#5C3A12', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 16, textAlign: 'left' }}>
            {notice}
          </div>
        )}

        <div style={{ display: 'flex', background: 'var(--pine-pale)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {['staff', 'admin'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPin(''); setError(''); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: tab === t ? 'var(--pine)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--pine)',
                fontWeight: 600, fontSize: 13, transition: 'all .15s'
              }}
            >
              {t === 'staff' ? 'Cashier' : 'Admin'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="Enter PIN"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 18,
              border: error ? '1px solid var(--red)' : '1px solid var(--border)',
              textAlign: 'center', letterSpacing: 4, marginBottom: 12, background: '#fff'
            }}
          />

          {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button type="submit" disabled={!pin || loading} style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600,
            background: pin && !loading ? 'var(--pine)' : '#B9C4B4', color: '#fff'
          }}>{loading ? 'Checking…' : 'Log in'}</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared header                                                          */
/* ---------------------------------------------------------------------- */

function TopBar({ settings, user, onLogout, lastSynced, right }) {
  return (
    <div className="pos-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Pill size={18} />
        </div>
        <div>
          <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>{settings.pharmacyName}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{user.role === 'admin' ? 'Admin console' : 'Cashier terminal'} · {user.name}</div>
        </div>
      </div>
      <div className="pos-topbar-right">
        {right}
        <div className="pos-sync-indicator" style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7FD99A', display: 'inline-block' }} />
          Synced {lastSynced}
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Empty state — used wherever a list has nothing to show yet             */
/* ---------------------------------------------------------------------- */

function EmptyState({ icon: Icon, title, subtitle, compact }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: compact ? '22px 16px' : '40px 20px',
    }}>
      {Icon && (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: 'var(--pine-pale)', color: 'var(--pine)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        }}>
          <Icon size={18} />
        </div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, maxWidth: 280 }}>{subtitle}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Staff / Cashier POS                                                     */
/* ---------------------------------------------------------------------- */

function StaffPOS({ inventory, sales, settings, user, addSale, updateStock, lastSynced, onLogout, saveInventory, adjustStockBy, logInventoryChange, voidSale, settleAccountSale }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [drugInfoProduct, setDrugInfoProduct] = useState(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  const [flashId, setFlashId] = useState(null);
  const [expiredConfirm, setExpiredConfirm] = useState(null); // product awaiting an "it's expired, add anyway?" confirmation
  const flashTimer = useRef(null);
  const scanNoticeTimer = useRef(null);

  const myTodaySales = sales.filter((s) => s.cashier === user.name && isSameDay(s.timestamp, new Date()) && !s.voided);
  const myTodayRevenue = myTodaySales.reduce((sum, s) => sum + s.total, 0);

  // Below this width the toolbar has only room for one control, so the
  // three tools below render into a dropdown instead of inline buttons —
  // same list of tools either way, defined once.
  const isCompact = useMediaQuery('(max-width: 860px)');
  const topbarTools = [
    {
      key: 'summary', title: "Today's sales", onClick: () => setSummaryOpen(true), Icon: TrendingUp,
      inlineContent: <React.Fragment><span className="pos-mono" style={{ fontWeight: 600 }}>{formatMoney(myTodayRevenue, settings.currency)}</span><span style={{ opacity: 0.75 }}>today</span></React.Fragment>,
      trailingValue: <span className="pos-mono" style={{ fontWeight: 600 }}>{formatMoney(myTodayRevenue, settings.currency)}</span>,
    },
    { key: 'accounts', title: 'Accounts', onClick: () => setAccountsOpen(true), Icon: CreditCard },
    ...(user.canManageInventory
      ? [{ key: 'inventory', title: 'Manage inventory', inlineContent: <span>Inventory</span>, onClick: () => setInventoryOpen(true), Icon: Package }]
      : []),
  ];

  const categories = ['All', ...Array.from(new Set(inventory.map((p) => p.category)))];

  const filtered = inventory.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
    const matchC = category === 'All' || p.category === category;
    return matchQ && matchC;
  });

  // Top-selling products across all recorded (non-voided) sales, most
  // frequently rung up first. Surfaced as a quick-access row so a cashier
  // doesn't have to hunt through the full grid for staples like ORS or
  // Paracetamol. Only meaningful once there's some sales history.
  const frequentProducts = useMemo(() => {
    const counts = {};
    for (const s of sales) {
      if (s.voided) continue;
      for (const item of s.items || []) {
        counts[item.id] = (counts[item.id] || 0) + item.qty;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => inventory.find((p) => p.id === id))
      .filter((p) => p && p.stock > 0);
  }, [sales, inventory]);

  const showFrequentRow = frequentProducts.length >= 3 && query === '' && category === 'All';

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  useEffect(() => () => { if (scanNoticeTimer.current) clearTimeout(scanNoticeTimer.current); }, []);

  const searchRef = useRef(null);
  const lastKeyRef = useRef(0);

  // Short toast at the bottom of the screen (shares the scan-notice slot).
  const notify = (msg) => {
    setScanNotice(msg);
    if (scanNoticeTimer.current) clearTimeout(scanNoticeTimer.current);
    scanNoticeTimer.current = setTimeout(() => setScanNotice(''), 3000);
  };

  const addToCart = (product, expired = false) => {
    if (product.stock <= 0) return;
    const inCart = cart.find((i) => i.id === product.id);
    if (inCart && inCart.qty >= product.stock) {
      notify(`Only ${product.stock} of ${product.name} in stock, and they're all in the cart.`);
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return c;
        return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, {
        id: product.id, name: product.name, price: product.price, cost: product.cost || 0, qty: 1,
        requiresRx: product.requiresRx, maxStock: product.stock,
        // Stamped only when this line was added through the expired-item
        // confirm dialog (see requestAddToCart/expiredConfirm below), so
        // it can ride along onto the sale record at checkout — a
        // compliance-relevant fact ("sold past expiry, cashier confirmed
        // it") that shouldn't just live in a modal that closes and is
        // forgotten.
        ...(expired ? { expiredAtSale: true } : {}),
      }];
    });
    // Brief visual confirmation that the tap registered — most useful on
    // the mobile drawer layout, where the cart panel isn't on screen.
    setFlashId(product.id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 600);
  };

  // Gate in front of addToCart for every entry point (grid tap, frequent
  // row, barcode scan). Stock is still a hard stop — there's nothing to
  // sell — but an already-expired item isn't blocked outright, since a
  // pharmacy may still need to pull and sell through what's on the shelf
  // under specific circumstances. Instead it stops here for an explicit
  // confirm, so a cashier can't ring one up by an absent-minded tap the
  // way a plain stock check would let them.
  const requestAddToCart = (product) => {
    if (product.stock <= 0) return;
    const days = daysUntilExpiry(product.expiry);
    if (days !== null && days < 0) {
      setExpiredConfirm(product);
      return;
    }
    addToCart(product);
  };

  // Shared by both scan paths (hardware keyboard-wedge and camera). A hit
  // goes straight into the cart with the same flash confirmation as a tap;
  // a miss drops the code into the search box so staff can find it by eye
  // instead — a mistyped or unlisted barcode shouldn't be a dead end.
  const handleBarcodeScan = useCallback((rawCode) => {
    const code = rawCode.trim();
    if (!code) return;
    const product = inventory.find((p) => p.sku && p.sku.toLowerCase() === code.toLowerCase());
    setScannerOpen(false);
    if (product) {
      if (product.stock <= 0) {
        setScanNotice(`"${product.name}" is out of stock.`);
      } else {
        requestAddToCart(product);
        setQuery('');
        setScanNotice('');
      }
    } else {
      setQuery(code);
      setScanNotice(`No product matches barcode "${code}".`);
    }
    if (scanNoticeTimer.current) clearTimeout(scanNoticeTimer.current);
    scanNoticeTimer.current = setTimeout(() => setScanNotice(''), 4000);
  }, [inventory]);

  const scannerListening = !checkoutOpen && !summaryOpen && !inventoryOpen && !accountsOpen && !drugInfoProduct && !scannerOpen && !expiredConfirm;
  useBarcodeScanner(handleBarcodeScan, scannerListening);

  // F2 opens checkout, "/" jumps to the search box (when not already typing).
  useEffect(() => {
    const onKey = (e) => {
      if (!scannerListening) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'F2' && cart.length > 0) {
        e.preventDefault();
        setCheckoutOpen(true);
        setCartOpen(false);
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scannerListening, cart.length]);

  const changeQty = (id, delta) => {
    const line = cart.find((i) => i.id === id);
    if (line && delta > 0 && line.qty >= line.maxStock) {
      notify(`Only ${line.maxStock} of ${line.name} in stock.`);
      return;
    }
    setCart((c) => c.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (next <= 0) return i;
      if (next > i.maxStock) return i;
      return { ...i, qty: next };
    }));
  };

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const clearCart = () => { if (cart.length > 0 && window.confirm('Remove all items from this sale?')) setCart([]); };

  const cartQty = useMemo(() => {
    const m = {};
    for (const i of cart) m[i.id] = i.qty;
    return m;
  }, [cart]);
  const unitCount = cart.reduce((n, i) => n + i.qty, 0);

  // Enter in the search box rings up an exact SKU match, or the only product
  // left after filtering. A scanner "types" its digits in a rapid burst, so a
  // very short gap before Enter means the scanner hook below is handling it —
  // skipping it here stops the same item being added twice.
  const onSearchKeyDown = (e) => {
    const now = Date.now();
    const gap = now - lastKeyRef.current;
    lastKeyRef.current = now;
    if (e.key === 'Escape') { setQuery(''); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (gap < 80) return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const target = inventory.find((p) => p.sku && p.sku.toLowerCase() === q) || (filtered.length === 1 ? filtered[0] : null);
    if (!target) { notify(filtered.length ? 'Several products match. Tap the one you want.' : 'No product matches that search.'); return; }
    if (target.stock <= 0) { notify(`${target.name} is out of stock.`); return; }
    requestAddToCart(target);
    setQuery('');
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax;

  const completeSale = (payment) => {
    const sale = {
      id: genId('sale'),
      timestamp: new Date().toISOString(),
      cashier: user.name,
      items: cart.map(({ id, name, price, cost, qty, expiredAtSale }) => ({
        id, name, price, qty, cost: cost || 0, // buying price frozen at time of sale, so later cost changes don't rewrite old profit
        ...(expiredAtSale ? { expiredAtSale: true } : {}),
      })),
      subtotal, tax, total,
      paymentMethod: payment.method,
      amountTendered: payment.tendered ?? total,
      change: payment.change ?? 0,
      mpesaReceipt: payment.mpesaReceipt || null,
      paymentRef: payment.paymentRef || null,
      paymentTxnId: payment.paymentTxnId || null,
      customerName: payment.customerName || null,
      customerPhone: payment.customerPhone || null,
      settled: payment.method !== 'account',
      voided: false,
    };
    addSale(sale);
    updateStock(cart.map((i) => ({ id: i.id, qty: i.qty })));
    setReceipt(sale);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  return (
    <div className="pos-root" style={{ minHeight: '100vh' }}>
      <style>{buildStyles(settings.theme)}</style>
      <TopBar settings={settings} user={user} onLogout={onLogout} lastSynced={lastSynced}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isCompact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {topbarTools.map(({ key, title, inlineContent, onClick, Icon }) => (
                  <button key={key} onClick={onClick} title={title} style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8,
                    border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.5
                  }}>
                    <Icon size={14} />
                    {inlineContent || <span>{title}</span>}
                  </button>
                ))}
              </div>
            )}

            {isCompact && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMoreOpen((o) => !o)} title="Tools" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
                  borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff'
                }}>
                  <MoreHorizontal size={18} />
                </button>
                {moreOpen && (
                  <React.Fragment>
                    <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                    <div style={{
                      position: 'absolute', top: '120%', left: 0, background: '#fff', borderRadius: 10,
                      border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
                      width: 200, maxWidth: 'calc(100vw - 32px)', zIndex: 61, overflow: 'hidden'
                    }}>
                      {topbarTools.map(({ key, title, trailingValue, onClick, Icon }, i) => (
                        <button key={key} onClick={() => { onClick(); setMoreOpen(false); }} style={{
                          display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '11px 14px',
                          border: 'none', borderBottom: i < topbarTools.length - 1 ? '1px solid var(--border)' : 'none',
                          background: '#fff', color: 'var(--ink)', fontSize: 13, textAlign: 'left'
                        }}>
                          <Icon size={15} color="var(--pine)" />
                          <span style={{ flex: 1 }}>{title}</span>
                          {trailingValue && <span style={{ fontSize: 12.5 }}>{trailingValue}</span>}
                        </button>
                      ))}
                    </div>
                  </React.Fragment>
                )}
              </div>
            )}

          </div>
        } />

      <div className="pos-staff-layout">
        {/* Product browser */}
        <div className="pos-product-panel pos-scroll">
          <div className="pos-filter-row" style={{ marginBottom: 10 }}>
            <div className="pcs-search">
              <Search size={16} className="pcs-search-icon" />
              <input
                ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onSearchKeyDown}
                placeholder="Search by name or SKU" aria-label="Search products" autoComplete="off"
              />
              {query
                ? <button type="button" className="pos-icon-btn pcs-search-clear" onClick={() => { setQuery(''); if (searchRef.current) searchRef.current.focus(); }} title="Clear search" aria-label="Clear search"><X size={15} /></button>
                : <span className="pcs-kbd" aria-hidden="true">/</span>}
            </div>
            <button type="button" className="pcs-scan" onClick={() => setScannerOpen(true)} title="Scan a barcode with the camera — or just fire a USB/Bluetooth scanner any time">
              <Camera size={16} color="var(--pine)" />
              Scan
            </button>
          </div>

          <div className="pcs-chips pos-scroll" role="group" aria-label="Filter by category">
            {categories.map((c) => (
              <button key={c} type="button" className="pcs-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>

          {showFrequentRow && (
            <div>
              <div className="pcs-section-label">Frequently sold</div>
              <div className="pcs-quick pos-scroll">
                {frequentProducts.map((p) => (
                  <button key={p.id} type="button" className="pcs-quick-btn" data-flash={flashId === p.id} onClick={() => requestAddToCart(p)}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</span>
                    <span className="pos-mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{formatMoney(p.price, settings.currency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(query || category !== 'All') && (
            <div className="pcs-results">
              {filtered.length} of {inventory.length} products
              <button type="button" className="pcs-link" onClick={() => { setQuery(''); setCategory('All'); }}>Show all</button>
            </div>
          )}

          <div className="pos-product-grid">
            {filtered.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              const inCart = cartQty[p.id] || 0;
              const allInCart = !out && inCart >= p.stock;
              const expDays = daysUntilExpiry(p.expiry);
              const expiringSoon = expDays !== null && expDays <= EXPIRY_WINDOW_DAYS;
              const stockLabel = out ? 'Out of stock' : allInCart ? 'All in cart' : low ? `${p.stock} left` : `${p.stock} in stock`;
              return (
                <div key={p.id}
                  className={'pcs-tile' + (out ? ' pcs-out' : '') + (inCart ? ' pcs-incart' : '')}
                  onClick={() => !out && requestAddToCart(p)}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); if (!out) requestAddToCart(p); } }}
                  role="button" tabIndex={out ? -1 : 0} aria-disabled={out}
                  aria-label={`${p.name}, ${formatMoney(p.price, settings.currency)}, ${out ? 'out of stock' : p.stock + ' in stock'}${inCart ? `, ${inCart} in cart` : ''}`}>
                  {inCart > 0 && <span className="pcs-badge">{inCart} in cart</span>}
                  {flashId === p.id && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(22,66,60,0.88)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff',
                      fontSize: 13, fontWeight: 600, pointerEvents: 'none'
                    }}>
                      <CheckCircle size={16} /> Added
                    </div>
                  )}
                  <button type="button" className="pos-icon-btn" onClick={(e) => { e.stopPropagation(); setDrugInfoProduct(p); }} title="AI dosage / side effects / interactions lookup" aria-label={`Drug information for ${p.name}`} style={{
                    position: 'absolute', top: 6, right: 6, color: 'var(--muted)', opacity: 0.6
                  }}><Info size={13} /></button>
                  {p.requiresRx && <span className="pcs-rx">℞ Rx</span>}
                  <div className="pos-serif pcs-name">{p.name}</div>
                  <div className="pos-mono pcs-meta">{p.category} · {p.sku}</div>
                  <div className="pcs-foot">
                    <span className="pos-mono pcs-price">{formatMoney(p.price, settings.currency)}</span>
                    <span className={'pcs-stock ' + (out ? 'pcs-stock-out' : (low || allInCart) ? 'pcs-stock-low' : 'pcs-stock-ok')}>{stockLabel}</span>
                  </div>
                  {expiringSoon && (
                    <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 600, color: expDays < 0 ? 'var(--red)' : 'var(--amber)' }}>
                      {expiryLabel(expDays)}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState icon={Search} title="No products match your search" subtitle="Try a different name, SKU, or category." />
              </div>
            )}
          </div>
        </div>

        {/* Cart — a fixed sidebar on desktop, a full-screen drawer on mobile */}
        <div className={'pos-cart-panel' + (cartOpen ? ' pos-cart-open' : '')}>
          <div className="pcs-cart-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} />
              <span className="pos-serif" style={{ fontWeight: 600, fontSize: 15 }}>Current sale</span>
              {cart.length > 0 && <span className="pcs-count">{unitCount} item{unitCount !== 1 ? 's' : ''}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {cart.length > 0 && <button type="button" className="pcs-link" onClick={clearCart}>Clear</button>}
              <button type="button" className="pos-cart-close-btn pos-icon-btn" onClick={() => setCartOpen(false)} title="Close cart" aria-label="Close cart" style={{ color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }} className="pos-scroll">
            {cart.length === 0 && <EmptyState icon={ShoppingCart} title="Cart is empty" subtitle="Tap a product, scan a barcode, or type a SKU and press Enter." />}
            {cart.map((i) => (
              <div key={i.id} className="pcs-line">
                <div className="pcs-line-top">
                  <div>
                    <div className="pcs-line-name">{i.name}{i.requiresRx ? ' ℞' : ''}</div>
                    <div className="pcs-unit pos-mono">{formatMoney(i.price, settings.currency)} each</div>
                  </div>
                  <button type="button" className="pos-icon-btn pos-icon-btn-danger" onClick={() => removeFromCart(i.id)} title="Remove from cart" aria-label={`Remove ${i.name}`} style={{ color: 'var(--muted)' }}><Trash2 size={14} /></button>
                </div>
                <div className="pcs-line-bottom">
                  <div className="pcs-step">
                    <button type="button" onClick={() => changeQty(i.id, -1)} disabled={i.qty <= 1} aria-label={`Fewer ${i.name}`}><Minus size={14} /></button>
                    <span className="pos-mono">{i.qty}</span>
                    <button type="button" onClick={() => changeQty(i.id, 1)} disabled={i.qty >= i.maxStock} aria-label={`More ${i.name}`}><Plus size={14} /></button>
                  </div>
                  <span className="pos-mono" style={{ fontSize: 14, fontWeight: 500 }}>{formatMoney(i.price * i.qty, settings.currency)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
            {settings.taxRate > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>Subtotal</span><span className="pos-mono">{formatMoney(subtotal, settings.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  <span>Tax ({settings.taxRate}%)</span><span className="pos-mono">{formatMoney(tax, settings.currency)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              <span className="pos-serif">Total</span><span className="pos-mono" style={{ fontSize: 22 }}>{formatMoney(total, settings.currency)}</span>
            </div>
            <button type="button" className="pcs-charge" onClick={() => { setCheckoutOpen(true); setCartOpen(false); }} disabled={cart.length === 0} title="Shortcut: F2">
              Charge {cart.length > 0 ? formatMoney(total, settings.currency) : ''}
              {cart.length > 0 && <kbd>F2</kbd>}
            </button>
          </div>
        </div>

        {/* Mobile-only: tap to open the cart drawer */}
        {cart.length > 0 && !cartOpen && (
          <button className="pos-cart-mobile-bar" onClick={() => setCartOpen(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <ShoppingCart size={16} />
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
              <span className="pos-mono">{formatMoney(total, settings.currency)}</span>
              <ChevronRight size={16} />
            </span>
          </button>
        )}
      </div>

      {checkoutOpen && (
        <CheckoutModal cart={cart} subtotal={subtotal} tax={tax} total={total} settings={settings} sales={sales}
          onClose={() => setCheckoutOpen(false)} onComplete={completeSale} />
      )}
      {receipt && <ReceiptModal sale={receipt} settings={settings} onClose={() => { setReceipt(null); setCartOpen(false); }} />}
      {summaryOpen && <CashierSummaryModal sales={sales} settings={settings} user={user} onClose={() => setSummaryOpen(false)} voidSale={voidSale} />}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
      {scannerOpen && <BarcodeScannerModal onDetect={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}
      {expiredConfirm && (
        <ConfirmModal
          title="This item has expired"
          message={`${expiredConfirm.name} ${expiryLabel(daysUntilExpiry(expiredConfirm.expiry))}. Add it to the cart anyway?`}
          confirmLabel="Add anyway"
          onCancel={() => setExpiredConfirm(null)}
          onConfirm={() => { addToCart(expiredConfirm, true); setExpiredConfirm(null); }}
        />
      )}
      {scanNotice && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 96,
          background: 'var(--ink)', color: '#fff', fontSize: 13, padding: '10px 16px', borderRadius: 10,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)', maxWidth: '90vw', textAlign: 'center'
        }}>
          {scanNotice}
        </div>
      )}
      {inventoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 95, overflow: 'auto', padding: 20 }} className="pos-scroll">
          <button onClick={() => setInventoryOpen(false)} style={{ marginBottom: 16, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to sales
          </button>
          <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} adjustStockBy={adjustStockBy} user={user} logInventoryChange={logInventoryChange} />
        </div>
      )}
      {accountsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 95, overflow: 'auto', padding: 20 }} className="pos-scroll">
          <button onClick={() => setAccountsOpen(false)} style={{ marginBottom: 16, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to sales
          </button>
          <AccountsTab sales={sales} settings={settings} settleAccountSale={settleAccountSale} />
        </div>
      )}
    </div>
  );
}

const PAYMENT_METHOD_META = {
  cash: { label: 'Cash', Icon: Banknote },
  card: { label: 'Card', Icon: CreditCard },
  mpesa: { label: 'M-Pesa', Icon: Smartphone },
  account: { label: 'On account', Icon: Users },
};

// Simple, dependency-free bar breakdown — reused by the cashier's daily
// summary and the admin dashboard.
function PaymentMethodBars({ sales, settings }) {
  const totals = Object.keys(PAYMENT_METHOD_META).map((method) => {
    const matching = sales.filter((s) => s.paymentMethod === method);
    return { method, total: matching.reduce((sum, s) => sum + s.total, 0), count: matching.length };
  });
  const max = Math.max(1, ...totals.map((t) => t.total));

  if (sales.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sales yet.</p>;
  }

  return (
    <div>
      {totals.map((t) => {
        const { label, Icon } = PAYMENT_METHOD_META[t.method];
        return (
          <div key={t.method} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}><Icon size={13} />{label}</span>
              <span className="pos-mono">{formatMoney(t.total, settings.currency)} · {t.count}</span>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${(t.total / max) * 100}%`, height: '100%', background: 'var(--pine)', borderRadius: 6, transition: 'width .2s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CashierSummaryModal({ sales, settings, user, onClose, voidSale }) {
  const today = new Date();
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const allMySales = sales
    .filter((s) => s.cashier === user.name && isSameDay(s.timestamp, today))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const activeMySales = allMySales.filter((s) => !s.voided);
  const revenue = activeMySales.reduce((sum, s) => sum + s.total, 0);

  const confirmVoid = async (id) => {
    if (!voidSale) return;
    setBusy(true);
    await voidSale(id, voidReason.trim());
    setBusy(false);
    setVoidingId(null);
    setVoidReason('');
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Your day so far</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: 'var(--pine-pale)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Sales rung up</div>
            <div className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>{activeMySales.length}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--pine-pale)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Total revenue</div>
            <div className="pos-mono" style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(revenue, settings.currency)}</div>
          </div>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>By payment method</h3>
        <PaymentMethodBars sales={activeMySales} settings={settings} />

        {allMySales.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 10px' }}>Today's sales</h3>
            {allMySales.map((s) => (
              <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>
                    {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.items.length} item{s.items.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pos-mono" style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{formatMoney(s.total, settings.currency)}</span>
                    {s.voided ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-pale)', padding: '2px 6px', borderRadius: 5 }}>Voided</span>
                    ) : voidSale && (
                      <button onClick={() => { setVoidingId(voidingId === s.id ? null : s.id); setVoidReason(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, textDecoration: 'underline' }}>
                        Void
                      </button>
                    )}
                  </span>
                </div>
                {voidingId === s.id && (
                  <div style={{ marginTop: 8, padding: 10, background: 'var(--red-pale)', borderRadius: 8 }}>
                    <label style={{ fontSize: 11, color: '#7A2530' }}>Reason for reversing this sale</label>
                    <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. wrong item rung up"
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, marginTop: 4, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busy} onClick={() => confirmVoid(s.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Voiding…' : 'Confirm void'}
                      </button>
                      <button onClick={() => setVoidingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// AI-assisted pharmacology reference lookup. Results are cached in this
// browser (drug info rarely changes) to avoid repeat API calls/cost, but
// always shown with a disclaimer — this is a reference aid, not a
// substitute for the product's package insert or a pharmacist's judgment.
function DrugInfoModal({ product, onClose }) {
  const [state, setState] = useState('loading'); // loading | done | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  // v2: bumped when the response shape changes (added drugClass,
  // contraindications) so anyone with an old cached lookup gets a fresh
  // one instead of seeing blank fields for the new keys.
  const cacheKey = 'pos_drug_info_v2_' + product.name.toLowerCase().trim();

  useEffect(() => {
    let cancelled = false;

    const cached = readCache(cacheKey);
    if (cached) {
      setInfo(cached);
      setState('done');
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await invokeFn('drug-info', { body: { drugName: product.name } });
        if (cancelled) return;
        if (fnError || !data || data.error) {
          setError((data && data.error) || (fnError && fnError.message) || 'Could not fetch drug information.');
          setState('error');
          return;
        }
        setInfo(data);
        writeCache(cacheKey, data);
        setState('done');
      } catch (e) {
        if (!cancelled) { setError('Could not reach the AI lookup service.'); setState('error'); }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.name]);

  const Field = ({ label, value, emphasis }) => (
    <div style={emphasis ? {
      marginBottom: 14, padding: '8px 10px', background: 'var(--red-pale)',
      borderLeft: '3px solid var(--red)', borderRadius: 6,
    } : { marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: emphasis ? 'var(--red)' : 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{value}</div>
    </div>
  );

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>{product.name}{product.requiresRx ? ' ℞' : ''}</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>AI-generated reference · not medical advice</div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 30, height: 30, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Looking this up…</p>
          </div>
        )}

        {state === 'error' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 4 }}>{error}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Check the product's package insert, or ask the pharmacist-in-charge.</p>
          </div>
        )}

        {state === 'done' && info && (
          <>
            {info.notARealDrug && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontStyle: 'italic' }}>This doesn't look like a medicine — showing what I could find anyway.</p>
            )}
            <Field label="Drug class" value={info.drugClass} />
            <Field label="Typical dosage" value={info.dosage} />
            <Field label="Common side effects" value={info.sideEffects} />
            <Field label="Contraindications" value={info.contraindications} emphasis />
            <Field label="Interactions" value={info.interactions} />
            <Field label="Other considerations" value={info.considerations} />
            <div style={{ marginTop: 4, padding: 10, background: 'var(--amber-pale)', borderRadius: 8, fontSize: 11.5, color: '#5C3A12', lineHeight: 1.4 }}>
              This is AI-generated reference information, not a clinical decision. Always verify against the product's official package insert, a current formulary, or the pharmacist-in-charge before advising a customer or dispensing.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Paystack's card popup script. index.html normally loads it, but if that page
// is out of date or the script was blocked/slow, load it here on demand so the
// till doesn't depend on it. Resolves true once window.PaystackPop exists.
let paystackPopupPromise = null;
function loadPaystackPopup() {
  if (window.PaystackPop) return Promise.resolve(true);
  if (!paystackPopupPromise) {
    paystackPopupPromise = new Promise((resolve) => {
      const el = document.createElement('script');
      el.src = 'https://js.paystack.co/v2/inline.js';
      el.onload = () => resolve(!!window.PaystackPop);
      el.onerror = () => resolve(false);
      document.head.appendChild(el);
    }).then((ok) => { if (!ok) paystackPopupPromise = null; return ok; }); // allow a retry
  }
  return paystackPopupPromise;
}

// Card payments through Paystack. The card number is typed into Paystack's
// own secure form (a popup opened with an access_code the server created),
// never into this app. The sale only completes once the server confirms the
// payment — either via Paystack's webhook (seen through the DB poll) or by
// asking Paystack directly (paystack-verify).
function usePaystackCard({ amount, refPrefix, onPaid }) {
  const [status, setStatus] = useState('idle'); // idle | starting | waiting | success | failed
  const [error, setError] = useState('');
  const [paymentRef, setPaymentRef] = useState(null);
  const pollTimer = useRef(null);
  const accessCode = useRef(null);
  const reference = useRef(null);
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const stopPolling = () => { if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; } };
  useEffect(() => stopPolling, []);

  const markPaid = (ref) => {
    stopPolling();
    if (paidRef.current) return; // never complete the same payment twice
    paidRef.current = true;
    setPaymentRef(ref);
    setStatus('success');
    onPaidRef.current(ref);
  };

  const checkOnce = async (askPaystack) => {
    const checkoutRequestId = reference.current;
    if (!checkoutRequestId) return;
    try {
      const { data } = await supabase.from('mpesa_transactions')
        .select('status, mpesa_receipt, result_desc')
        .eq('checkout_request_id', checkoutRequestId)
        .maybeSingle();
      if (data && data.status === 'success') { markPaid(data.mpesa_receipt || checkoutRequestId); return; }
      if (data && data.status === 'failed') {
        stopPolling();
        setError(data.result_desc || 'The card payment did not go through.');
        setStatus('failed');
        return;
      }
    } catch (e) { /* keep polling */ }
    if (askPaystack) {
      try {
        const { data: q } = await invokeFn('paystack-verify', { body: { token: sessionToken, checkoutRequestId } });
        if (q && q.status === 'success') { markPaid(q.receipt || checkoutRequestId); return; }
        if (q && q.status === 'failed') {
          stopPolling();
          setError(q.resultDesc || 'The card payment did not go through.');
          setStatus('failed');
        }
      } catch (e) { /* keep polling */ }
    }
  };

  const startPolling = () => {
    stopPolling();
    let attempts = 0;
    pollTimer.current = setInterval(() => {
      attempts += 1;
      checkOnce(attempts % 3 === 0); // every ~6s also ask Paystack directly
    }, 2000);
  };

  const openForm = async () => {
    const ready = await loadPaystackPopup();
    if (!ready) {
      setError('Could not load Paystack\'s card form (js.paystack.co). Check the internet connection, and that no ad-blocker or network filter is blocking it, then try again.');
      setStatus('failed');
      return;
    }
    new window.PaystackPop().resumeTransaction(accessCode.current, {
      // The customer finished in the form — confirm with the server straight away.
      onSuccess: () => { checkOnce(true); },
      onCancel: () => { /* form closed; stay on "waiting" so the cashier can reopen or cancel */ },
      onError: (err) => {
        setError((err && err.message) || 'The card form reported an error.');
        setStatus('failed');
      },
    });
  };

  const start = async () => {
    setError('');
    setStatus('starting');
    paidRef.current = false;
    loadPaystackPopup(); // warm up while the server creates the payment
    const saleRef = refPrefix + Date.now().toString().slice(-8);
    try {
      const { data, error: err } = await invokeFn('paystack-card-init', {
        body: { token: sessionToken, amount, saleRef },
      });
      if (err || !data || data.error) {
        setStatus('failed');
        setError((data && data.error) || (err && err.message) || 'Could not start the card payment.');
        return;
      }
      accessCode.current = data.accessCode;
      reference.current = data.checkoutRequestId;
      setStatus('waiting');
      startPolling();
      openForm();
    } catch (e) {
      setStatus('failed');
      setError('Could not reach the payment service. Check your connection and try again.');
    }
  };

  // Abandon this attempt. (A fresh "Pay by card" creates a new transaction.)
  const cancel = () => {
    stopPolling();
    accessCode.current = null;
    reference.current = null;
    setError('');
    setStatus('idle');
  };

  return { status, error, paymentRef, start, openForm, cancel, checkNow: () => checkOnce(true) };
}

// The card section shown under the "Card" tab (checkout) and in the account
// settle modal. Pure presentation over the usePaystackCard state.
function CardPaymentPanel({ card, disabled }) {
  const btn = { width: '100%', padding: '13px 0', borderRadius: 11, border: 'none', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: 15 };
  return (
    <div style={{ marginBottom: 16 }}>
      {(card.status === 'idle' || card.status === 'starting' || card.status === 'failed') && (
        <>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Opens Paystack's secure card form. The customer enters their card there — card details never touch this till.
          </p>
          {card.error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{card.error}</p>}
          <button type="button" onClick={card.start} disabled={disabled || card.status === 'starting'}
            style={{ ...btn, opacity: (disabled || card.status === 'starting') ? 0.5 : 1 }}>
            {card.status === 'starting' ? 'Starting…' : card.error ? 'Try again' : 'Pay by card'}
          </button>
          {disabled && card.status === 'idle' && <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>Confirm the prescription check above to continue.</p>}
        </>
      )}
      {card.status === 'waiting' && (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <div style={{ width: 34, height: 34, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, marginBottom: 4 }}>Waiting for the card payment…</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>The sale completes automatically once Paystack confirms it.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={card.openForm} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontSize: 13 }}>Reopen card form</button>
            <button type="button" onClick={card.checkNow} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13 }}>Check payment</button>
            <button type="button" onClick={card.cancel} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--muted)', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}
      {card.status === 'success' && (
        <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--pine)' }}>
          <CheckCircle size={24} style={{ marginBottom: 6 }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Card payment received{card.paymentRef ? ` — ${card.paymentRef}` : ''}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Checkout                                                                */
/* ---------------------------------------------------------------------- */

// An M-Pesa confirmation code is always 10 upper-case letters/digits.
const MPESA_CODE_RE = /^[A-Z0-9]{10}$/;

// Sales where the customer paid straight to the till (no prompt from this app)
// are saved with this marker in `paymentTxnId`, so reports can tell them apart
// from payments the system confirmed itself, and they can be matched against
// the M-Pesa statement.
const TILL_MANUAL_FLAG = 'till-manual';
const isManualTillSale = (sale) => !!sale && sale.paymentTxnId === TILL_MANUAL_FLAG;

// 0712…, 0112…, 712…, 254712…, +254712… → "254712345678"; null if not a valid mobile number.
function normalizeKenyaMobile(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('254')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^[17]\d{8}$/.test(d) ? '254' + d : null;
}

function CheckoutModal({ cart, subtotal, tax, total, settings, sales = [], onClose, onComplete }) {
  const currency = settings.currency;
  const money = (n) => formatMoney(n, currency);

  const [method, setMethod] = useState('cash');
  const [rxConfirmed, setRxConfirmed] = useState(false);

  // cash
  const [tendered, setTendered] = useState('');

  // account
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // M-Pesa: either send the customer a prompt, or record a payment they already made to the till
  const [mpesaMode, setMpesaMode] = useState('prompt'); // prompt | till
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('idle'); // idle | sending | waiting | success | failed | timeout
  const [mpesaError, setMpesaError] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState(null);
  const [mpesaTxnId, setMpesaTxnId] = useState(null);
  const [tillCode, setTillCode] = useState('');
  const [tillAmount, setTillAmount] = useState(String(total));
  const [tillChecked, setTillChecked] = useState(false);

  const pollTimer = useRef(null);
  const doneRef = useRef(false);

  const needsRx = cart.some((i) => i.requiresRx);
  const rxBlocked = needsRx && !rxConfirmed;
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  // A sale can only ever be completed once, whatever fires first (double-click,
  // a late payment confirmation, Enter pressed twice…).
  const finish = (payment) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(payment);
  };

  const card = usePaystackCard({
    amount: total, refPrefix: 'POS',
    onPaid: (paymentRef) => finish({ method: 'card', tendered: total, change: 0, paymentRef }),
  });

  const stopPolling = () => { if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; } };
  useEffect(() => stopPolling, []);

  // Once M-Pesa confirms a prompted payment, finish the sale automatically.
  // (Deliberately not tied to the selected tab: if the cashier clicked away
  // while waiting, a paid request must still become a sale.)
  useEffect(() => {
    if (mpesaStatus === 'success') {
      finish({ method: 'mpesa', tendered: total, change: 0, mpesaReceipt, paymentTxnId: mpesaTxnId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpesaStatus]);

  /* ----- closing: warn if a payment is still in flight ----- */
  const paymentInFlight = mpesaStatus === 'waiting' || mpesaStatus === 'timeout' || card.status === 'waiting';
  const requestClose = () => {
    if (paymentInFlight && !window.confirm(
      'A payment is still in progress.\n\nIf you close now and the customer pays, no sale will be recorded for it. Close anyway?'
    )) return;
    stopPolling();
    if (card.status === 'waiting') card.cancel();
    onClose();
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Don't let the cashier hop to another tab while a request is out.
  const methodsLocked = paymentInFlight || mpesaStatus === 'sending' || card.status === 'starting';

  /* ----- cash ----- */
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === 'cash' ? Math.max(0, tenderedNum - total) : 0;

  /* ----- M-Pesa prompt ----- */
  const phoneOk = !!normalizeKenyaMobile(mpesaPhone);
  const phoneLooksDone = mpesaPhone.replace(/\D/g, '').length >= 9;

  const watchMpesaStatus = (checkoutRequestId) => {
    stopPolling();
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await supabase.from('mpesa_transactions')
          .select('status, mpesa_receipt, result_desc')
          .eq('checkout_request_id', checkoutRequestId)
          .maybeSingle();
        if (data && data.status !== 'pending') {
          stopPolling();
          if (data.status === 'success') {
            setMpesaReceipt(data.mpesa_receipt);
            setMpesaTxnId(checkoutRequestId);
            setMpesaStatus('success');
          } else {
            setMpesaError(data.result_desc || 'The customer did not complete the payment.');
            setMpesaStatus('failed');
          }
          return;
        }
      } catch (e) { /* keep polling */ }
      // Safaricom's async callback is reliable for a successful payment, but
      // frequently never arrives when the customer cancels or enters a wrong
      // PIN. Every ~6s, ask the payment provider directly as a fallback.
      if (attempts % 3 === 0) {
        try {
          const { data: queryData } = await invokeFn(MPESA_QUERY_FN, {
            body: { token: sessionToken, checkoutRequestId },
          });
          if (queryData && queryData.status === 'success' && PAYMENT_PROVIDER === 'paystack') {
            stopPolling();
            setMpesaReceipt(queryData.receipt || null);
            setMpesaTxnId(checkoutRequestId);
            setMpesaStatus('success');
            return;
          }
          if (queryData && queryData.status === 'failed') {
            stopPolling();
            setMpesaError(queryData.resultDesc || 'The customer did not complete the payment.');
            setMpesaStatus('failed');
            return;
          }
        } catch (e) { /* keep polling */ }
      }
      if (attempts >= 30) { // ~60 seconds
        stopPolling();
        setMpesaStatus((s) => (s === 'waiting' ? 'timeout' : s));
      }
    }, 2000);
  };

  const sendMpesaRequest = async () => {
    setMpesaError('');
    setMpesaStatus('sending');
    const saleRef = 'POS' + Date.now().toString().slice(-8);
    try {
      const { data, error } = await invokeFn(MPESA_PUSH_FN, {
        body: { token: sessionToken, phone: mpesaPhone.trim(), amount: total, saleRef },
      });
      if (error || !data || data.error) {
        setMpesaStatus('failed');
        setMpesaError((data && data.error) || (error && error.message) || 'Could not send the payment request.');
        return;
      }
      setMpesaStatus('waiting');
      watchMpesaStatus(data.checkoutRequestId);
    } catch (e) {
      setMpesaStatus('failed');
      setMpesaError('Could not reach the payment service. Check your connection and try again.');
    }
  };

  const cancelMpesaRequest = () => {
    stopPolling();
    setMpesaError('');
    setMpesaStatus('idle');
  };

  const switchToTill = () => {
    cancelMpesaRequest();
    setMpesaMode('till');
  };

  /* ----- M-Pesa: customer already paid the till ----- */
  const code = tillCode.trim().toUpperCase();
  const codeFormatOk = MPESA_CODE_RE.test(code);
  const usedSale = useMemo(() => {
    if (!codeFormatOk) return null;
    return sales.find((s) => [s.mpesaReceipt, s.paymentRef].some((r) => r && String(r).toUpperCase() === code)) || null;
  }, [code, codeFormatOk, sales]);
  const paidNum = parseFloat(tillAmount) || 0;
  const shortBy = Math.max(0, total - paidNum);
  const overBy = Math.max(0, paidNum - total);
  const amountOk = paidNum > 0 && shortBy < 0.005;
  const tillReady = codeFormatOk && !usedSale && amountOk && tillChecked;

  const recordTillPayment = () => finish({
    method: 'mpesa', tendered: paidNum, change: 0, mpesaReceipt: code, paymentTxnId: TILL_MANUAL_FLAG,
  });

  /* ----- the one primary action in the footer ----- */
  let primary = null;
  if (method === 'cash') {
    primary = {
      label: change > 0 ? 'Complete sale — give ' + money(change) + ' change' : 'Complete sale',
      disabled: rxBlocked || tenderedNum < total || tenderedNum <= 0,
      onClick: () => finish({ method: 'cash', tendered: tenderedNum, change }),
    };
  } else if (method === 'account') {
    primary = {
      label: 'Put on account',
      disabled: rxBlocked || customerName.trim().length === 0,
      onClick: () => finish({ method: 'account', tendered: total, change: 0, customerName: customerName.trim(), customerPhone: customerPhone.trim() }),
    };
  } else if (method === 'mpesa' && mpesaMode === 'till') {
    primary = { label: 'Record M-Pesa payment', disabled: rxBlocked || !tillReady, onClick: recordTillPayment };
  } else if (method === 'mpesa') {
    if (mpesaStatus === 'idle' || mpesaStatus === 'failed') {
      primary = { label: mpesaError ? 'Try again' : 'Send payment request', disabled: rxBlocked || !phoneOk, onClick: sendMpesaRequest };
    } else if (mpesaStatus === 'sending') {
      primary = { label: 'Sending request…', disabled: true, onClick: () => {} };
    } else if (mpesaStatus === 'timeout') {
      primary = { label: 'Resend request', disabled: false, onClick: sendMpesaRequest };
    } else if (mpesaStatus === 'waiting') {
      primary = { label: 'Waiting for payment…', disabled: true, onClick: () => {} };
    } else {
      primary = { label: 'Payment received', disabled: true, onClick: () => {} };
    }
  }
  const primaryHint = primary && primary.disabled && rxBlocked ? 'Confirm the prescription check above to continue.' : '';

  const methods = [
    { key: 'cash', label: 'Cash', Icon: Banknote },
    { key: 'card', label: 'Card', Icon: CreditCard },
    { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
    { key: 'account', label: 'On account', Icon: Users },
  ];

  const showModeSwitch = method === 'mpesa' && (mpesaStatus === 'idle' || mpesaStatus === 'failed') ;

  return (
    <div className="pos-modal-backdrop pco-backdrop">
      <div className="pos-modal pos-checkout" role="dialog" aria-modal="true" aria-labelledby="pco-title">
        <div className="pco-head">
          <div>
            <div id="pco-title" className="pos-serif" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>Complete sale</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{itemCount} item{itemCount !== 1 ? 's' : ''} in this sale</div>
          </div>
          <button type="button" className="pos-icon-btn" onClick={requestClose} title="Close" aria-label="Close checkout" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <form className="pco-form" onSubmit={(e) => { e.preventDefault(); if (primary && !primary.disabled) primary.onClick(); }}>
          <div className="pco-body pos-scroll">

            {/* What's being bought */}
            <div className="pco-items pos-scroll">
              {cart.map((i) => (
                <div key={i.id} className="pco-item">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {i.name}{i.requiresRx ? ' ℞' : ''}
                    <span className="pos-mono" style={{ color: 'var(--muted)', marginLeft: 6 }}>×{i.qty}</span>
                  </span>
                  <span className="pos-mono" style={{ whiteSpace: 'nowrap' }}>{money(i.price * i.qty)}</span>
                </div>
              ))}
              {tax > 0 && (
                <div className="pco-item" style={{ color: 'var(--muted)' }}>
                  <span style={{ flex: 1 }}>Subtotal {money(subtotal)} + tax ({settings.taxRate}%)</span>
                  <span className="pos-mono">{money(tax)}</span>
                </div>
              )}
            </div>

            <div className="pco-total">
              <span className="pos-serif" style={{ fontSize: 16, opacity: 0.9 }}>Total due</span>
              <span className="pos-mono" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.5 }}>{money(total)}</span>
            </div>

            {needsRx && (
              <label className={'pco-rx' + (rxConfirmed ? ' pco-rx-ok' : '')}>
                <input type="checkbox" checked={rxConfirmed} onChange={(e) => setRxConfirmed(e.target.checked)} />
                <span>
                  <b>I've seen a valid prescription for the ℞ items.</b>
                  <span style={{ display: 'block', fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>Payment is locked until this is ticked.</span>
                </span>
              </label>
            )}

            {/* How they're paying */}
            <div className="pco-methods" role="radiogroup" aria-label="Payment method">
              {methods.map(({ key, label, Icon }) => {
                const selected = method === key;
                return (
                  <button key={key} type="button" role="radio" aria-checked={selected}
                    className="pco-method" disabled={methodsLocked && !selected}
                    onClick={() => setMethod(key)}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* ---------------- Cash ---------------- */}
            {method === 'cash' && (
              <div className="pco-panel">
                <label className="pco-label" htmlFor="pco-tendered">Amount received</label>
                <input id="pco-tendered" className="pco-input pos-mono" type="number" inputMode="decimal" min="0" step="any" autoFocus
                  value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={money(total)} />
                <div className="pco-chips">
                  <button type="button" className="pco-chip pco-chip-strong" onClick={() => setTendered(String(total))}>Exact amount</button>
                  {[50, 100, 200, 500, 1000].map((amt) => (
                    <button key={amt} type="button" className="pco-chip" onClick={() => setTendered((t) => String((parseFloat(t) || 0) + amt))}>+{amt}</button>
                  ))}
                  {tendered !== '' && <button type="button" className="pco-chip pco-chip-quiet" onClick={() => setTendered('')}>Clear</button>}
                </div>
                {tenderedNum > 0 && (
                  <div className="pco-result" style={{ color: tenderedNum < total ? 'var(--red)' : 'var(--pine)' }}>
                    <span>{tenderedNum < total ? 'Still to pay' : 'Change to give'}</span>
                    <span className="pos-mono">{tenderedNum < total ? money(total - tenderedNum) : money(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* ---------------- On account ---------------- */}
            {method === 'account' && (
              <div className="pco-panel">
                <label className="pco-label" htmlFor="pco-cname">Customer name</label>
                <input id="pco-cname" className="pco-input" autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Wanjiku Kamau" />
                <label className="pco-label" htmlFor="pco-cphone" style={{ marginTop: 12 }}>Phone (optional)</label>
                <input id="pco-cphone" className="pco-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" />
                <p className="pco-help">Recorded as unpaid on the customer's account until it's settled from the Accounts tab.</p>
              </div>
            )}

            {/* ---------------- M-Pesa ---------------- */}
            {method === 'mpesa' && (
              <div className="pco-panel">
                {showModeSwitch && (
                  <div className="pco-seg" role="radiogroup" aria-label="How the customer pays">
                    <button type="button" role="radio" aria-checked={mpesaMode === 'prompt'} onClick={() => setMpesaMode('prompt')}>Send payment request</button>
                    <button type="button" role="radio" aria-checked={mpesaMode === 'till'} onClick={() => setMpesaMode('till')}>Already paid at till</button>
                  </div>
                )}

                {/* prompt mode: entering the number */}
                {mpesaMode === 'prompt' && (mpesaStatus === 'idle' || mpesaStatus === 'sending' || mpesaStatus === 'failed') && (
                  <>
                    <label className="pco-label" htmlFor="pco-phone">Customer's M-Pesa number</label>
                    <input id="pco-phone" className="pco-input pos-mono" autoFocus inputMode="tel" autoComplete="off"
                      value={mpesaPhone} onChange={(e) => { setMpesaPhone(e.target.value); if (mpesaError) setMpesaError(''); }}
                      placeholder="07XX XXX XXX" disabled={mpesaStatus === 'sending'}
                      aria-invalid={phoneLooksDone && !phoneOk} />
                    {mpesaError
                      ? <p className="pco-msg pco-msg-bad" role="alert">{mpesaError}</p>
                      : phoneLooksDone && !phoneOk
                        ? <p className="pco-msg pco-msg-bad">That doesn't look like a Kenyan mobile number. Try 0712 345 678.</p>
                        : <p className="pco-help">They'll get a PIN prompt for {money(total)} on this phone.</p>}
                  </>
                )}

                {/* prompt mode: waiting for the customer */}
                {mpesaMode === 'prompt' && (mpesaStatus === 'waiting' || mpesaStatus === 'timeout') && (
                  <div className="pco-wait">
                    <div className="pco-spinner" aria-hidden="true" />
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
                      {mpesaStatus === 'timeout' ? 'No answer yet' : 'Prompt sent to ' + mpesaPhone}
                    </p>
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 300, margin: '0 auto' }}>
                      {mpesaStatus === 'timeout'
                        ? 'Ask the customer to check their phone. If they say they already paid the till, record it instead.'
                        : 'Ask them to enter their M-Pesa PIN. The sale completes by itself when the payment lands.'}
                    </p>
                    <div className="pco-wait-actions">
                      {mpesaStatus === 'timeout' && <button type="button" className="pco-chip pco-chip-strong" onClick={switchToTill}>They paid the till</button>}
                      <button type="button" className="pco-chip pco-chip-quiet" onClick={cancelMpesaRequest}>Cancel request</button>
                    </div>
                  </div>
                )}

                {mpesaMode === 'prompt' && mpesaStatus === 'success' && (
                  <div className="pco-wait" style={{ color: 'var(--pine)' }}>
                    <CheckCircle size={28} style={{ marginBottom: 6 }} />
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Payment received{mpesaReceipt ? ' — ' + mpesaReceipt : ''}</p>
                  </div>
                )}

                {/* till mode: customer already paid */}
                {mpesaMode === 'till' && (
                  <>
                    <p className="pco-help" style={{ marginTop: 0, marginBottom: 12 }}>
                      Use this when the customer paid your till before you sent a request. Don't send a prompt as well, or they'll pay twice.
                    </p>

                    <label className="pco-label" htmlFor="pco-code">M-Pesa confirmation code</label>
                    <input id="pco-code" className="pco-input pos-mono pco-code" autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false}
                      maxLength={10} value={tillCode} placeholder="e.g. SGH7K2L9QX"
                      onChange={(e) => setTillCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      aria-invalid={code.length === 10 && (!codeFormatOk || !!usedSale)} />
                    {usedSale ? (
                      <p className="pco-msg pco-msg-bad" role="alert">
                        This code is already on a sale{usedSale.timestamp ? ' from ' + new Date(usedSale.timestamp).toLocaleString() : ''}{usedSale.cashier ? ' (' + usedSale.cashier + ')' : ''}. Each payment can only be used once.
                      </p>
                    ) : codeFormatOk ? (
                      <p className="pco-msg pco-msg-ok"><Check size={13} /> Code format is right and it hasn't been used on another sale.</p>
                    ) : (
                      <p className="pco-help">{code.length}/10 — the 10 letters and numbers at the start of the M-Pesa message.</p>
                    )}

                    <label className="pco-label" htmlFor="pco-paid" style={{ marginTop: 12 }}>Amount received</label>
                    <input id="pco-paid" className="pco-input pos-mono" type="number" inputMode="decimal" min="0" step="any"
                      value={tillAmount} onChange={(e) => setTillAmount(e.target.value)} />
                    {shortBy >= 0.005 && <p className="pco-msg pco-msg-bad">Short by {money(shortBy)}. The full {money(total)} must be received to complete this sale.</p>}
                    {overBy >= 0.005 && <p className="pco-msg pco-msg-warn">{money(overBy)} more than the total was paid. The sale is recorded at {money(total)}; sort out the difference with the customer.</p>}

                    <label className={'pco-check' + (tillChecked ? ' pco-check-on' : '')}>
                      <input type="checkbox" checked={tillChecked} onChange={(e) => setTillChecked(e.target.checked)} />
                      <span>I've confirmed this payment on the till's phone or M-Pesa statement, not only from the customer's message.</span>
                    </label>
                    <p className="pco-help">Saved as a manual till payment so it can be matched against your M-Pesa statement later.</p>
                  </>
                )}
              </div>
            )}

            {/* ---------------- Card ---------------- */}
            {method === 'card' && (
              <div className="pco-panel">
                <CardPaymentPanel card={card} disabled={rxBlocked} />
              </div>
            )}
          </div>

          {primary && (
            <div className="pco-foot">
              <button type="submit" className="pco-primary" disabled={primary.disabled}>{primary.label}</button>
              {primaryHint && <p className="pco-help" style={{ textAlign: 'center', marginTop: 8 }}>{primaryHint}</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Collects a customer's "on account" balance by card through Paystack, with the
// same confirm-before-recording flow as a card checkout.
function AccountCardModal({ customer, settings, onClose, onSettled }) {
  const card = usePaystackCard({ amount: customer.total, refPrefix: 'ACC', onPaid: (ref) => onSettled(ref) });
  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Card payment</span>
          <button className="pos-icon-btn" onClick={() => { card.cancel(); onClose(); }} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 14 }}>
          <span>{customer.name}</span>
          <span className="pos-mono" style={{ fontWeight: 700 }}>{formatMoney(customer.total, settings.currency)}</span>
        </div>
        <CardPaymentPanel card={card} />
      </div>
    </div>
  );
}

// Prompts a customer to pay off their "on account" balance via M-Pesa —
// same STK push + poll flow as the checkout M-Pesa option, so settling
// an account feels exactly like ringing up a fresh M-Pesa sale.
function AccountMpesaModal({ customer, settings, onClose, onSettled }) {
  const [phone, setPhone] = useState(customer.phone || '');
  const [status, setStatus] = useState('idle'); // idle | sending | waiting | success | failed | timeout
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [txnId, setTxnId] = useState(null);
  const pollTimer = useRef(null);
  // Covers a customer who already sent the money straight to the paybill/
  // till on their own, outside any prompt this app sent — there's no STK
  // callback to reconcile that against, so staff confirm it by hand.
  const [manualMode, setManualMode] = useState(false);
  const [manualReceipt, setManualReceipt] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  const confirmManual = async () => {
    setManualBusy(true);
    await onSettled(manualReceipt.trim() || null);
    setManualBusy(false);
  };

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  useEffect(() => {
    if (status === 'success') onSettled(receipt, txnId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const watchMpesaStatus = (checkoutRequestId) => {
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await supabase.from('mpesa_transactions')
          .select('status, mpesa_receipt, result_desc')
          .eq('checkout_request_id', checkoutRequestId)
          .maybeSingle();
        if (data && data.status !== 'pending') {
          clearInterval(pollTimer.current);
          if (data.status === 'success') {
            setReceipt(data.mpesa_receipt);
            setTxnId(checkoutRequestId);
            setStatus('success');
          } else {
            setError(data.result_desc || 'The customer did not complete the payment.');
            setStatus('failed');
          }
          return;
        }
      } catch (e) { /* keep polling */ }
      if (attempts % 3 === 0) {
        try {
          const { data: queryData } = await invokeFn(MPESA_QUERY_FN, {
            body: { token: sessionToken, checkoutRequestId },
          });
          if (queryData && queryData.status === 'success' && PAYMENT_PROVIDER === 'paystack') {
            clearInterval(pollTimer.current);
            setReceipt(queryData.receipt || null);
            setTxnId(checkoutRequestId);
            setStatus('success');
            return;
          }
          if (queryData && queryData.status === 'failed') {
            clearInterval(pollTimer.current);
            setError(queryData.resultDesc || 'The customer did not complete the payment.');
            setStatus('failed');
            return;
          }
        } catch (e) { /* keep polling */ }
      }
      if (attempts >= 30) { // ~60 seconds
        clearInterval(pollTimer.current);
        setStatus((s) => (s === 'waiting' ? 'timeout' : s));
      }
    }, 2000);
  };

  const sendMpesaRequest = async () => {
    setError('');
    setStatus('sending');
    const saleRef = 'ACC' + Date.now().toString().slice(-8);
    try {
      const { data, error: err } = await invokeFn(MPESA_PUSH_FN, {
        body: { token: sessionToken, phone, amount: customer.total, saleRef },
      });
      if (err || !data || data.error) {
        setStatus('failed');
        setError((data && data.error) || (err && err.message) || 'Could not send the payment request.');
        return;
      }
      setStatus('waiting');
      watchMpesaStatus(data.checkoutRequestId);
    } catch (e) {
      setStatus('failed');
      setError('Could not reach the payment service. Check your connection and try again.');
    }
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 380, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 className="pos-serif" style={{ fontSize: 17, fontWeight: 700 }}>Collect via M-Pesa</h3>
          {status !== 'sending' && status !== 'waiting' && !manualBusy && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {customer.name} · {formatMoney(customer.total, settings.currency)} outstanding
        </p>

        {manualMode ? (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
              Use this if the customer already sent the money straight to your till or paybill on their own — no prompt needed.
            </p>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>M-Pesa receipt code (optional)</label>
            <input value={manualReceipt} onChange={(e) => setManualReceipt(e.target.value)} placeholder="e.g. QFG7H8J2KL" autoCapitalize="characters"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
            <button type="button" onClick={confirmManual} disabled={manualBusy}
              style={{
                marginTop: 14, width: '100%', padding: '11px 0', borderRadius: 8,
                border: 'none', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: 14,
                opacity: manualBusy ? 0.6 : 1
              }}>
              {manualBusy ? 'Saving…' : 'Mark as settled'}
            </button>
            <button type="button" onClick={() => setManualMode(false)} disabled={manualBusy}
              style={{ marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12.5 }}>
              ← Back to sending a prompt
            </button>
          </>
        ) : (
          <>
            {(status === 'idle' || status === 'sending' || status === 'failed') && (
              <>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Customer's M-Pesa number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
                {error && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</p>}
                <button type="button" onClick={sendMpesaRequest} disabled={!phone || status === 'sending'}
                  style={{
                    marginTop: 14, width: '100%', padding: '11px 0', borderRadius: 8,
                    border: 'none', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: 14,
                    opacity: (!phone || status === 'sending') ? 0.6 : 1
                  }}>
                  {status === 'sending' ? 'Sending request…' : error ? 'Try again' : 'Send payment prompt'}
                </button>
              </>
            )}

            {(status === 'waiting' || status === 'timeout') && (
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ width: 34, height: 34, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  {status === 'timeout' ? 'Still waiting — ask the customer to check their phone.' : `A prompt was sent to ${phone}.`}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ask them to enter their M-Pesa PIN to complete the payment.</p>
                {status === 'timeout' && (
                  <button type="button" onClick={sendMpesaRequest} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontSize: 13 }}>
                    Resend request
                  </button>
                )}
              </div>
            )}

            {status !== 'sending' && status !== 'success' && (
              <button type="button" onClick={() => setManualMode(true)} style={{
                marginTop: 14, width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                background: 'none', color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline'
              }}>
                Customer already paid another way
              </button>
            )}
          </>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--pine)' }}>
            <CheckCircle size={24} style={{ marginBottom: 6 }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Payment received{receipt ? ` — ${receipt}` : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptModal({ sale, settings, onClose }) {
  return (
    <div className="pos-modal-backdrop">
      <div className="pos-mono pos-receipt-print" style={{ width: 320, maxWidth: '100%', background: '#fff', borderRadius: 4, padding: '22px 20px', fontSize: 12.5, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <CheckCircle size={28} color="var(--pine)" style={{ marginBottom: 6 }} />
          <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700 }}>{settings.pharmacyName}</div>
          {(settings.address || settings.phone) && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{[settings.address, settings.phone].filter(Boolean).join(' · ')}</div>}
          <div style={{ color: 'var(--muted)' }}>{new Date(sale.timestamp).toLocaleString()}</div>
          <div style={{ color: 'var(--muted)' }}>Cashier: {sale.cashier}</div>
        </div>
        <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '10px 0', margin: '10px 0' }}>
          {sale.items.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{i.qty} x {i.name}</span>
              <span>{formatMoney(i.price * i.qty, settings.currency)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatMoney(sale.subtotal, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>{formatMoney(sale.tax, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, margin: '4px 0' }}><span>Total</span><span>{formatMoney(sale.total, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Paid via</span><span>{sale.paymentMethod}</span></div>
        {sale.paymentMethod === 'cash' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Change</span><span>{formatMoney(sale.change, settings.currency)}</span></div>
        )}
        {sale.paymentMethod === 'mpesa' && sale.mpesaReceipt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>M-Pesa receipt{isManualTillSale(sale) ? ' (paid at till)' : ''}</span><span>{sale.mpesaReceipt}</span></div>
        )}
        {sale.paymentMethod === 'card' && sale.paymentRef && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', gap: 10 }}><span>Card ref</span><span style={{ wordBreak: 'break-all', textAlign: 'right' }}>{sale.paymentRef}</span></div>
        )}
        {sale.paymentMethod === 'account' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Customer</span><span>{sale.customerName}{sale.customerPhone ? ` (${sale.customerPhone})` : ''}</span></div>
            <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--amber)', marginTop: 8 }}>UNPAID — on account</div>
          </>
        )}
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>{settings.receiptFooter || 'Thank you — get well soon'}</div>
        <div className="pos-no-print" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>New sale</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Admin console                                                          */
/* ---------------------------------------------------------------------- */

function AdminConsole({ inventory, sales, staffList, settings, user, onLogout, lastSynced,
  saveInventory, adjustStockBy, saveStaff, saveSettings, inventoryLog, logInventoryChange, voidSale, settleAccountSale }) {
  const [tab, setTab] = useState('dashboard');
  // Lets the dashboard open Inventory already filtered (e.g. "needs
  // reordering", or one product searched). `n` re-mounts the tab so the
  // preset is applied even if Inventory was already the open tab.
  const [invJump, setInvJump] = useState(null);
  const openTab = (key, jump) => { setInvJump(jump ? { ...jump, n: Date.now() } : null); setTab(key); };
  const todayKey = localDateStr(new Date());
  const badges = {
    inventory: inventory.filter((p) => stockState(p) !== 'ok').length,
    accounts: sales.filter((s) => s.paymentMethod === 'account' && !s.voided && !s.settled).length,
    activity: (inventoryLog || []).filter((e) => activityKind(e) === 'void' && localDateStr(new Date(e.timestamp)) === todayKey).length,
  };
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { key: 'inventory', label: 'Inventory', Icon: Package },
    { key: 'activity', label: 'Activity', Icon: Receipt },
    { key: 'sales', label: 'Sales history', Icon: ClipboardList },
    { key: 'accounts', label: 'Accounts', Icon: CreditCard },
    { key: 'staff', label: 'Staff', Icon: Users },
    { key: 'settings', label: 'Settings', Icon: SettingsIcon },
  ];

  return (
    <div className="pos-root" style={{ minHeight: '100vh' }}>
      <style>{buildStyles(settings.theme)}</style>
      <TopBar settings={settings} user={user} onLogout={onLogout} lastSynced={lastSynced} right={null} />
      <div className="pos-admin-layout">
        <div className="pos-admin-nav">
          {navItems.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => openTab(key)} className="pos-admin-nav-btn" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', marginBottom: 4, textAlign: 'left', fontSize: 14,
              background: tab === key ? 'var(--pine)' : 'transparent', color: tab === key ? '#fff' : 'var(--ink)'
            }}><Icon size={16} />{label}
              {badges[key] > 0 && <span title={key === 'inventory' ? 'Low or out of stock' : key === 'accounts' ? 'Unpaid account sales' : 'Voids today'} style={{
                marginLeft: 'auto', minWidth: 18, padding: '1px 6px', borderRadius: 999, fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#fff',
                background: tab === key ? 'rgba(255,255,255,.28)' : (key === 'accounts' ? 'var(--amber)' : 'var(--red)')
              }}>{badges[key]}</span>}
            </button>
          ))}
        </div>
        <div className="pos-admin-content pos-scroll">
          {tab === 'dashboard' && <DashboardTab inventory={inventory} sales={sales} settings={settings} onNavigate={openTab} />}
          {tab === 'inventory' && <InventoryTab key={invJump ? invJump.n : 'inv'} initialFilter={invJump && invJump.filter} initialQuery={invJump && invJump.query} inventory={inventory} settings={settings} saveInventory={saveInventory} adjustStockBy={adjustStockBy} user={user} logInventoryChange={logInventoryChange} />}
          {tab === 'activity' && <ActivityTab inventoryLog={inventoryLog} settings={settings} />}
          {tab === 'sales' && <SalesTab sales={sales} inventory={inventory} settings={settings} voidSale={voidSale} />}
          {tab === 'accounts' && <AccountsTab sales={sales} settings={settings} settleAccountSale={settleAccountSale} />}
          {tab === 'staff' && <StaffTab staffList={staffList} saveStaff={saveStaff} sales={sales} settings={settings} />}
          {tab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, sub, delta, deltaLabel, onClick, title }) {
  const card = (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', height: '100%' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div className="pos-serif" style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--ink)' }}>{value}</div>
      {(sub || delta != null) && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.35 }}>
          {delta != null && <span style={{ fontWeight: 700, color: delta >= 0 ? 'var(--pine)' : 'var(--red)' }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% </span>}
          {delta != null && deltaLabel}{delta != null && sub ? ' · ' : ''}{sub}
        </div>
      )}
    </div>
  );
  // Cards that lead somewhere (low stock → Inventory) become real buttons.
  return onClick ? <button type="button" className="pos-stat-btn" onClick={onClick} title={title}>{card}</button> : card;
}

// Sales ex-VAT minus buying cost. Uses the cost frozen onto each sale line;
// older sales (before buying prices existed) fall back to the product's
// current cost, and lines with no known cost are left out of profit and
// reported through `coverage` so the number is never silently overstated.
function summarizeProfit(list, costById) {
  let sales = 0, profit = 0, known = 0;
  for (const sl of list) {
    for (const i of sl.items || []) {
      const line = i.price * i.qty;
      sales += line;
      const unit = Number(i.cost) > 0 ? Number(i.cost) : (costById.get(i.id) > 0 ? costById.get(i.id) : null);
      if (unit !== null) { profit += line - unit * i.qty; known += line; }
    }
  }
  return { sales, profit, known, margin: known ? (profit / known) * 100 : null, coverage: sales ? known / sales : 1 };
}
const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

// Interactive 7-day revenue chart — tap/click a day to see its totals.
// Plain divs sized by percentage, no charting library needed.
function RevenueTrend({ sales, settings, costById }) {
  const [metric, setMetric] = useState('revenue');
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const daySales = sales.filter((s) => isSameDay(s.timestamp, d) && !s.voided);
      arr.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dateLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
        profit: summarizeProfit(daySales, costById).profit,
        count: daySales.length,
      });
    }
    return arr;
  }, [sales, costById]);

  const [selected, setSelected] = useState(6); // default to today
  const max = Math.max(1, ...days.map((d) => Math.max(0, d[metric])));
  const sel = days[selected];

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Last 7 days</h3>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg)', borderRadius: 7, padding: 2, width: 'fit-content' }}>
            {[['revenue', 'Sales'], ['profit', 'Profit']].map(([k, l]) => (
              <button key={k} onClick={() => setMetric(k)} style={{ padding: '3px 10px', borderRadius: 5, border: 'none', fontSize: 11.5, fontWeight: 600, background: metric === k ? 'var(--pine)' : 'transparent', color: metric === k ? '#fff' : 'var(--muted)' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="pos-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(sel[metric], settings.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sel.count} sale{sel.count !== 1 ? 's' : ''} · {sel.dateLabel}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
        {days.map((d, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', height: '100%', justifyContent: 'flex-end', padding: 0
          }}>
            <div style={{
              width: '100%', maxWidth: 30, borderRadius: 4,
              height: `${Math.max(4, (Math.max(0, d[metric]) / max) * 66)}px`,
              background: i === selected ? 'var(--pine)' : 'var(--pine-pale)',
              transition: 'background .15s, height .2s'
            }} />
            <span style={{ fontSize: 10, color: i === selected ? 'var(--pine)' : 'var(--muted)', fontWeight: i === selected ? 700 : 500 }}>{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Reporting window anchored to calendar boundaries (today / this week from
// Monday / this month), plus the equivalent span just before it, so every
// figure can be compared like-for-like (e.g. Monday-to-now vs last Monday-to-now).
function dashboardWindow(range) {
  const now = new Date();
  let start, prevStart, prevLabel;
  if (range === 'week') {
    start = new Date(now); start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1)); start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7); prevLabel = 'vs last week';
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); prevLabel = 'vs last month';
  } else {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1); prevLabel = 'vs yesterday';
  }
  const prevEnd = new Date(Math.min(prevStart.getTime() + (now - start), start.getTime() - 1));
  return { start, end: now, prevStart, prevEnd, prevLabel };
}

const DASHBOARD_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

// One card of the dashboard's lower half: icon + title + count, a "view all"
// link, the rows, and (when the list was cut short) a "+N more" footer.
function DashPanel({ icon: Icon, tone = 'green', title, count, actionLabel, onAction, moreCount = 0, moreLabel, children }) {
  const t = PILL_TONES[tone] || PILL_TONES.green;
  return (
    <section className="pos-panel">
      <header className="pos-panel-head">
        <span className="pos-panel-icon" style={{ background: t.bg, color: t.color }}><Icon size={15} /></span>
        <h3 className="pos-serif pos-ellipsis" style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title}</h3>
        {count != null && <StatusPill tone={count > 0 ? tone : 'grey'}>{count}</StatusPill>}
        {onAction && <button type="button" className="pos-link-btn" onClick={onAction}>{actionLabel || 'View all'} <ArrowRight size={12} /></button>}
      </header>
      <div className="pos-panel-body pos-scroll">{children}</div>
      {moreCount > 0 && onAction && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="pos-link-btn" onClick={onAction}>+{moreCount} more{moreLabel ? ` ${moreLabel}` : ''} <ArrowRight size={12} /></button>
        </div>
      )}
    </section>
  );
}

const DASH_PANEL_ROWS = 6;

function DashboardTab({ inventory, sales, settings, onNavigate }) {
  const go = (tab, jump) => { if (onNavigate) onNavigate(tab, jump); };
  const [range, setRange] = useState('today');
  const rangeLabel = DASHBOARD_RANGES.find((r) => r.key === range).label;
  const win = dashboardWindow(range);
  const within = (s, from, to) => { const d = new Date(s.timestamp); return d >= from && d <= to; };
  const liveSales = sales.filter((s) => !s.voided);
  const rangeSales = liveSales.filter((s) => within(s, win.start, win.end));
  const prevSales = liveSales.filter((s) => within(s, win.prevStart, win.prevEnd));
  const costById = useMemo(() => new Map(inventory.map((p) => [p.id, p.cost || 0])), [inventory]);
  const revenue = rangeSales.reduce((sum, s) => sum + s.total, 0);
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.total, 0);
  const isUnpaid = (s) => s.paymentMethod === 'account' && !s.settled;
  const unpaidInRange = rangeSales.filter(isUnpaid).reduce((sum, s) => sum + s.total, 0);
  const owedTotal = liveSales.filter(isUnpaid).reduce((sum, s) => sum + s.total, 0);
  const fin = summarizeProfit(rangeSales, costById);
  const prevFin = summarizeProfit(prevSales, costById);
  const stockAtCost = inventory.reduce((sum, p) => sum + p.stock * (p.cost || 0), 0);
  const stockAtRetail = inventory.reduce((sum, p) => sum + p.stock * p.price, 0);
  // Most urgent first: sold out, then the furthest below its reorder level.
  const restockFill = (p) => (p.stock <= 0 ? -1 : p.stock / Math.max(1, p.reorderLevel));
  const lowStock = inventory
    .filter((p) => stockState(p) !== 'ok')
    .sort((a, b) => restockFill(a) - restockFill(b) || a.name.localeCompare(b.name));
  // Oldest expiry first, so anything already past its date leads the list.
  const expiringSoon = inventory
    .filter((p) => expiryState(p) !== null)
    .sort((a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry));
  const expiredNow = expiringSoon.filter((p) => expiryState(p) === 'expired');
  const expiredAtCost = expiredNow.reduce((sum, p) => sum + p.stock * (p.cost || 0), 0);
  const recent = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, DASH_PANEL_ROWS);

  // What's actually moving, for the selected window — the most actionable
  // number for restock decisions, since low-stock alone doesn't say whether
  // a slow mover is worth reordering.
  const topSelling = useMemo(() => {
    const counts = {};
    for (const s of rangeSales) {
      for (const item of s.items || []) {
        if (!counts[item.id]) counts[item.id] = { id: item.id, name: item.name, qty: 0, revenue: 0 };
        counts[item.id].qty += item.qty;
        counts[item.id].revenue += item.price * item.qty;
        const unit = Number(item.cost) > 0 ? Number(item.cost) : (costById.get(item.id) > 0 ? costById.get(item.id) : null);
        if (unit !== null) counts[item.id].profit = (counts[item.id].profit || 0) + (item.price - unit) * item.qty;
      }
    }
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [rangeSales, costById]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>{rangeLabel} at a glance</h2>
        <div style={{ display: 'flex', gap: 4, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
          {DASHBOARD_RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12.5, fontWeight: 600,
              background: range === r.key ? 'var(--pine)' : 'transparent',
              color: range === r.key ? '#fff' : 'var(--muted)'
            }}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="pos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label={`Sales ${range === 'today' ? 'today' : rangeLabel.toLowerCase()}`} value={formatMoney(revenue, settings.currency)}
          delta={pctChange(revenue, prevRevenue)} deltaLabel={win.prevLabel} sub={unpaidInRange > 0 ? `${formatMoney(unpaidInRange, settings.currency)} unpaid on account` : 'incl. VAT'} />
        <StatCard label="Profit" value={fin.known ? formatMoney(fin.profit, settings.currency) : '—'} accent={fin.known ? (fin.profit < 0 ? 'var(--red)' : 'var(--pine)') : undefined}
          delta={fin.known ? pctChange(fin.profit, prevFin.profit) : null} deltaLabel={win.prevLabel}
          sub={!fin.known ? (fin.sales ? 'Add buying prices in Inventory' : 'excl. VAT, after buying cost') : `${fin.margin.toFixed(1)}% margin${fin.coverage < 0.99 ? ` · ${Math.round(fin.coverage * 100)}% of sales have a buying price` : ''}`} />
        <StatCard label={`Transactions ${range === 'today' ? 'today' : rangeLabel.toLowerCase()}`} value={rangeSales.length} delta={pctChange(rangeSales.length, prevSales.length)} deltaLabel={win.prevLabel} />
        <StatCard label="Owed by customers" value={formatMoney(owedTotal, settings.currency)} accent={owedTotal ? 'var(--amber)' : undefined} sub="unpaid account sales, all time"
          onClick={() => go('accounts')} title="Open Accounts" />
        <StatCard label="Stock value" value={formatMoney(stockAtCost, settings.currency)} sub={`at cost · ${formatMoney(stockAtRetail, settings.currency)} at retail · ${inventory.length} products`} />
        <StatCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? 'var(--red)' : undefined}
          sub={lowStock.length ? `${lowStock.filter((p) => stockState(p) === 'out').length} sold out` : undefined}
          onClick={() => go('inventory', { filter: 'reorder' })} title="Show these in Inventory" />
        <StatCard label={`Expiring within ${EXPIRY_WINDOW_DAYS}d`} value={expiringSoon.length} accent={expiringSoon.length ? 'var(--red)' : undefined}
          sub={expiredNow.length ? `${expiredNow.length} already expired` : undefined}
          onClick={() => go('inventory', { filter: 'expiring' })} title="Show these in Inventory" />
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RevenueTrend sales={sales} settings={settings} costById={costById} />
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{rangeLabel}'s payments</h3>
          <PaymentMethodBars sales={rangeSales} settings={settings} />
        </div>
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, alignItems: 'stretch' }}>
        <DashPanel icon={AlertTriangle} tone="amber" title="Needs reordering" count={lowStock.length}
          onAction={() => go('inventory', { filter: 'reorder' })} actionLabel="Inventory"
          moreCount={lowStock.length - DASH_PANEL_ROWS} moreLabel="to reorder">
          {lowStock.length === 0 && <EmptyState icon={CheckCircle} title="All stock levels are healthy" subtitle="Nothing is at or below its reorder level." compact />}
          {lowStock.slice(0, DASH_PANEL_ROWS).map((p) => {
            const out = stockState(p) === 'out';
            const fill = Math.min(100, Math.round((Math.max(0, p.stock) / Math.max(1, p.reorderLevel)) * 100));
            return (
              <button key={p.id} type="button" className="pos-row-btn" title="Open in Inventory to adjust stock" onClick={() => go('inventory', { query: p.name })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pos-ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="pos-ellipsis" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{p.category || 'Uncategorised'} · reorder at {p.reorderLevel}</div>
                </div>
                <span aria-hidden="true" style={{ width: 44, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                  <span style={{ display: 'block', width: `${fill}%`, height: '100%', background: out ? 'var(--red)' : 'var(--amber)' }} />
                </span>
                <StatusPill tone={out ? 'red' : 'amber'} style={{ minWidth: 76, justifyContent: 'center' }}>{out ? 'Out of stock' : `${p.stock} left`}</StatusPill>
              </button>
            );
          })}
        </DashPanel>

        <DashPanel icon={Clock} tone="red" title={`Expiring within ${EXPIRY_WINDOW_DAYS} days`} count={expiringSoon.length}
          onAction={() => go('inventory', { filter: 'expiring' })} actionLabel="Inventory"
          moreCount={expiringSoon.length - DASH_PANEL_ROWS} moreLabel="with expiry alerts">
          {expiringSoon.length === 0 && <EmptyState icon={CheckCircle} title="Nothing in stock is close to expiry" compact />}
          {[
            { key: 'expired', label: `Already expired · ${expiredNow.length}${expiredAtCost > 0 ? ` · ${formatMoney(expiredAtCost, settings.currency)} at cost` : ''}`, color: 'var(--red)' },
            { key: 'soon', label: `Expiring soon · ${expiringSoon.length - expiredNow.length}`, color: PILL_TONES.amber.color },
          ].map((group) => {
            const rows = expiringSoon.slice(0, DASH_PANEL_ROWS).filter((p) => expiryState(p) === group.key);
            if (rows.length === 0) return null;
            return (
              <React.Fragment key={group.key}>
                <div className="pos-panel-sub" style={{ color: group.color }}>{group.label}</div>
                {rows.map((p) => {
                  const days = daysUntilExpiry(p.expiry);
                  return (
                    <button key={p.id} type="button" className="pos-row-btn" title="Open in Inventory" onClick={() => go('inventory', { query: p.name })}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pos-ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="pos-ellipsis" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{p.stock} in stock · {formatShortDate(p.expiry)}</div>
                      </div>
                      <StatusPill tone={days < 0 ? 'red' : 'amber'}>{days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `in ${days}d`}</StatusPill>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </DashPanel>

        <DashPanel icon={TrendingUp} tone="green" title={`Top sellers · ${rangeLabel.toLowerCase()}`}
          onAction={() => go('sales')} actionLabel="Sales history">
          {topSelling.length === 0 && <EmptyState icon={TrendingUp} title="No sales in this period yet" subtitle="Your best sellers will show up here." compact />}
          {topSelling.slice(0, DASH_PANEL_ROWS).map((item, i) => (
            <button key={item.id} type="button" className="pos-row-btn" title="Open in Inventory" onClick={() => go('inventory', { query: item.name })}>
              <span aria-hidden="true" className="pos-mono" style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 600, background: i === 0 ? 'var(--pine)' : 'var(--pine-pale)', color: i === 0 ? '#fff' : 'var(--pine)'
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pos-ellipsis" style={{ fontWeight: 600 }}>{item.name}</div>
                <div aria-hidden="true" style={{ height: 4, borderRadius: 2, background: 'var(--bg)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(4, (item.qty / topSelling[0].qty) * 100)}%`, height: '100%', background: 'var(--pine-light)', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="pos-mono" style={{ fontWeight: 600 }}>{item.qty} sold</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                  {formatMoney(item.revenue, settings.currency)}{item.profit != null ? ` · ${formatMoney(item.profit, settings.currency)} profit` : ''}
                </div>
              </div>
            </button>
          ))}
        </DashPanel>

        <DashPanel icon={Receipt} tone="green" title="Recent transactions" onAction={() => go('sales')} actionLabel="View all">
          {recent.length === 0 && <EmptyState icon={Receipt} title="No sales recorded yet" subtitle="Each sale appears here as it's rung up." compact />}
          {recent.map((s) => {
            const meta = PAYMENT_METHOD_META[s.paymentMethod] || { label: s.paymentMethod || 'Sale', Icon: Receipt };
            const units = (s.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
            const unpaid = s.paymentMethod === 'account' && !s.settled && !s.voided;
            return (
              <div key={s.id} className="pos-row" style={{ opacity: s.voided ? 0.6 : 1 }}>
                <span aria-hidden="true" style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--pine-pale)', color: 'var(--pine)'
                }}><meta.Icon size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pos-ellipsis" style={{ fontWeight: 600, textDecoration: s.voided ? 'line-through' : 'none' }}>
                    {s.cashier || 'Unknown'}{s.customerName ? ` → ${s.customerName}` : ''}
                  </div>
                  <div className="pos-ellipsis" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                    {units > 0 ? `${units} item${units !== 1 ? 's' : ''} · ` : ''}{meta.label} · {formatWhen(s.timestamp)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="pos-mono" style={{ fontWeight: 600, textDecoration: s.voided ? 'line-through' : 'none' }}>{formatMoney(s.total, settings.currency)}</div>
                  {s.voided && <StatusPill tone="grey" style={{ marginTop: 3 }}>Voided</StatusPill>}
                  {unpaid && <StatusPill tone="amber" style={{ marginTop: 3 }}>Unpaid</StatusPill>}
                </div>
              </div>
            );
          })}
        </DashPanel>
      </div>
    </div>
  );
}

const emptyProduct = { name: '', category: '', sku: '', cost: '', price: '', stock: '', reorderLevel: '', expiry: '', requiresRx: false };

// Builds a short, human-readable summary of what changed between two
// versions of a product — e.g. "Stock 40 → 60, Price KSh180 → KSh190".
// Only reports fields that actually changed, so a name-only edit doesn't
// show a wall of unchanged numbers.
const productSnap = (p) => ({ name: p.name, price: Number(p.price), stock: Number(p.stock) });

function summarizeProductChange(before, after, settings) {
  const parts = [];
  if (before.name !== after.name) parts.push(`Name "${before.name}" → "${after.name}"`);
  if (Number(before.price) !== Number(after.price)) parts.push(`Price ${formatMoney(before.price, settings.currency)} → ${formatMoney(after.price, settings.currency)}`);
  if (Number(before.stock) !== Number(after.stock)) parts.push(`Stock ${before.stock} → ${after.stock}`);
  if (Number(before.reorderLevel) !== Number(after.reorderLevel)) parts.push(`Reorder level ${before.reorderLevel} → ${after.reorderLevel}`);
  if (before.expiry !== after.expiry) parts.push(`Expiry ${before.expiry || '—'} → ${after.expiry || '—'}`);
  if (before.category !== after.category) parts.push(`Category ${before.category} → ${after.category}`);
  if (before.sku !== after.sku) parts.push(`SKU ${before.sku} → ${after.sku}`);
  if (!!before.requiresRx !== !!after.requiresRx) parts.push(after.requiresRx ? 'Marked as Rx' : 'Unmarked as Rx');
  return parts.length ? parts.join(', ') : 'No field changes';
}

// Small reusable "are you sure?" dialog for destructive actions (deleting a
// product, removing a staff member, etc.) — mirrors the confirm-and-reason
// pattern already used for voiding a sale, just without the reason field.
function ConfirmModal({ title, message, confirmLabel = 'Delete', busyLabel = 'Removing…', onConfirm, onCancel, busy, error }) {
  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 340, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 22 }}>
        <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: error ? 10 : 18, lineHeight: 1.4 }}>{message}</p>
        {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} disabled={busy} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Inventory tab                                                           */
/* ---------------------------------------------------------------------- */

const INV_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'reorder', label: 'Needs reorder', warn: true },
  { key: 'out', label: 'Out of stock', warn: true },
  { key: 'expiring', label: 'Expiring', warn: true },
];
const INV_SORTS = [
  ['', 'Default order'], ['name', 'Name'], ['category', 'Category'], ['stock', 'Stock'],
  ['price', 'Price'], ['expiry', 'Expiry'], ['sku', 'SKU'],
];
const INV_PAGE = 60;
const INV_GRID = '28px minmax(180px, 2.4fr) minmax(96px, 0.8fr) minmax(104px, 0.9fr) 172px 96px 120px 96px';

function matchesInvFilter(p, key) {
  if (key === 'reorder') return stockState(p) !== 'ok';
  if (key === 'out') return stockState(p) === 'out';
  if (key === 'expiring') return expiryState(p) !== null;
  return true;
}

// With no column chosen, the list is ordered by what the current filter is
// about: emptiest first for restocking, soonest-expired first for expiry.
function defaultInvCompare(filter) {
  const fill = (p) => (p.stock <= 0 ? -1 : p.stock / Math.max(1, p.reorderLevel));
  if (filter === 'reorder' || filter === 'out') return (a, b) => fill(a) - fill(b) || a.name.localeCompare(b.name);
  if (filter === 'expiring') return (a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry);
  return null;
}

function InvSortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <button type="button" onClick={() => onSort(sortKey)} style={{
      background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 3,
      fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
      color: active ? 'var(--ink)' : 'var(--muted)', fontWeight: active ? 700 : 500
    }}>
      {label}
      {active && <span style={{ fontSize: 9 }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );
}

// − [ n ] + with ✓ / ✕ once the number differs from what's saved. Defined at
// module level on purpose: an input declared inside a component that
// re-renders would be re-created on every keystroke and lose focus.
function StockStepper({ product: p, draft, busy, onBump, onType, onCommit, onCancel }) {
  const stock = Number(p.stock) || 0;
  const hasDraft = draft !== undefined;
  const parsed = hasDraft ? parseInt(draft, 10) : stock;
  const valid = !Number.isNaN(parsed) && parsed >= 0;
  const dirty = hasDraft && (!valid || parsed !== stock);
  const canSave = hasDraft && valid && parsed !== stock;
  const preview = stockState({ ...p, stock: valid ? parsed : stock });
  const tint = preview === 'out' ? 'var(--red)' : preview === 'low' ? PILL_TONES.amber.color : 'var(--ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className={`pos-stepper${dirty ? ' dirty' : ''}`}>
        <button type="button" aria-label={`Remove one from ${p.name}`} disabled={busy || (valid && parsed <= 0)} onClick={() => onBump(-1)}><Minus size={13} /></button>
        <input inputMode="numeric" aria-label={`Stock of ${p.name}`} title={`Reorder at ${p.reorderLevel}. Type a number, then press Enter to save.`}
          value={hasDraft ? draft : String(stock)} disabled={busy} style={{ color: tint }}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onType(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            else if (e.key === 'Escape') onCancel();
            else if (e.key === 'ArrowUp') { e.preventDefault(); onBump(1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); onBump(-1); }
          }} />
        <button type="button" aria-label={`Add one to ${p.name}`} disabled={busy} onClick={() => onBump(1)}><Plus size={13} /></button>
      </div>
      {dirty && (
        <>
          <button type="button" className="pos-mini-btn ok" title="Save new stock" aria-label="Save new stock" disabled={busy || !canSave} onClick={onCommit}><Check size={14} /></button>
          <button type="button" className="pos-mini-btn" title="Undo" aria-label="Undo stock change" disabled={busy} onClick={onCancel}><X size={14} /></button>
        </>
      )}
    </div>
  );
}

function InvStatusPill({ p }) {
  const s = stockState(p);
  if (s === 'out') return <StatusPill tone="red">Out of stock</StatusPill>;
  if (s === 'low') return <StatusPill tone="amber" title={`At or below the reorder level of ${p.reorderLevel}`}>Low stock</StatusPill>;
  return <StatusPill tone="green">In stock</StatusPill>;
}

function InvExpiry({ p }) {
  const state = expiryState(p);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: state ? 'var(--ink)' : 'var(--muted)', fontWeight: state ? 600 : 400 }}>{formatShortDate(p.expiry)}</div>
      {state && <StatusPill tone={state === 'expired' ? 'red' : 'amber'} style={{ marginTop: 3 }}>{expiryLabel(daysUntilExpiry(p.expiry))}</StatusPill>}
    </div>
  );
}

function InvNameCell({ p }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span className="pos-ellipsis" title={p.name} style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
        {p.requiresRx && <StatusPill tone="green" title="Prescription only" style={{ padding: '0 6px', fontSize: 10.5 }}>Rx</StatusPill>}
      </div>
      <div className="pos-ellipsis" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
        {p.category || 'Uncategorised'}{p.sku ? <> · <span className="pos-mono">{p.sku}</span></> : null}
      </div>
    </div>
  );
}

function InvPrice({ p, settings, align }) {
  const margin = p.cost > 0 && p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : null;
  return (
    <div style={{ textAlign: align || 'left' }}>
      <div className="pos-mono" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatMoney(p.price, settings.currency)}</div>
      {margin !== null && <div style={{ fontSize: 11, marginTop: 1, color: margin < 0 ? 'var(--red)' : 'var(--muted)' }} title={`Buying price ${formatMoney(p.cost, settings.currency)}`}>{margin}% margin</div>}
    </div>
  );
}

function InventoryTab({ inventory, settings, saveInventory, adjustStockBy, user, logInventoryChange, initialFilter, initialQuery }) {
  const isCompact = useMediaQuery('(max-width: 860px)');
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = new, obj = edit
  const [drugInfoProduct, setDrugInfoProduct] = useState(null);
  const [query, setQuery] = useState(initialQuery || '');
  const [statusFilter, setStatusFilter] = useState(INV_FILTERS.some((f) => f.key === initialFilter) ? initialFilter : 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rxOnly, setRxOnly] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [drafts, setDrafts] = useState({}); // product id -> typed stock number, until saved or undone
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'error', text }
  const [shown, setShown] = useState(INV_PAGE);

  useEffect(() => { setShown(INV_PAGE); }, [query, statusFilter, categoryFilter, rxOnly, sort.key, sort.dir]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), notice.kind === 'error' ? 9000 : 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    let reorder = 0, out = 0, expiring = 0;
    for (const p of inventory) {
      const s = stockState(p);
      if (s !== 'ok') reorder++;
      if (s === 'out') out++;
      if (expiryState(p)) expiring++;
    }
    return { all: inventory.length, reorder, out, expiring };
  }, [inventory]);

  const categories = useMemo(
    () => Array.from(new Set(inventory.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [inventory]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((p) => {
      if (q && !`${p.name} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (rxOnly && !p.requiresRx) return false;
      return matchesInvFilter(p, statusFilter);
    });
  }, [inventory, query, statusFilter, categoryFilter, rxOnly]);

  const sorted = useMemo(() => {
    if (!sort.key) {
      const byFilter = defaultInvCompare(statusFilter);
      return byFilter ? [...filtered].sort(byFilter) : filtered;
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === 'expiry') {
        const ae = a.expiry ? new Date(a.expiry).getTime() : NaN;
        const be = b.expiry ? new Date(b.expiry).getTime() : NaN;
        if (Number.isNaN(ae) || Number.isNaN(be)) return Number.isNaN(ae) === Number.isNaN(be) ? 0 : Number.isNaN(ae) ? 1 : -1; // undated always last
        return (ae - be) * dir;
      }
      if (sort.key === 'price' || sort.key === 'cost' || sort.key === 'stock') return ((Number(a[sort.key]) || 0) - (Number(b[sort.key]) || 0)) * dir;
      return String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [filtered, sort, statusFilter]);

  const visible = sorted.slice(0, shown);
  const filtersActive = query.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || rxOnly;
  const clearFilters = () => { setQuery(''); setStatusFilter('all'); setCategoryFilter('all'); setRxOnly(false); };

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  // Saves, and — unlike before — says so when the server refuses (a clashing
  // SKU, say). saveInventory has already put the old values back by then.
  const persist = async (next, failPrefix) => {
    let res;
    try { res = await saveInventory(next); } catch (e) { res = { ok: false, errors: [e && e.message] }; }
    if (res && res.ok === false) {
      setNotice({ kind: 'error', text: `${failPrefix} ${(res.errors && res.errors[0]) || 'The change was refused and has been undone.'}` });
      return false;
    }
    return true;
  };

  const upsert = async (product) => {
    setModalProduct(null);
    if (product.id) {
      const before = inventory.find((p) => p.id === product.id);
      // Stock typed into the form is applied as a +/- change (atomic on the
      // server); the rest of the form is saved with stock left untouched.
      const stockDelta = before && adjustStockBy ? (Number(product.stock) || 0) - (Number(before.stock) || 0) : 0;
      const toSave = stockDelta !== 0 ? { ...product, stock: before.stock } : product;
      const ok = await persist(inventory.map((p) => (p.id === product.id ? toSave : p)), `Couldn't save "${product.name}".`);
      if (ok && stockDelta !== 0) {
        const r = await adjustStockBy(product.id, stockDelta);
        if (!r.ok) setNotice({ kind: 'error', text: `Saved "${product.name}", but the stock change wasn't applied. ${r.message || ''}` });
      }
      if (ok && logInventoryChange && before) {
        logInventoryChange({
          action: 'edit',
          productName: product.name,
          sku: product.sku,
          detail: [summarizeProductChange(before, product, settings), Number(before.cost || 0) !== Number(product.cost || 0) ? 'Buying price updated' : ''].filter(Boolean).join(', '),
          before: productSnap(before), after: productSnap(product), refId: product.id,
        });
      }
    } else {
      const created = { ...product, id: genId('p') };
      const ok = await persist([...inventory, created], `Couldn't add "${product.name}".`);
      if (ok && logInventoryChange) {
        logInventoryChange({
          action: 'add',
          productName: created.name,
          sku: created.sku,
          detail: `Added with ${created.stock} in stock at ${formatMoney(created.price, settings.currency)}`,
          after: productSnap(created), refId: created.id,
        });
      }
    }
  };

  const remove = async (id) => {
    const product = inventory.find((p) => p.id === id);
    setSelectedIds((s) => { const next = new Set(s); next.delete(id); return next; });
    const ok = await persist(inventory.filter((p) => p.id !== id), `Couldn't delete "${product ? product.name : 'that product'}".`);
    if (ok && logInventoryChange && product) {
      logInventoryChange({
        action: 'delete',
        productName: product.name,
        sku: product.sku,
        detail: `Removed (had ${product.stock} in stock)`,
        before: productSnap(product), refId: product.id,
      });
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = sorted.length > 0 && sorted.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (allVisibleSelected) sorted.forEach((p) => next.delete(p.id));
      else sorted.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const applyBulkEdit = async (updatedProducts, detailLabel) => {
    const byId = new Map(updatedProducts.map((p) => [p.id, p]));
    setSelectedIds(new Set());
    setBulkModalOpen(false);
    const ok = await persist(inventory.map((p) => (byId.has(p.id) ? byId.get(p.id) : p)), 'Bulk edit failed.');
    if (ok && logInventoryChange) {
      logInventoryChange({
        action: 'bulk',
        productName: `${updatedProducts.length} product${updatedProducts.length !== 1 ? 's' : ''}`,
        sku: '',
        detail: detailLabel,
      });
    }
  };

  /* Quick stock adjust: − / + / type a number, then ✓ (or Enter). One save and
     one activity-log entry per change, however many times − or + was tapped. */
  const bumpStock = (p, delta) => setDrafts((d) => {
    const typed = d[p.id] !== undefined ? parseInt(d[p.id], 10) : NaN;
    const base = Number.isNaN(typed) ? (Number(p.stock) || 0) : typed;
    const next = Math.max(0, base + delta);
    const nd = { ...d };
    if (next === (Number(p.stock) || 0)) delete nd[p.id]; else nd[p.id] = String(next);
    return nd;
  });
  const typeStock = (p, value) => setDrafts((d) => {
    const nd = { ...d };
    if (value === String(Number(p.stock) || 0)) delete nd[p.id]; else nd[p.id] = value;
    return nd;
  });
  const cancelStock = (p) => setDrafts((d) => { const nd = { ...d }; delete nd[p.id]; return nd; });
  const commitStock = async (p) => {
    const next = parseInt(drafts[p.id], 10);
    const current = inventory.find((x) => x.id === p.id) || p;
    if (Number.isNaN(next) || next < 0 || next === Number(current.stock)) return;
    const before = productSnap(current);
    const delta = next - (Number(current.stock) || 0);
    setBusyIds((s) => new Set(s).add(p.id));
    // Relative change, applied atomically on the server (see adjustStockBy).
    const res = adjustStockBy
      ? await adjustStockBy(p.id, delta)
      : { ok: await persist(inventory.map((x) => (x.id === p.id ? { ...current, stock: next } : x)), `Couldn't update stock for "${p.name}".`), newStock: next };
    setBusyIds((s) => { const n = new Set(s); n.delete(p.id); return n; });
    cancelStock(p);
    if (!res.ok) {
      if (res.message) setNotice({ kind: 'error', text: `Couldn't update stock for "${p.name}". ${res.message}` });
      return;
    }
    const finalStock = Number.isFinite(res.newStock) ? res.newStock : next;
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    setNotice({ kind: 'ok', text: `${p.name}: stock ${before.stock} → ${finalStock}${finalStock !== next ? ' (a sale landed meanwhile)' : ''}` });
    if (logInventoryChange) {
      logInventoryChange({
        action: 'edit',
        productName: p.name,
        sku: p.sku,
        detail: `Stock ${before.stock} → ${finalStock} (quick adjust ${sign})`,
        before, after: productSnap({ ...current, stock: finalStock }), refId: p.id,
      });
    }
  };

  const stepperFor = (p) => (
    <StockStepper product={p} draft={drafts[p.id]} busy={busyIds.has(p.id)}
      onBump={(d) => bumpStock(p, d)} onType={(v) => typeStock(p, v)} onCommit={() => commitStock(p)} onCancel={() => cancelStock(p)} />
  );
  const actionsFor = (p) => (
    <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
      <button className="pos-icon-btn" onClick={() => setDrugInfoProduct(p)} title="AI dosage / side effects / interactions lookup" aria-label={`Drug info for ${p.name}`} style={{ color: 'var(--pine)' }}><Info size={14} /></button>
      <button className="pos-icon-btn" onClick={() => setModalProduct(p)} title="Edit product" aria-label={`Edit ${p.name}`} style={{ color: 'var(--muted)' }}><Edit2 size={14} /></button>
      <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => setConfirmDeleteId(p.id)} title="Delete product" aria-label={`Delete ${p.name}`} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
    </span>
  );

  const subtitleParts = [`${inventory.length} product${inventory.length !== 1 ? 's' : ''}`];
  if (counts.reorder) subtitleParts.push(`${counts.reorder} need restocking`);
  if (counts.expiring) subtitleParts.push(`${counts.expiring} with expiry alerts`);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={subtitleParts.join(' · ')}
        right={
          <button onClick={() => setModalProduct({ ...emptyProduct })} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Plus size={14} /> Add product
          </button>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input className="pos-field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or category"
            style={{ width: '100%', paddingLeft: 32, paddingRight: query ? 34 : 10 }} />
          {query && (
            <button className="pos-icon-btn" onClick={() => setQuery('')} title="Clear search" aria-label="Clear search"
              style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><X size={13} /></button>
          )}
        </div>
        <select className="pos-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" style={{ flex: '1 1 140px', minWidth: 0, maxWidth: isCompact ? 'none' : 200 }}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '1 1 160px', minWidth: 0, maxWidth: isCompact ? 'none' : 230 }}>
          <select className="pos-field" value={sort.key || ''} aria-label="Sort by" style={{ flex: 1, minWidth: 0 }}
            onChange={(e) => setSort((s) => ({ key: e.target.value || null, dir: s.dir }))}>
            {INV_SORTS.map(([k, l]) => <option key={k} value={k}>{k ? `Sort: ${l}` : 'Sort: default'}</option>)}
          </select>
          <button type="button" className="pos-mini-btn" disabled={!sort.key} style={{ width: 36, height: 36 }}
            title={sort.dir === 'asc' ? 'Ascending — tap for descending' : 'Descending — tap for ascending'}
            onClick={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}>
            {sort.dir === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <div className="pos-chip-row" style={{ marginBottom: 14, alignItems: 'center' }}>
        {INV_FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={statusFilter === f.key} className={`pos-chip${statusFilter === f.key ? ' on' : ''}`} onClick={() => setStatusFilter(f.key)}>
            {f.label}<span className={`pos-chip-n${f.warn && counts[f.key] > 0 ? ' warn' : ''}`}>{counts[f.key]}</span>
          </button>
        ))}
        <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '2px 2px', flexShrink: 0 }} />
        <button type="button" aria-pressed={rxOnly} className={`pos-chip${rxOnly ? ' on' : ''}`} onClick={() => setRxOnly((v) => !v)}>Rx only</button>
        {filtersActive && <button type="button" className="pos-link-btn" onClick={clearFilters} style={{ flexShrink: 0 }}>Clear filters</button>}
      </div>

      {selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12,
          background: 'var(--pine-pale)', border: '1px solid var(--pine)', borderRadius: 10, padding: '8px 12px'
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--pine)', fontWeight: 700 }}>{selectedIds.size} selected</span>
          <button onClick={() => setBulkModalOpen(true)} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 600 }}>Bulk edit</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', color: 'var(--pine)', fontSize: 12.5, textDecoration: 'underline' }}>Clear selection</button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <EmptyState icon={Package}
            title={inventory.length === 0 ? 'No products yet' : 'No products match these filters'}
            subtitle={inventory.length === 0 ? 'Add your first product to start tracking stock.' : 'Try a different search, or clear the filters.'} />
          {filtersActive && inventory.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 22 }}>
              <button type="button" className="pos-chip" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>
      ) : isCompact ? (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)', margin: '0 2px 10px' }}>
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} style={{ width: 18, height: 18 }} /> Select all {sorted.length}
          </label>
          {visible.map((p) => (
            <div key={p.id} className="pos-inv-card" style={{ background: selectedIds.has(p.id) ? 'var(--pine-pale)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelected(p.id)} aria-label={`Select ${p.name}`} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}><InvNameCell p={p} /></div>
                <InvStatusPill p={p} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                {stepperFor(p)}
                <InvPrice p={p} settings={settings} align="right" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                <InvExpiry p={p} />
                {actionsFor(p)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pos-table-scroll" style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ minWidth: 990 }}>
            <div style={{ display: 'grid', gridTemplateColumns: INV_GRID, columnGap: 10, padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all" />
              <InvSortHeader label="Product" sortKey="name" sort={sort} onSort={toggleSort} />
              <InvSortHeader label="Cost" sortKey="cost" sort={sort} onSort={toggleSort} />
              <InvSortHeader label="Price" sortKey="price" sort={sort} onSort={toggleSort} />
              <InvSortHeader label="Stock" sortKey="stock" sort={sort} onSort={toggleSort} />
              <span>Status</span>
              <InvSortHeader label="Expiry" sortKey="expiry" sort={sort} onSort={toggleSort} />
              <span></span>
            </div>
            {visible.map((p) => (
              <div key={p.id} className="pos-inv-row" style={{
                display: 'grid', gridTemplateColumns: INV_GRID, columnGap: 10, padding: '10px 16px', fontSize: 13,
                borderBottom: '1px solid var(--border)', alignItems: 'center',
                background: selectedIds.has(p.id) ? 'var(--pine-pale)' : undefined
              }}>
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelected(p.id)} aria-label={`Select ${p.name}`} />
                <InvNameCell p={p} />
                <span className="pos-mono" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }} title={p.cost > 0 ? '' : 'No buying price set'}>{p.cost > 0 ? formatMoney(p.cost, settings.currency) : '—'}</span>
                <InvPrice p={p} settings={settings} />
                {stepperFor(p)}
                <span><InvStatusPill p={p} /></span>
                <InvExpiry p={p} />
                {actionsFor(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 2px', fontSize: 12.5, color: 'var(--muted)' }}>
          <span>Showing {visible.length} of {sorted.length}{sorted.length !== inventory.length ? ` (filtered from ${inventory.length})` : ''}</span>
          {sorted.length > visible.length && (
            <button type="button" className="pos-chip" onClick={() => setShown((n) => n + INV_PAGE)}>Show {Math.min(INV_PAGE, sorted.length - visible.length)} more</button>
          )}
        </div>
      )}

      {notice && (
        <div role={notice.kind === 'error' ? 'alert' : 'status'} style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 96, maxWidth: '92vw',
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: notice.kind === 'error' ? 'var(--red)' : 'var(--ink)', color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
        }}>
          {notice.kind === 'error' ? <AlertTriangle size={15} style={{ flexShrink: 0 }} /> : <CheckCircle size={15} style={{ flexShrink: 0 }} />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#fff', padding: 2, display: 'inline-flex', opacity: 0.8 }}><X size={14} /></button>
        </div>
      )}

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onSave={upsert} />}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
      {bulkModalOpen && (
        <BulkEditModal
          products={inventory.filter((p) => selectedIds.has(p.id))}
          categories={categories}
          settings={settings}
          onApply={applyBulkEdit}
          onClose={() => setBulkModalOpen(false)}
        />
      )}
      {confirmDeleteId && (() => {
        const p = inventory.find((x) => x.id === confirmDeleteId);
        if (!p) return null;
        return (
          <ConfirmModal
            title="Delete this product?"
            message={`"${p.name}" (${p.sku}) will be removed from inventory${p.stock > 0 ? `, along with the ${p.stock} units currently on record` : ''}. This can't be undone.`}
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => { remove(p.id); setConfirmDeleteId(null); }}
          />
        );
      })()}
    </div>
  );
}

// Applies a price change or category assignment to every selected product
// at once. Two independent sections — a cashier/admin can use either (or
// both, one after another) without leaving the dialog.
function BulkEditModal({ products, categories, settings, onApply, onClose }) {
  const [priceMode, setPriceMode] = useState('percent'); // percent | amount | set
  const [priceSign, setPriceSign] = useState('increase'); // increase | decrease
  const [priceValue, setPriceValue] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const priceValNum = parseFloat(priceValue);
  const priceValid = !isNaN(priceValNum) && priceValNum >= 0;

  const applyPrice = () => {
    if (!priceValid) return;
    const updated = products.map((p) => {
      let price = p.price;
      if (priceMode === 'set') price = priceValNum;
      else if (priceMode === 'amount') price = priceSign === 'increase' ? p.price + priceValNum : p.price - priceValNum;
      else price = priceSign === 'increase' ? p.price * (1 + priceValNum / 100) : p.price * (1 - priceValNum / 100);
      return { ...p, price: Math.max(0, Math.round(price * 100) / 100) };
    });
    const label = priceMode === 'set'
      ? `Price set to ${formatMoney(priceValNum, settings.currency)}`
      : `Price ${priceSign === 'increase' ? 'increased' : 'decreased'} by ${priceMode === 'percent' ? priceValNum + '%' : formatMoney(priceValNum, settings.currency)}`;
    onApply(updated, label);
  };

  const applyCategory = () => {
    if (!newCategory.trim()) return;
    const updated = products.map((p) => ({ ...p, category: newCategory.trim() }));
    onApply(updated, `Category set to "${newCategory.trim()}"`);
  };

  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }} className="pos-scroll">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="pos-serif" style={{ fontSize: 17, fontWeight: 700 }}>Bulk edit</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18 }}>
          Applies to {products.length} selected product{products.length !== 1 ? 's' : ''}: {products.slice(0, 4).map((p) => p.name).join(', ')}{products.length > 4 ? `, +${products.length - 4} more` : ''}.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="pos-serif" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Adjust price</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[{ k: 'percent', label: 'By %' }, { k: 'amount', label: `By ${settings.currency}` }, { k: 'set', label: 'Set exact' }].map((m) => (
              <button key={m.k} onClick={() => setPriceMode(m.k)} style={{
                padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: priceMode === m.k ? '1px solid var(--pine)' : '1px solid var(--border)',
                background: priceMode === m.k ? 'var(--pine-pale)' : '#fff', color: priceMode === m.k ? 'var(--pine)' : 'var(--ink)'
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {priceMode !== 'set' && (
              <select value={priceSign} onChange={(e) => setPriceSign(e.target.value)} style={{ padding: '9px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            )}
            <input type="number" min="0" value={priceValue} onChange={(e) => setPriceValue(e.target.value)}
              placeholder={priceMode === 'percent' ? 'e.g. 10' : priceMode === 'set' ? 'New price' : 'Amount'}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
            <button onClick={applyPrice} disabled={!priceValid} style={{
              padding: '9px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: priceValid ? 'var(--pine)' : '#B9C4B4', color: '#fff'
            }}>Apply</button>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div className="pos-serif" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Set category</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input list="pos-bulk-category-list" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
            <datalist id="pos-bulk-category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <button onClick={applyCategory} disabled={!newCategory.trim()} style={{
              padding: '9px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: newCategory.trim() ? 'var(--pine)' : '#B9C4B4', color: '#fff'
            }}>Apply</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Type an existing category or a new one — it'll be created if it doesn't exist yet.</p>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ ...product });
  const [scannerOpen, setScannerOpen] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name && form.category && form.sku && form.price !== '' && form.stock !== '';

  // Any barcode scanned while this modal is open — hardware scanner or
  // camera — fills the SKU field directly rather than acting on the cart,
  // since there's no cart context here.
  useBarcodeScanner((code) => set('sku', code), !scannerOpen);

  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }} className="pos-scroll">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 17, fontWeight: 700 }}>{product.id ? 'Edit product' : 'Add product'}</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        {[
          ['name', 'Product name', 'text'], ['category', 'Category', 'text'],
        ].map(([key, label, type]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, type === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>SKU / barcode</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
            <input type="text" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Type it, or scan it"
              style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
            <button type="button" onClick={() => setScannerOpen(true)} title="Scan barcode with camera" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, borderRadius: 8,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--pine)', flexShrink: 0
            }}>
              <Camera size={15} />
            </button>
          </div>
        </div>
        {[
          ['cost', 'Buying price (cost per unit)', 'number'], ['price', 'Selling price', 'number'], ['stock', 'Stock quantity', 'number'], ['reorderLevel', 'Reorder level', 'number'], ['expiry', 'Expiry date', 'date'],
        ].map(([key, label, type]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, type === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={form.requiresRx} onChange={(e) => set('requiresRx', e.target.checked)} /> Requires a prescription
        </label>
        <button disabled={!valid} onClick={() => onSave({ ...form, cost: parseFloat(form.cost) || 0, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, reorderLevel: parseInt(form.reorderLevel) || 0 })}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: valid ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600 }}>
          Save product
        </button>
      </div>
      {scannerOpen && (
        <BarcodeScannerModal
          onDetect={(code) => { set('sku', code); setScannerOpen(false); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Activity tab                                                           */
/* ---------------------------------------------------------------------- */

// Each kind of event gets its own icon, colour and label. "price" is not a
// stored action — it's an 'edit' whose price changed, pulled out because
// price changes are the edits an admin most wants to spot.
const ACTIVITY_KIND_META = {
  add:    { label: 'Added',        color: 'var(--pine)',  bg: 'var(--pine-pale)', Icon: Plus,          loud: false },
  edit:   { label: 'Edited',       color: 'var(--amber)', bg: 'var(--amber-pale)', Icon: Edit2,        loud: false },
  price:  { label: 'Price change', color: 'var(--amber)', bg: 'var(--amber-pale)', Icon: TrendingUp,   loud: true },
  delete: { label: 'Deleted',      color: 'var(--red)',   bg: 'var(--red-pale)',  Icon: Trash2,        loud: true },
  bulk:   { label: 'Bulk edit',    color: 'var(--pine)',  bg: 'var(--pine-pale)', Icon: Package,       loud: false },
  void:   { label: 'Sale voided',  color: 'var(--red)',   bg: 'var(--red-pale)',  Icon: X,             loud: true },
  settle: { label: 'Account paid', color: 'var(--pine)',  bg: 'var(--pine-pale)', Icon: CheckCircle,   loud: false },
  reject: { label: 'Not saved',    color: 'var(--red)',   bg: 'var(--red-pale)',  Icon: AlertTriangle, loud: true },
  till:   { label: 'Paid at till', color: 'var(--amber)', bg: 'var(--amber-pale)', Icon: Smartphone,   loud: true },
};
// Kept for any older code that still refers to it.
const ACTIVITY_ACTION_META = ACTIVITY_KIND_META;

function activityKind(e) {
  if (e.action === 'edit') {
    const priceChanged = e.before && e.after
      ? Number(e.before.price) !== Number(e.after.price)
      : /(^|, )Price /.test(e.detail || ''); // older entries only have the text
    if (priceChanged) return 'price';
  }
  return ACTIVITY_KIND_META[e.action] ? e.action : 'edit';
}

function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function activityDayLabel(dateStr) {
  const today = localDateStr(new Date());
  const yest = localDateStr(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yest) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 45) return 'just now';
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)} h ago`;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initialsOf(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function exportActivityCsv(list, settings) {
  const header = ['Date/Time', 'Staff', 'Type', 'Subject', 'SKU', 'Detail', 'Amount'];
  const rows = list.map((e) => [
    new Date(e.timestamp).toLocaleString(),
    e.staffName,
    ACTIVITY_KIND_META[activityKind(e)].label,
    e.productName,
    e.sku || '',
    e.detail || '',
    e.amount != null ? Number(e.amount).toFixed(2) : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DiffChip({ label, from, to, down }) {
  return (
    <span className="pos-mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '3px 8px', borderRadius: 6,
      background: '#fff', border: '1px solid var(--border)', color: 'var(--ink)'
    }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{from}</span>
      <span>→</span>
      <b style={{ color: down === true ? 'var(--red)' : down === false ? 'var(--pine)' : 'var(--ink)' }}>{to}</b>
    </span>
  );
}

function ActivityTab({ inventoryLog, settings }) {
  const currency = settings && settings.currency;
  const PAGE = 40;
  const [range, setRange] = useState('7d'); // today | 7d | 30d | all | custom
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('All');
  const [kindFilter, setKindFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const pickRange = (r) => {
    setRange(r);
    setShown(PAGE);
    const now = new Date();
    if (r === 'today') { setFrom(localDateStr(now)); setTo(localDateStr(now)); }
    else if (r === '7d') { setFrom(localDateStr(new Date(Date.now() - 6 * 86400000))); setTo(''); }
    else if (r === '30d') { setFrom(localDateStr(new Date(Date.now() - 29 * 86400000))); setTo(''); }
    else { setFrom(''); setTo(''); }
  };
  // Open on the last 7 days.
  useEffect(() => { pickRange('7d'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(
    () => [...inventoryLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [inventoryLog]
  );
  const staffNames = ['All', ...Array.from(new Set(all.map((e) => e.staffName)))];

  // "Needs attention" always looks at today, whatever the filters say.
  const todayKey = localDateStr(new Date());
  const todays = all.filter((e) => localDateStr(new Date(e.timestamp)) === todayKey);
  const countKind = (k) => todays.filter((e) => activityKind(e) === k);
  const todayVoids = countKind('void');
  const todayTill = countKind('till');
  const attention = [
    { kind: 'void', label: 'Voids today', value: todayVoids.length, sub: todayVoids.length ? formatMoney(todayVoids.reduce((s, e) => s + (Number(e.amount) || 0), 0), currency) : 'none', warn: todayVoids.length > 0 },
    { kind: 'reject', label: 'Sales not saved', value: countKind('reject').length, sub: 'payment refused', warn: countKind('reject').length > 0 },
    { kind: 'till', label: 'Paid at till today', value: todayTill.length, sub: todayTill.length ? formatMoney(todayTill.reduce((n, e) => n + (Number(e.amount) || 0), 0), currency) + ' to match' : 'none', warn: todayTill.length > 0 },
    { kind: 'price', label: 'Price changes', value: countKind('price').length, sub: 'today', warn: false },
    { kind: 'delete', label: 'Deletions', value: countKind('delete').length, sub: 'today', warn: countKind('delete').length > 0 },
  ];

  const q = query.trim().toLowerCase();
  const filtered = all.filter((e) => {
    const d = new Date(e.timestamp);
    if (from && d < new Date(from + 'T00:00:00')) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    if (staffFilter !== 'All' && e.staffName !== staffFilter) return false;
    if (kindFilter !== 'all' && activityKind(e) !== kindFilter) return false;
    if (q && !`${e.productName} ${e.sku} ${e.detail} ${e.staffName}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const visible = filtered.slice(0, shown);

  // Group the visible rows by calendar day.
  const groups = [];
  visible.forEach((e) => {
    const key = localDateStr(new Date(e.timestamp));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e); else groups.push({ key, items: [e] });
  });

  const chipBase = { padding: '6px 11px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600, background: '#fff', color: 'var(--ink)' };
  const chipOn = { ...chipBase, background: 'var(--pine)', color: '#fff', borderColor: 'var(--pine)' };
  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Activity</h2>
        <button onClick={() => exportActivityCsv(filtered, settings)} disabled={filtered.length === 0} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 13, fontWeight: 600, color: filtered.length === 0 ? 'var(--muted)' : 'var(--pine)'
        }}>
          <ClipboardList size={14} /> Export CSV
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Inventory changes, voided sales, account payments and sales the system refused — who did what, and when.</p>

      {/* Needs-attention strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
        {attention.map((a) => {
          const m = ACTIVITY_KIND_META[a.kind];
          const hot = a.warn && a.value > 0;
          return (
            <button key={a.kind} onClick={() => { pickRange('today'); setKindFilter(a.kind); }} style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: 12,
              border: `1px solid ${hot ? m.color : 'var(--border)'}`, background: hot ? m.bg : 'var(--paper)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: hot ? m.color : 'var(--muted)', fontWeight: 600 }}>
                <m.Icon size={13} /> {a.label}
              </div>
              <div className="pos-mono" style={{ fontSize: 24, fontWeight: 700, color: hot ? m.color : 'var(--ink)', margin: '4px 0 2px' }}>{a.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']].map(([k, l]) => (
          <button key={k} onClick={() => pickRange(k)} style={range === k ? chipOn : chipBase}>{l}</button>
        ))}
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRange('custom'); setShown(PAGE); }} style={inputStyle} />
        <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRange('custom'); setShown(PAGE); }} style={inputStyle} />
        <select value={staffFilter} onChange={(e) => { setStaffFilter(e.target.value); setShown(PAGE); }} style={inputStyle}>
          {staffNames.map((n) => <option key={n} value={n}>{n === 'All' ? 'All staff' : n}</option>)}
        </select>
      </div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search product, SKU, staff or details"
          style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => { setKindFilter('all'); setShown(PAGE); }} style={kindFilter === 'all' ? chipOn : chipBase}>All</button>
        {Object.entries(ACTIVITY_KIND_META).map(([k, m]) => (
          <button key={k} onClick={() => { setKindFilter(k); setShown(PAGE); }} style={kindFilter === k ? chipOn : chipBase}>{m.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <EmptyState icon={ClipboardList} title="Nothing matches these filters"
            subtitle={all.length === 0 ? 'Activity will appear here as your team works.' : 'Try a wider date range or clear the search.'} />
        </div>
      ) : groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {activityDayLabel(g.key)}
            <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· {g.items.length}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {g.items.map((e, idx) => {
              const kind = activityKind(e);
              const meta = ACTIVITY_KIND_META[kind];
              const b = e.before, a = e.after;
              const priceDiff = b && a && Number(b.price) !== Number(a.price);
              const stockDiff = b && a && Number(b.stock) !== Number(a.stock);
              const nameDiff = b && a && b.name !== a.name;
              const showDiffs = priceDiff || stockDiff || nameDiff;
              return (
                <div key={e.id} style={{
                  display: 'flex', gap: 12, padding: '12px 14px', fontSize: 13,
                  borderBottom: idx === g.items.length - 1 ? 'none' : '1px solid var(--border)',
                  borderLeft: `3px solid ${meta.loud ? meta.color : 'transparent'}`,
                  background: meta.loud ? meta.bg : 'transparent',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}>
                    <meta.Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontWeight: 600 }}>{e.productName}</span>
                        {e.sku && <span className="pos-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{e.sku}</span>}
                      </span>
                      {e.amount != null && <span className="pos-mono" style={{ fontWeight: 700, color: meta.loud ? meta.color : 'var(--ink)' }}>{formatMoney(Number(e.amount), currency)}</span>}
                    </div>
                    {showDiffs ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {nameDiff && <DiffChip label="Name" from={b.name} to={a.name} />}
                        {priceDiff && <DiffChip label="Price" from={formatMoney(b.price, currency)} to={formatMoney(a.price, currency)} down={Number(a.price) < Number(b.price)} />}
                        {stockDiff && <DiffChip label="Stock" from={b.stock} to={a.stock} down={Number(a.stock) < Number(b.stock)} />}
                      </div>
                    ) : (
                      e.detail && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{e.detail}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 999, background: 'var(--pine-pale)', color: 'var(--pine)', fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{initialsOf(e.staffName)}</span>
                      <span>{e.staffName}</span>
                      <span>·</span>
                      <span title={new Date(e.timestamp).toLocaleString()}>{timeAgo(e.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length > visible.length && (
        <button onClick={() => setShown((n) => n + PAGE)} style={{
          display: 'block', margin: '4px auto 0', padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--pine)'
        }}>Show {Math.min(PAGE, filtered.length - visible.length)} more ({filtered.length - visible.length} left)</button>
      )}
    </div>
  );
}

const PAYMENT_LABELS = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', account: 'On account' };

function SalesTab({ sales, inventory, settings, voidSale }) {
  const currency = settings.currency;
  const PAGE = 40;
  const [range, setRange] = useState('7d'); // today | 7d | 30d | all | custom
  const [from, setFrom] = useState(() => localDateStr(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState('');
  const [cashier, setCashier] = useState('All');
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all'); // all | paid | unpaid | voided
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [expanded, setExpanded] = useState(null);
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);

  const costById = useMemo(() => new Map((inventory || []).map((p) => [p.id, p.cost || 0])), [inventory]);
  const pickRange = (r) => {
    setRange(r); setShown(PAGE);
    const now = new Date();
    if (r === 'today') { setFrom(localDateStr(now)); setTo(localDateStr(now)); }
    else if (r === '7d') { setFrom(localDateStr(new Date(Date.now() - 6 * 86400000))); setTo(''); }
    else if (r === '30d') { setFrom(localDateStr(new Date(Date.now() - 29 * 86400000))); setTo(''); }
    else { setFrom(''); setTo(''); }
  };

  const all = useMemo(() => [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [sales]);
  const cashiers = ['All', ...Array.from(new Set(all.map((s) => s.cashier).filter(Boolean)))];
  const methods = Array.from(new Set(all.map((s) => s.paymentMethod).filter(Boolean)));
  const isUnpaid = (s) => s.paymentMethod === 'account' && !s.settled && !s.voided;

  const q = query.trim().toLowerCase();
  const filtered = all.filter((s) => {
    const d = new Date(s.timestamp);
    if (from && d < new Date(from + 'T00:00:00')) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    if (cashier !== 'All' && s.cashier !== cashier) return false;
    if (method !== 'all' && s.paymentMethod !== method) return false;
    if (status === 'voided' && !s.voided) return false;
    if (status === 'unpaid' && !isUnpaid(s)) return false;
    if (status === 'paid' && (s.voided || isUnpaid(s))) return false;
    if (q) {
      const hay = `${(s.items || []).map((i) => i.name).join(' ')} ${s.customerName || ''} ${s.cashier || ''} ${s.mpesaReceipt || ''} ${s.paymentRef || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const visible = filtered.slice(0, shown);

  const live = filtered.filter((s) => !s.voided);
  const total = live.reduce((sum, s) => sum + s.total, 0);
  const fin = summarizeProfit(live, costById);
  const unpaidList = filtered.filter(isUnpaid);
  const voidedList = filtered.filter((s) => s.voided);
  const byMethod = {};
  live.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total; });

  const groups = [];
  visible.forEach((s) => {
    const key = localDateStr(new Date(s.timestamp));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(s); else groups.push({ key, items: [s] });
  });

  const confirmVoid = async (id) => {
    if (!voidSale) return;
    setBusy(true);
    await voidSale(id, voidReason.trim());
    setBusy(false); setVoidingId(null); setVoidReason('');
  };

  const chipBase = { padding: '6px 11px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600, background: '#fff', color: 'var(--ink)' };
  const chipOn = { ...chipBase, background: 'var(--pine)', color: '#fff', borderColor: 'var(--pine)' };
  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff' };
  const reset = () => setShown(PAGE);
  const pill = (text, color, bg) => <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, padding: '2px 6px', borderRadius: 5 }}>{text}</span>;

  const cards = [
    { label: 'Sales', value: formatMoney(total, currency), sub: `${live.length} transaction${live.length !== 1 ? 's' : ''} · incl. VAT` },
    { label: 'Profit', value: fin.known ? formatMoney(fin.profit, currency) : '—', color: fin.known ? (fin.profit < 0 ? 'var(--red)' : 'var(--pine)') : null,
      sub: fin.known ? `${fin.margin.toFixed(1)}% margin${fin.coverage < 0.99 ? ` · ${Math.round(fin.coverage * 100)}% costed` : ''}` : 'no buying prices yet' },
    { label: 'Unpaid on account', value: formatMoney(unpaidList.reduce((x, s) => x + s.total, 0), currency), sub: `${unpaidList.length} sale${unpaidList.length !== 1 ? 's' : ''}`, hot: unpaidList.length > 0, color: 'var(--amber)', bg: 'var(--amber-pale)', onClick: () => { setStatus('unpaid'); reset(); } },
    { label: 'Voided', value: voidedList.length, sub: voidedList.length ? formatMoney(voidedList.reduce((x, s) => x + s.total, 0), currency) : 'none', hot: voidedList.length > 0, color: 'var(--red)', bg: 'var(--red-pale)', onClick: () => { setStatus('voided'); reset(); } },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Sales history</h2>
        <button onClick={() => exportSalesCsv(filtered, settings)} disabled={filtered.length === 0} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 13, fontWeight: 600, color: filtered.length === 0 ? 'var(--muted)' : 'var(--pine)'
        }}><ClipboardList size={14} /> Export CSV</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Every sale, who rang it up and how it was paid. Figures below follow your filters.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 8 }}>
        {cards.map((c) => {
          const hot = c.hot;
          const Tag = c.onClick ? 'button' : 'div';
          return (
            <Tag key={c.label} onClick={c.onClick} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: `1px solid ${hot ? c.color : 'var(--border)'}`, background: hot ? c.bg : 'var(--paper)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: hot ? c.color : 'var(--muted)' }}>{c.label}</div>
              <div className="pos-mono" style={{ fontSize: 20, fontWeight: 700, color: hot ? c.color : (c.color || 'var(--ink)'), margin: '4px 0 2px' }}>{c.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.sub}</div>
            </Tag>
          );
        })}
      </div>
      {Object.keys(byMethod).length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {Object.entries(byMethod).map(([m, v]) => <span key={m}>{PAYMENT_LABELS[m] || m} <b className="pos-mono" style={{ color: 'var(--ink)' }}>{formatMoney(v, currency)}</b></span>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']].map(([k, l]) => (
          <button key={k} onClick={() => pickRange(k)} style={range === k ? chipOn : chipBase}>{l}</button>
        ))}
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRange('custom'); reset(); }} style={inputStyle} />
        <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRange('custom'); reset(); }} style={inputStyle} />
        <select value={cashier} onChange={(e) => { setCashier(e.target.value); reset(); }} style={inputStyle}>
          {cashiers.map((n) => <option key={n} value={n}>{n === 'All' ? 'All cashiers' : n}</option>)}
        </select>
        <select value={method} onChange={(e) => { setMethod(e.target.value); reset(); }} style={inputStyle}>
          <option value="all">All payment types</option>
          {methods.map((m) => <option key={m} value={m}>{PAYMENT_LABELS[m] || m}</option>)}
        </select>
      </div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
        <input value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} placeholder="Search item, customer, cashier or payment reference"
          style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {[['all', 'All'], ['paid', 'Paid'], ['unpaid', 'Unpaid'], ['voided', 'Voided']].map(([k, l]) => (
          <button key={k} onClick={() => { setStatus(k); reset(); }} style={status === k ? chipOn : chipBase}>{l}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} sale{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <EmptyState icon={Receipt} title="No sales match these filters" subtitle={all.length === 0 ? 'Sales will appear here as your team rings them up.' : 'Try a wider date range or clear the search.'} />
        </div>
      ) : groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {activityDayLabel(g.key)}
            <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· {g.items.length} · {formatMoney(g.items.filter((s) => !s.voided).reduce((x, s) => x + s.total, 0), currency)}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {g.items.map((s, idx) => {
              const open = expanded === s.id;
              const items = s.items || [];
              const lineProfit = summarizeProfit([s], costById);
              return (
                <div key={s.id} style={{ borderBottom: idx === g.items.length - 1 ? 'none' : '1px solid var(--border)', borderLeft: `3px solid ${s.voided ? 'var(--red)' : isUnpaid(s) ? 'var(--amber)' : 'transparent'}` }}>
                  <div onClick={() => setExpanded(open ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '11px 14px', cursor: 'pointer', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flexWrap: 'wrap' }}>
                      <ChevronRight size={13} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                      <span title={s.cashier} style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--pine-pale)', color: 'var(--pine)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initialsOf(s.cashier)}</span>
                      <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>
                        {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {items.length === 1 ? `${items[0].qty} x ${items[0].name}` : `${items.length} items`}
                      </span>
                      {pill(PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod, 'var(--muted)', 'var(--bg)')}
                      {s.voided && pill('Voided', 'var(--red)', 'var(--red-pale)')}
                      {isUnpaid(s) && pill('Unpaid', 'var(--amber)', 'var(--amber-pale)')}
                    </span>
                    <span className="pos-mono" style={{ color: s.voided ? 'var(--muted)' : 'var(--ink)', textDecoration: s.voided ? 'line-through' : 'none', flexShrink: 0 }}>{formatMoney(s.total, currency)}</span>
                  </div>
                  {open && (
                    <div style={{ padding: '2px 16px 14px 40px', fontSize: 12.5, color: 'var(--muted)' }}>
                      {items.map((i) => (
                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{i.qty} x {i.name}</span><span className="pos-mono">{formatMoney(i.price * i.qty, currency)}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 4 }}>Rung up by {s.cashier} · paid via {PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}{s.customerName ? ` — ${s.customerName}` : ''}{s.mpesaReceipt ? ` (${s.mpesaReceipt})` : ''}{isManualTillSale(s) ? ' — paid at till, entered by hand' : ''}{s.paymentRef ? ` (${s.paymentRef})` : ''}</div>
                      {!s.voided && lineProfit.known > 0 && <div style={{ marginTop: 2 }}>Profit <b className="pos-mono" style={{ color: lineProfit.profit < 0 ? 'var(--red)' : 'var(--pine)' }}>{formatMoney(lineProfit.profit, currency)}</b> (excl. VAT)</div>}
                      {s.voided && <div style={{ marginTop: 4, color: 'var(--red)' }}>Voided by {s.voidedBy} on {new Date(s.voidedAt).toLocaleString()}{s.voidReason ? `: ${s.voidReason}` : ''}</div>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        <button onClick={() => setReceiptSale(s)} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--pine)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>View receipt</button>
                        {!s.voided && voidSale && voidingId !== s.id && (
                          <button onClick={() => { setVoidingId(s.id); setVoidReason(''); }} style={{ background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>Void this sale</button>
                        )}
                      </div>
                      {!s.voided && voidSale && voidingId === s.id && (
                        <div style={{ marginTop: 10, padding: 10, background: 'var(--red-pale)', borderRadius: 8 }}>
                          <label style={{ fontSize: 11, color: '#7A2530' }}>Reason for reversing this sale</label>
                          <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. customer changed their mind"
                            style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, marginTop: 4, marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button disabled={busy} onClick={() => confirmVoid(s.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>{busy ? 'Voiding…' : 'Confirm void'}</button>
                            <button onClick={() => setVoidingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12 }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length > visible.length && (
        <button onClick={() => setShown((n) => n + PAGE)} style={{ display: 'block', margin: '4px auto 0', padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--pine)' }}>
          Show {Math.min(PAGE, filtered.length - visible.length)} more ({filtered.length - visible.length} left)
        </button>
      )}
      {receiptSale && <ReceiptModal sale={receiptSale} settings={settings} onClose={() => setReceiptSale(null)} />}
    </div>
  );
}

function AccountsTab({ sales, settings, settleAccountSale }) {
  const [settleMethod, setSettleMethod] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [mpesaPrompt, setMpesaPrompt] = useState(null); // { sale, name, phone }
  const [cardPrompt, setCardPrompt] = useState(null); // { sale, name }
  const [sortBy, setSortBy] = useState('amount'); // amount | oldest
  const [settleAllFor, setSettleAllFor] = useState(null);
  const [settleAllBusy, setSettleAllBusy] = useState(false);
  const ageDays = (s) => Math.max(0, Math.floor((Date.now() - new Date(s.timestamp)) / 86400000));

  const accountSales = sales.filter((s) => s.paymentMethod === 'account' && !s.voided);
  const outstanding = accountSales.filter((s) => !s.settled).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const settledRecently = accountSales.filter((s) => s.settled).sort((a, b) => new Date(b.settledAt || b.timestamp) - new Date(a.settledAt || a.timestamp)).slice(0, 10);

  const byCustomer = {};
  outstanding.forEach((s) => {
    // Same phone = same customer, so two "John"s with different numbers stay separate.
    const digits = toWhatsappDigits(s.customerPhone);
    const key = digits ? `p:${digits}` : `n:${s.customerName || 'Unknown customer'}`;
    if (!byCustomer[key]) byCustomer[key] = { key, name: s.customerName || 'Unknown customer', phone: s.customerPhone, sales: [], total: 0, oldestDays: 0 };
    byCustomer[key].sales.push(s);
    byCustomer[key].total += s.total;
    byCustomer[key].oldestDays = Math.max(byCustomer[key].oldestDays, ageDays(s));
  });
  const allCustomers = Object.values(byCustomer).sort(sortBy === 'oldest' ? (a, b) => b.oldestDays - a.oldestDays : (a, b) => b.total - a.total);
  const bucket = (lo, hi) => outstanding.filter((s) => ageDays(s) >= lo && ageDays(s) <= hi).reduce((sum, s) => sum + s.total, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const collectedThisMonth = accountSales.filter((s) => s.settled && s.settledAt && new Date(s.settledAt) >= monthStart).reduce((sum, s) => sum + s.total, 0);
  const customers = allCustomers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const totalOutstanding = outstanding.reduce((sum, s) => sum + s.total, 0);

  const markPaid = async (sale, customer) => {
    if (!settleAccountSale) return;
    const method = settleMethod[sale.id] || 'cash';
    // M-Pesa needs the customer to actually confirm on their phone —
    // send them a real STK push instead of just flipping the sale to paid.
    if (method === 'mpesa') {
      setMpesaPrompt({ sale, name: customer.name, phone: customer.phone });
      return;
    }
    // Same for card: it has to go through Paystack, not just be ticked off.
    if (method === 'card') {
      setCardPrompt({ sale, name: customer.name });
      return;
    }
    setBusyId(sale.id);
    await settleAccountSale(sale.id, method);
    setBusyId(null);
  };

  const handleCardSettled = async (paymentRef) => {
    if (!cardPrompt) return;
    setBusyId(cardPrompt.sale.id);
    await settleAccountSale(cardPrompt.sale.id, 'card', undefined, paymentRef);
    setBusyId(null);
    setCardPrompt(null);
  };

  const handleMpesaSettled = async (receipt, txnId) => {
    if (!mpesaPrompt) return;
    setBusyId(mpesaPrompt.sale.id);
    await settleAccountSale(mpesaPrompt.sale.id, 'mpesa', receipt, undefined, txnId);
    setBusyId(null);
    setMpesaPrompt(null);
  };

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Customer accounts</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sales rung up "on account" — track who owes what, and mark them settled once collected.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total outstanding" value={formatMoney(totalOutstanding, settings.currency)} accent={totalOutstanding ? 'var(--red)' : undefined} sub={`${allCustomers.length} customer${allCustomers.length !== 1 ? 's' : ''}`} />
        <StatCard label="Collected this month" value={formatMoney(collectedThisMonth, settings.currency)} accent="var(--pine)" />
        <StatCard label="0–7 days" value={formatMoney(bucket(0, 7), settings.currency)} />
        <StatCard label="8–30 days" value={formatMoney(bucket(8, 30), settings.currency)} accent={bucket(8, 30) ? 'var(--amber)' : undefined} />
        <StatCard label="Over 30 days" value={formatMoney(bucket(31, Infinity), settings.currency)} accent={bucket(31, Infinity) ? 'var(--red)' : undefined} sub="chase these first" />
      </div>

      {allCustomers.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by customer name"
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        </div>
        {[['amount', 'Largest first'], ['oldest', 'Oldest first']].map(([k, l]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: '1px solid ' + (sortBy === k ? 'var(--pine)' : 'var(--border)'), background: sortBy === k ? 'var(--pine)' : '#fff', color: sortBy === k ? '#fff' : 'var(--ink)' }}>{l}</button>
        ))}
        </div>
      )}

      {allCustomers.length === 0 && (
        <EmptyState icon={Users} title="No customer accounts yet" subtitle="Balances appear here once a sale is rung up as “on account.”" />
      )}
      {allCustomers.length > 0 && customers.length === 0 && (
        <EmptyState icon={Search} title={`No customers match "${query}"`} subtitle="Check the spelling or try a shorter search." compact />
      )}

      {customers.map((c) => {
        const waDigits = toWhatsappDigits(c.phone);
        const waMessage = `Hi ${c.name}, this is a friendly reminder from ${settings.pharmacyName} that you have an outstanding balance of ${formatMoney(c.total, settings.currency)}. Kindly settle at your earliest convenience — thank you!`;
        const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}` : null;
        return (
        <div key={c.key} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span title="Age of the oldest unpaid sale" style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, color: c.oldestDays > 30 ? 'var(--red)' : c.oldestDays > 7 ? 'var(--amber)' : 'var(--muted)', background: c.oldestDays > 30 ? 'var(--red-pale)' : c.oldestDays > 7 ? 'var(--amber-pale)' : 'var(--bg)' }}>{c.oldestDays}d old</span>
              <div className="pos-mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>{formatMoney(c.total, settings.currency)}</div>
              {settleAccountSale && c.sales.length > 1 && (
                <button onClick={() => setSettleAllFor(c)} title="Mark every unpaid sale for this customer as paid in cash" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontSize: 11.5, fontWeight: 600 }}>Settle all (cash)</button>
              )}
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" title="Send a WhatsApp payment reminder" style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7,
                  border: '1px solid #25D366', color: '#128C4A', background: '#E9F9EF', fontSize: 11.5, fontWeight: 600, textDecoration: 'none'
                }}>
                  <MessageCircle size={13} /> Remind
                </a>
              ) : (
                <span title="No phone number on file for this customer" style={{ fontSize: 11, color: 'var(--muted)' }}>No phone on file</span>
              )}
            </div>
          </div>
          {c.sales.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, padding: '8px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: 'var(--muted)' }}>{new Date(s.timestamp).toLocaleDateString()} ({ageDays(s)}d) · {s.items.length} item{s.items.length !== 1 ? 's' : ''} · {s.cashier}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
                {settleAccountSale && (
                  <>
                    <select value={settleMethod[s.id] || 'cash'} onChange={(e) => setSettleMethod({ ...settleMethod, [s.id]: e.target.value })}
                      style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mpesa">M-Pesa</option>
                    </select>
                    <button disabled={busyId === s.id} onClick={() => markPaid(s, c)} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, opacity: busyId === s.id ? 0.6 : 1 }}>
                      {busyId === s.id ? 'Saving…' : (settleMethod[s.id] || 'cash') === 'mpesa' ? 'Prompt for M-Pesa' : (settleMethod[s.id] || 'cash') === 'card' ? 'Pay by card' : 'Mark as paid'}
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        );
      })}

      {settledRecently.length > 0 && (
        <>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 10px' }}>Recently settled</h3>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {settledRecently.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <span>{s.customerName} · settled {s.settledAt ? new Date(s.settledAt).toLocaleDateString() : '—'}{s.settledMethod ? ` via ${s.settledMethod}` : ''}{s.mpesaReceipt ? ` (${s.mpesaReceipt})` : ''}{s.paymentRef ? ` (${s.paymentRef})` : ''}</span>
                <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {settleAllFor && (
        <ConfirmModal
          title="Settle all in cash?"
          message={`Mark ${settleAllFor.sales.length} unpaid sales for ${settleAllFor.name} (${formatMoney(settleAllFor.total, settings.currency)}) as paid in cash. Only do this once you have the cash in hand — card and M-Pesa payments are settled one sale at a time so each can be verified.`}
          confirmLabel="Settle all"
          busy={settleAllBusy}
          onCancel={() => setSettleAllFor(null)}
          onConfirm={async () => {
            setSettleAllBusy(true);
            for (const sale of settleAllFor.sales) await settleAccountSale(sale.id, 'cash');
            setSettleAllBusy(false); setSettleAllFor(null);
          }}
        />
      )}

      {cardPrompt && (
        <AccountCardModal
          customer={{ name: cardPrompt.name, total: cardPrompt.sale.total }}
          settings={settings}
          onClose={() => setCardPrompt(null)}
          onSettled={handleCardSettled}
        />
      )}

      {mpesaPrompt && (
        <AccountMpesaModal
          customer={{ name: mpesaPrompt.name, phone: mpesaPrompt.phone, total: mpesaPrompt.sale.total }}
          settings={settings}
          onClose={() => setMpesaPrompt(null)}
          onSettled={handleMpesaSettled}
        />
      )}
    </div>
  );
}

function StaffTab({ staffList, saveStaff, sales = [], settings = {} }) {
  const now = new Date();
  const statsFor = (name) => {
    const mine = sales.filter((x) => x.cashier === name && !x.voided);
    const today = mine.filter((x) => isSameDay(x.timestamp, now));
    const last = mine.reduce((m, x) => (!m || new Date(x.timestamp) > new Date(m.timestamp) ? x : m), null);
    return { count: today.length, total: today.reduce((sum, x) => sum + x.total, 0), last };
  };
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const adminPinRef = useRef(null);

  // Success messages fade on their own so the page doesn't fill up with them.
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Every PIN add/change/delete is confirmed server-side against the
  // admin's own PIN — the browser never stores or reads anyone's real
  // PIN value, it just relays what was typed to staff-admin and reports
  // back whether that succeeded.
  const callStaffAdmin = async (body) => {
    setActionError('');
    setNotice('');
    if (!adminPin || adminPin.length !== 4) {
      setActionError('Enter your admin PIN above to make staff changes.');
      if (adminPinRef.current) adminPinRef.current.focus();
      return false;
    }
    setBusy(true);
    try {
      const { data, error } = await invokeFn('staff-admin', { body: { adminPin, ...body } });
      if (error || !data || data.error) {
        setActionError((data && data.error) || (error && error.message) || 'Could not save. Check your admin PIN and try again.');
        return false;
      }
      return true;
    } catch (e) {
      setActionError('Could not reach the server.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Sales are recorded under the cashier's name, so two people sharing a
  // name would have their sales merged together on this page and in reports.
  const nameTaken = (candidate, exceptId) => {
    const key = candidate.trim().toLowerCase();
    return staffList.some((s) => s.id !== exceptId && String(s.name).trim().toLowerCase() === key);
  };

  const add = async () => {
    const clean = name.trim();
    if (!clean || pin.length !== 4) return;
    if (nameTaken(clean)) {
      setActionError(`There is already someone called "${clean}". Add an initial or surname so their sales are tracked separately.`);
      return;
    }
    const id = genId('s');
    const ok = await callStaffAdmin({ action: 'set', staffId: id, pin, role: 'staff' });
    if (!ok) return;
    saveStaff([...staffList, { id, name: clean, role: 'staff', canManageInventory: false }]);
    setName(''); setPin('');
    setNotice(`${clean} added. They can log in with their PIN now.`);
  };

  const remove = async (id) => {
    const who = staffList.find((s) => s.id === id);
    const ok = await callStaffAdmin({ action: 'delete', staffId: id });
    if (!ok) return;
    saveStaff(staffList.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (who) setNotice(`${who.name} was removed.`);
  };

  // Deactivate = can't log in, but the account, its name and its sales history
  // stay. Reactivate brings it back with the same PIN. (Remove is permanent.)
  const setActive = async (id, active) => {
    const who = staffList.find((s) => s.id === id);
    const ok = await callStaffAdmin({ action: 'set-active', staffId: id, active });
    if (!ok) return;
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, active } : s)));
    setConfirmDeactivateId(null);
    if (who) setNotice(active ? `${who.name} is active again and can log in with their old PIN.` : `${who.name} was deactivated.`);
  };

  const startEdit = (s) => { setActionError(''); setEditingId(s.id); setEditName(s.name); setEditPin(''); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    const clean = editName.trim();
    if (!clean) return;
    if (editPin && editPin.length !== 4) return; // only validate PIN if actually changing it
    if (nameTaken(clean, id)) {
      setActionError(`There is already someone called "${clean}". Use a different name so their sales are tracked separately.`);
      return;
    }
    if (editPin) {
      const target = staffList.find((s) => s.id === id);
      const ok = await callStaffAdmin({ action: 'set', staffId: id, pin: editPin, role: target.role });
      if (!ok) return;
    }
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, name: clean } : s)));
    setEditingId(null);
    setNotice(editPin ? 'Name and PIN updated.' : 'Name updated.');
  };

  const toggleInventoryAccess = async (id, checked) => {
    // This has to round-trip through staff-admin now: canManageInventory
    // is embedded in the signed session token that manage-inventory
    // checks, so a client-only flip here would change what the button
    // looks like without changing what the server actually allows.
    const ok = await callStaffAdmin({ action: 'set-permission', staffId: id, canManageInventory: checked });
    if (!ok) return;
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, canManageInventory: checked } : s)));
  };

  const isOff = (s) => s.active === false;
  const activeCount = staffList.filter((s) => !isOff(s)).length;
  const offCount = staffList.length - activeCount;
  const todaySales = sales.filter((x) => !x.voided && isSameDay(x.timestamp, now));
  const todayTotal = todaySales.reduce((sum, x) => sum + x.total, 0);

  const q = query.trim().toLowerCase();
  const visible = staffList
    .filter((s) => (filter === 'active' ? !isOff(s) : filter === 'off' ? isOff(s) : true))
    .filter((s) => !q || String(s.name).toLowerCase().includes(q))
    .sort((a, b) => (isOff(a) - isOff(b)) || ((b.role === 'admin') - (a.role === 'admin')));

  const onEnter = (fn) => (e) => { if (e.key === 'Enter') fn(); };
  const pinReady = adminPin.length === 4;
  const canAdd = name.trim() && pin.length === 4 && !busy;

  const renderEdit = (s) => (
    <div key={s.id} className="staff-row staff-row-edit">
      <div className="staff-edit-fields">
        <label className="staff-field">
          <span>Full name</span>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') cancelEdit(); }} />
        </label>
        <label className="staff-field staff-field-pin">
          <span>New PIN (optional)</span>
          <input value={editPin} inputMode="numeric" autoComplete="off" placeholder="4 digits"
            onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') cancelEdit(); }} />
        </label>
      </div>
      <p className="staff-hint">Leave the PIN empty to keep it as it is. Sales already made stay under the old name.</p>
      <div className="staff-edit-actions">
        <button className="staff-btn staff-btn-primary" onClick={() => saveEdit(s.id)} disabled={busy || !editName.trim() || (editPin.length > 0 && editPin.length !== 4)}>Save</button>
        <button className="staff-btn" onClick={cancelEdit}>Cancel</button>
      </div>
    </div>
  );

  const renderRow = (s) => {
    if (editingId === s.id) return renderEdit(s);
    const off = isOff(s);
    const admin = s.role === 'admin';
    const st = statsFor(s.name);
    const on = !!s.canManageInventory;
    return (
      <div key={s.id} className="staff-row" data-off={off ? 'true' : 'false'}>
        <div className="staff-main">
          <span className="staff-avatar" data-admin={admin ? 'true' : 'false'}>{initialsOf(s.name)}</span>
          <span className="staff-info">
            <span className="staff-name">
              {s.name}
              <span className="staff-badge" data-kind={admin ? 'admin' : 'staff'}>{admin ? 'Admin' : 'Cashier'}</span>
              {off && <span className="staff-badge" data-kind="off">Deactivated</span>}
            </span>
            {!admin && (
              <span className="staff-meta">
                {off
                  ? `Can’t log in${st.last ? ` · last sale ${timeAgo(st.last.timestamp)}` : ''}`
                  : `Today: ${st.count} sale${st.count !== 1 ? 's' : ''}${st.count ? ` · ${formatMoney(st.total, settings.currency)}` : ''}${st.last ? ` · last sale ${timeAgo(st.last.timestamp)}` : ' · no sales yet'}`}
              </span>
            )}
          </span>
        </div>
        <div className="staff-actions">
          {off ? (
            <>
              <button className="staff-btn staff-btn-primary" onClick={() => setActive(s.id, true)} disabled={busy}>Reactivate</button>
              <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => setConfirmDeleteId(s.id)} disabled={busy} title="Remove permanently" aria-label={`Remove ${s.name} permanently`} style={{ color: 'var(--red)' }}><Trash2 size={15} /></button>
            </>
          ) : (
            <>
              {!admin && (
                <label className="staff-toggle" title="Lets this cashier add and edit products">
                  <button type="button" role="switch" aria-checked={on} className="staff-switch" data-on={on ? 'true' : 'false'}
                    onClick={() => toggleInventoryAccess(s.id, !on)} disabled={busy}><span /></button>
                  <span>Can add inventory</span>
                </label>
              )}
              <button className="pos-icon-btn" onClick={() => startEdit(s)} title="Change name or PIN" aria-label={`Edit ${s.name}`} style={{ color: 'var(--muted)' }}><Edit2 size={15} /></button>
              {!admin && <button className="staff-btn" onClick={() => setConfirmDeactivateId(s.id)} disabled={busy} title="Block login but keep the account and its sales history">Deactivate</button>}
              {!admin && <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => setConfirmDeleteId(s.id)} disabled={busy} title="Remove permanently" aria-label={`Remove ${s.name} permanently`} style={{ color: 'var(--red)' }}><Trash2 size={15} /></button>}
            </>
          )}
        </div>
      </div>
    );
  };

  const filters = [['all', 'All', staffList.length], ['active', 'Active', activeCount], ['off', 'Deactivated', offCount]];

  return (
    <div className="staff-page">
      <style>{`
        .staff-page { max-width: 880px; }
        .staff-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .staff-stat { background: var(--paper); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
        .staff-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
        .staff-stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
        .staff-stat-sub { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
        .staff-pinbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: var(--paper); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; transition: border-color .15s, background-color .15s; }
        .staff-pinbar[data-ready="true"] { border-color: var(--pine-light); background: var(--pine-pale); }
        .staff-pinbar[data-error="true"] { border-color: var(--red); background: var(--red-pale); }
        .staff-pinbar-text { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .staff-pinbar-icon { width: 30px; height: 30px; border-radius: 999px; background: var(--pine-pale); color: var(--pine); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .staff-pinbar[data-ready="true"] .staff-pinbar-icon { background: var(--pine); color: #fff; }
        .staff-pinbar-title { font-size: 13px; font-weight: 600; display: block; }
        .staff-pinbar-sub { font-size: 11.5px; color: var(--muted); display: block; }
        .staff-pinbar input { width: 120px; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 15px; letter-spacing: 0.3em; text-align: center; background: #fff; }
        .staff-notice { display: flex; align-items: center; gap: 8px; background: var(--pine-pale); color: var(--pine); border: 1px solid var(--pine-light); border-radius: 10px; padding: 9px 14px; font-size: 12.5px; font-weight: 500; margin-bottom: 12px; }
        .staff-error { background: var(--red-pale); color: var(--red); border: 1px solid var(--red); border-radius: 10px; padding: 9px 14px; font-size: 12.5px; margin-bottom: 12px; }
        .staff-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .staff-search { position: relative; flex: 1 1 200px; max-width: 320px; }
        .staff-search input { width: 100%; padding: 8px 10px 8px 32px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px; background: #fff; }
        .staff-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
        .staff-seg { display: inline-flex; background: var(--pine-pale); border-radius: 9px; padding: 3px; gap: 2px; }
        .staff-seg button { border: none; background: none; padding: 6px 12px; border-radius: 7px; font-size: 12px; font-weight: 600; color: var(--muted); }
        .staff-seg button[data-on="true"] { background: #fff; color: var(--pine); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
        .staff-seg small { font-weight: 500; opacity: .7; margin-left: 4px; }
        .staff-card { background: var(--paper); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 22px; }
        .staff-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; transition: background-color .12s; }
        .staff-row:last-child { border-bottom: none; }
        .staff-row:hover { background: rgba(231,238,233,.45); }
        .staff-row[data-off="true"] .staff-main { opacity: .55; }
        .staff-main { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 260px; }
        .staff-avatar { width: 36px; height: 36px; border-radius: 999px; background: var(--pine-pale); color: var(--pine); font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .staff-avatar[data-admin="true"] { background: var(--pine); color: #fff; }
        .staff-info { display: flex; flex-direction: column; min-width: 0; }
        .staff-name { font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .staff-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 5px; letter-spacing: 0.03em; }
        .staff-badge[data-kind="admin"] { color: var(--pine); background: var(--pine-pale); }
        .staff-badge[data-kind="staff"] { color: var(--muted); background: #EEF1EA; }
        .staff-badge[data-kind="off"] { color: var(--red); background: var(--red-pale); }
        .staff-meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .staff-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .staff-btn { border: 1px solid var(--border); background: #fff; color: var(--ink); border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 600; transition: background-color .12s, opacity .12s; }
        .staff-btn:hover:not(:disabled) { background: var(--pine-pale); }
        .staff-btn:disabled { opacity: .5; cursor: not-allowed; }
        .staff-btn-primary { background: var(--pine); border-color: var(--pine); color: #fff; }
        .staff-btn-primary:hover:not(:disabled) { background: var(--pine-light); }
        .staff-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); cursor: pointer; }
        .staff-switch { width: 34px; height: 20px; border-radius: 999px; border: none; background: #C7D0C0; position: relative; padding: 0; transition: background-color .15s; flex-shrink: 0; }
        .staff-switch span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
        .staff-switch[data-on="true"] { background: var(--pine); }
        .staff-switch[data-on="true"] span { transform: translateX(14px); }
        .staff-switch:disabled { opacity: .5; cursor: not-allowed; }
        .staff-row-edit { align-items: flex-start; flex-direction: column; background: var(--pine-pale); gap: 10px; }
        .staff-edit-fields { display: flex; gap: 10px; flex-wrap: wrap; width: 100%; }
        .staff-field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 200px; font-size: 11.5px; color: var(--muted); font-weight: 500; }
        .staff-field-pin { flex: 0 1 160px; }
        .staff-field input, .staff-add input { padding: 9px 11px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px; background: #fff; color: var(--ink); }
        .staff-hint { font-size: 11.5px; color: var(--muted); margin: 0; }
        .staff-edit-actions { display: flex; gap: 8px; }
        .staff-empty { padding: 28px 16px; text-align: center; color: var(--muted); font-size: 13px; }
        .staff-add { background: var(--paper); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .staff-add-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
        @media (max-width: 600px) {
          .staff-stats { grid-template-columns: 1fr 1fr; }
          .staff-stats .staff-stat:last-child { grid-column: span 2; }
          .staff-pinbar input { width: 100%; }
          .staff-pinbar > label { width: 100%; }
          .staff-actions { width: 100%; padding-left: 48px; }
          .staff-search { max-width: none; }
        }
      `}</style>

      <PageHeader title="Staff accounts" subtitle="Who can sign in, what they can do, and how today is going for each of them." />

      <div className="staff-stats">
        <div className="staff-stat">
          <div className="staff-stat-label">Active staff</div>
          <div className="staff-stat-value pos-serif">{activeCount}</div>
          <div className="staff-stat-sub">can log in</div>
        </div>
        <div className="staff-stat">
          <div className="staff-stat-label">Sold today</div>
          <div className="staff-stat-value pos-serif">{formatMoney(todayTotal, settings.currency)}</div>
          <div className="staff-stat-sub">{todaySales.length} sale{todaySales.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="staff-stat">
          <div className="staff-stat-label">Deactivated</div>
          <div className="staff-stat-value pos-serif">{offCount}</div>
          <div className="staff-stat-sub">{offCount ? 'can be reactivated' : 'none'}</div>
        </div>
      </div>

      <div className="staff-pinbar" data-ready={pinReady ? 'true' : 'false'} data-error={!pinReady && actionError.includes('admin PIN') ? 'true' : 'false'}>
        <div className="staff-pinbar-text">
          <span className="staff-pinbar-icon">{pinReady ? <Check size={15} /> : <Lock size={14} />}</span>
          <span>
            <span className="staff-pinbar-title">{pinReady ? 'Admin PIN entered' : 'Enter your admin PIN to make changes'}</span>
            <span className="staff-pinbar-sub">Needed for adding, editing, deactivating and removing staff. It’s checked on the server and never stored.</span>
          </span>
        </div>
        <label>
          <input ref={adminPinRef} type="password" inputMode="numeric" autoComplete="off" aria-label="Admin PIN" value={adminPin}
            onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
        </label>
      </div>

      {notice && <div className="staff-notice" role="status"><Check size={14} /> {notice}</div>}
      {actionError && <div className="staff-error" role="alert">{actionError}</div>}

      <div className="staff-toolbar">
        <div className="staff-search">
          <Search size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff" aria-label="Search staff" />
        </div>
        <div className="staff-seg" role="tablist">
          {filters.map(([key, label, count]) => (
            <button key={key} role="tab" aria-selected={filter === key} data-on={filter === key ? 'true' : 'false'} onClick={() => setFilter(key)}>
              {label}<small>{count}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="staff-card">
        {visible.length === 0 ? (
          <div className="staff-empty">
            {staffList.length === 0 ? 'No staff yet. Add your first cashier below.' : 'No one matches that search or filter.'}
          </div>
        ) : visible.map(renderRow)}
      </div>

      <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add a cashier</h3>
      <div className="staff-add">
        <div className="staff-add-row">
          <label className="staff-field">
            <span>Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter(add)} placeholder="e.g. Jane Wanjiku" />
          </label>
          <label className="staff-field staff-field-pin">
            <span>4-digit PIN</span>
            <input value={pin} inputMode="numeric" autoComplete="off" onKeyDown={onEnter(add)} placeholder="••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </label>
          <button className="staff-btn staff-btn-primary" onClick={add} disabled={!canAdd} style={{ padding: '10px 18px', fontSize: 13 }}>{busy ? 'Saving…' : 'Add cashier'}</button>
        </div>
        <p className="staff-hint" style={{ marginTop: 10 }}>New cashiers can take sales straight away. Turn on “Can add inventory” in their row if they should manage products too.</p>
      </div>

      {confirmDeactivateId && (() => {
        const s = staffList.find((x) => x.id === confirmDeactivateId);
        if (!s) return null;
        return (
          <ConfirmModal
            title="Deactivate this staff account?"
            message={`"${s.name}" won't be able to log in. Their sales history stays, and you can reactivate them any time with the same PIN. If they're logged in right now, they can keep working until that session expires.`}
            confirmLabel="Deactivate"
            busyLabel="Deactivating…"
            busy={busy}
            error={actionError}
            onCancel={() => setConfirmDeactivateId(null)}
            onConfirm={() => setActive(s.id, false)}
          />
        );
      })()}
      {confirmDeleteId && (() => {
        const s = staffList.find((x) => x.id === confirmDeleteId);
        if (!s) return null;
        return (
          <ConfirmModal
            title="Remove this staff account?"
            message={`"${s.name}" will lose access immediately and won't be able to log in again. This can't be undone. To keep their history and allow a return later, use Deactivate instead.`}
            confirmLabel="Remove"
            busy={busy}
            error={actionError}
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => remove(s.id)}
          />
        );
      })()}
    </div>
  );
}

function PageHeader({ title, subtitle, right }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
        {right}
      </div>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

function SettingsTab({ settings, saveSettings }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const inp = { width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3, background: '#fff' };
  const field = (label, node, hint) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
      {node}
      {hint && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
  const card = (title, subtitle, children) => (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 14px' }}>{subtitle}</p>
      {children}
    </div>
  );
  const themeKey = form.theme || DEFAULT_THEME;
  const save = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Settings" subtitle="Business details, sales rules, security and look. Changes apply to every till once saved." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        {card('Business & receipts', 'Printed at the top and bottom of every receipt.', <>
          {field('Pharmacy name', <input value={form.pharmacyName || ''} onChange={(e) => set('pharmacyName', e.target.value)} style={inp} />)}
          {field('Address', <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="Optional" style={inp} />)}
          {field('Phone', <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="Optional" style={inp} />)}
          {field('Receipt footer', <input value={form.receiptFooter || ''} onChange={(e) => set('receiptFooter', e.target.value)} placeholder="Thank you — get well soon" style={inp} />)}
        </>)}
        {card('Sales', 'How money is shown and taxed.', <>
          {field('Currency symbol', <input value={form.currency || ''} onChange={(e) => set('currency', e.target.value)} style={inp} />)}
          {field('Tax rate (%)', <input type="number" value={form.taxRate} onChange={(e) => set('taxRate', parseFloat(e.target.value) || 0)} style={inp} />, 'Added on top of each sale. Profit figures exclude it.')}
        </>)}
        {card('Security', 'Keep unattended tills locked.', <>
          {field('Auto logout after inactivity (minutes)', <input type="number" min="0" value={form.sessionTimeoutMinutes} onChange={(e) => set('sessionTimeoutMinutes', parseInt(e.target.value) || 0)} style={inp} />, 'Cashiers and admins are logged out after this long with no activity. Set to 0 to disable.')}
        </>)}
        {card('Appearance', 'Applies to every screen and every till.', (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} type="button" onClick={() => set('theme', key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10, minWidth: 78, background: '#fff',
                border: themeKey === key ? '2px solid var(--pine)' : '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {t.swatch.map((c, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />)}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: themeKey === key ? 700 : 500 }}>{t.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '12px 0', background: 'var(--bg)' }}>
        {dirty && <span style={{ fontSize: 12.5, color: 'var(--amber)', fontWeight: 600 }}>Unsaved changes</span>}
        {saved && !dirty && <span style={{ fontSize: 12.5, color: 'var(--pine)', fontWeight: 600 }}>✓ Saved</span>}
        {dirty && <button onClick={() => setForm({ ...settings })} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 13 }}>Discard</button>}
        <button disabled={!dirty || saving} onClick={save} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: dirty ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* App root — auth + live sync                                            */
/* ---------------------------------------------------------------------- */

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [inventoryLog, setInventoryLog] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lastSynced, setLastSynced] = useState('just now');
  const [pendingCount, setPendingCount] = useState(0);
  const [loginNotice, setLoginNotice] = useState('');
  const pollRef = useRef(null);
  const sessionRestored = useRef(false);

  const refreshPending = () => setPendingCount(getDirtyKeys().length + getPendingSyncActions().length);

  const loadAll = useCallback(async () => {
    await flushDirtyKeys();
    await flushPendingSyncActions();
    const [inv, sls, stf, cfg, invLog] = await Promise.all([
      getInventoryRows(),
      getSalesRows(),
      getOrInit('staff', DEFAULT_STAFF),
      getOrInit('settings', DEFAULT_SETTINGS),
      getActivityRows(),
    ]);
    setInventory(inv); setSales(sls); setStaffList(stf); setSettings({ ...DEFAULT_SETTINGS, ...cfg }); setInventoryLog(invLog);
    setLastSynced(new Date().toLocaleTimeString());
    refreshPending();
    setReady(true);
  }, []);

  useEffect(() => {
    loadAll();

    // Instant sync: any device that writes to kv_store, inventory, or
    // sales pushes an update here.
    const channel = supabase
      .channel('kv_store_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, () => {
        loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        loadAll();
      })
      .subscribe();

    // Slow fallback poll — also doubles as the offline retry loop, in case
    // realtime and the 'online' browser event both miss a reconnect.
    pollRef.current = setInterval(loadAll, 15000);

    // React immediately when the browser regains a connection, instead of
    // waiting for the next poll.
    const handleOnline = () => loadAll();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadAll]);

  // Session persistence: keep the cashier/admin logged in across a page
  // refresh by remembering their staff id and session token in this
  // browser only. The token (not just the id) is what save-kv actually
  // checks, so restoring an expired one is only a display nicety here —
  // the server rejects it regardless.
  useEffect(() => {
    if (!ready || sessionRestored.current) return;
    sessionRestored.current = true;
    const savedId = localStorage.getItem(SESSION_KEY);
    const exp = sessionToken ? tokenExpiresAt(sessionToken) : null;
    if (!savedId || !sessionToken || !exp || Date.now() > exp) {
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      return;
    }
    const match = staffList.find((s) => s.id === savedId);
    if (match) {
      // Take name from the cached staff list, but role/canManageInventory
      // from the token itself — that's what the server will actually
      // honor for the rest of this session.
      const claims = tokenClaims(sessionToken);
      setUser(claims ? { ...match, role: claims.role, canManageInventory: claims.canManageInventory } : match);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
    }
  }, [ready, staffList]);

  const handleLogin = (staffMember, token) => {
    setSessionToken(token);
    // staff-login returns { id, role, canManageInventory } — canManageInventory
    // here is the server-verified value baked into the session token, and
    // is what actually gates manage-inventory, so it wins over whatever
    // the locally-cached staff list (from kv_store) currently shows. Only
    // the display name comes from that cached list.
    const profile = staffList.find((s) => s.id === staffMember.id);
    const fullUser = {
      id: staffMember.id,
      name: (profile && profile.name) || (staffMember.role === 'admin' ? 'Admin' : 'Staff'),
      role: staffMember.role,
      canManageInventory: !!staffMember.canManageInventory,
    };
    setUser(fullUser);
    setLoginNotice('');
    localStorage.setItem(SESSION_KEY, fullUser.id);
  };
  const handleLogout = () => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // Auto-logout after inactivity — shared/left-open terminals shouldn't stay
  // signed in indefinitely under whoever's PIN unlocked them. Any mouse,
  // keyboard, or touch activity resets the timer; a fresh page load also
  // resets it. Configurable per-pharmacy in Settings; 0 disables it.
  useEffect(() => {
    if (!user) return undefined;
    const minutes = Number(settings.sessionTimeoutMinutes);
    if (!minutes || minutes <= 0) return undefined;
    const limitMs = minutes * 60 * 1000;
    let timer = null;

    const trigger = () => {
      setLoginNotice("You were logged out after a period of inactivity.");
      handleLogout();
    };
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(trigger, limitMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.sessionTimeoutMinutes]);

  // Buying prices live in a server-only table (inventory_costs), never in the
  // anon-readable inventory table, so a till can't read them. Only an admin
  // session fetches them, and they're merged in just for the admin console.
  const isAdmin = !!user && user.role === 'admin';
  const [costs, setCosts] = useState({});
  useEffect(() => {
    if (!isAdmin) { setCosts({}); return; }
    let cancelled = false;
    invokeFn('manage-inventory', { body: { token: sessionToken, action: 'list-costs' } })
      .then(({ data }) => { if (!cancelled && data && data.costs) setCosts((prev) => ({ ...data.costs, ...prev })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin, inventory.length]);
  const adminInventory = useMemo(() => inventory.map((p) => ({ ...p, cost: costs[p.id] || 0 })), [inventory, costs]);
  const saveInventoryAdmin = (next) => {
    const costMap = {}; const nextCosts = { ...costs };
    for (const p of next) {
      const c = Math.max(0, Number(p.cost) || 0);
      if ((costs[p.id] || 0) !== c) { costMap[p.id] = c; nextCosts[p.id] = c; }
    }
    if (Object.keys(costMap).length) setCosts(nextCosts);
    return saveInventory(next.map(({ cost, ...rest }) => rest), costMap); // cost never enters shared state or the local cache
  };

  const saveInventory = async (next, costMap) => {
    // Diff against what's currently loaded so InventoryTab's existing
    // "compute the whole next array" style keeps working unchanged — this
    // is the only place that translates it into the per-row calls the new
    // table actually needs.
    const prevById = new Map(inventory.map((p) => [p.id, p]));
    const nextById = new Map(next.map((p) => [p.id, p]));
    const actions = [];
    for (const [id, product] of nextById) {
      const before = prevById.get(id);
      const costChanged = !!costMap && Object.prototype.hasOwnProperty.call(costMap, id);
      if (!before || costChanged || JSON.stringify(before) !== JSON.stringify(product)) {
        // If this edit doesn't change stock, tell the server to leave the stock
        // column alone, so a sale that landed meanwhile isn't overwritten.
        const keepStock = !!before && Number(before.stock) === Number(product.stock);
        actions.push({ type: 'upsert', product: { ...product, ...(costChanged ? { cost: costMap[id] } : null), ...(keepStock ? { keepStock: true } : null) } });
      }
    }
    for (const id of prevById.keys()) {
      if (!nextById.has(id)) actions.push({ type: 'delete', id });
    }

    // Optimistic UI: reflect the edit immediately regardless of network.
    setInventory(next);
    writeCache('inventory', next);

    // A real rejection (bad fields, a SKU collision — see
    // inventory_sku_unique_idx) isn't retried like a network drop is; it
    // would fail the exact same way every time. Previously that just went
    // to console.error and nothing else, leaving the optimistic update
    // above uncorrected — the admin would see the product as saved right
    // up until the next reload silently reverted it, with no idea why.
    // Collected here so the caller (InventoryTab) can show it and undo
    // the optimistic change for anything that didn't actually save.
    const rejected = [];
    for (const action of actions) {
      try {
        const { error } = await invokeFn('manage-inventory', {
          body: { token: sessionToken, action: action.type, product: action.product, id: action.id },
        });
        if (error && error.network) queueSyncAction(action);
        else if (error) {
          console.error('Inventory edit rejected:', action, error.message);
          rejected.push({ action, message: error.message });
        }
      } catch (e) {
        queueSyncAction(action);
      }
    }
    refreshPending();
    setLastSynced(new Date().toLocaleTimeString());

    if (rejected.length > 0) {
      setInventory((current) => {
        let reverted = current;
        for (const { action } of rejected) {
          if (action.type === 'upsert') {
            const before = prevById.get(action.product.id);
            reverted = before
              ? reverted.map((p) => (p.id === action.product.id ? before : p))
              : reverted.filter((p) => p.id !== action.product.id);
          } else if (action.type === 'delete') {
            const before = prevById.get(action.id);
            if (before && !reverted.some((p) => p.id === action.id)) reverted = [...reverted, before];
          }
        }
        writeCache('inventory', reverted);
        return reverted;
      });
    }

    return { ok: rejected.length === 0, errors: rejected.map((r) => r.message) };
  };
  const logInventoryChange = async ({ action, productName, sku, detail, before, after, refId }) => {
    const entry = {
      id: genId('log'),
      timestamp: new Date().toISOString(),
      staffId: user?.id,
      staffName: user?.name || 'Unknown',
      action, productName, sku, detail,
      before: before || null, after: after || null, refId: refId || null, amount: null,
    };
    // Show it straight away; the server row (and realtime) confirms it.
    setInventoryLog((prev) => [entry, ...prev]);
    const payload = { id: entry.id, action, subject: productName, sku, detail, before: before || null, after: after || null, refId: refId || null };
    try {
      const { error } = await invokeFn('log-activity', { body: { token: sessionToken, ...payload } });
      if (error) {
        if (error.network) { queueSyncAction({ type: 'log-activity', entry: payload }); refreshPending(); }
        else console.error('Activity log rejected (not retried):', error.message);
      }
    } catch (e) {
      queueSyncAction({ type: 'log-activity', entry: payload });
      refreshPending();
    }
  };
  const saveStaffList = async (next) => {
    setStaffList(next);
    await saveShared('staff', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const saveSettingsFn = async (next) => {
    setSettings(next);
    await saveShared('settings', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const addSale = async (sale) => {
    // Optimistic UI: reflect the new sale on this device immediately,
    // regardless of network. The server write below is a plain INSERT of
    // one new row (see record-sale/index.ts) — two tills checking out at
    // the same instant each insert their own row, so neither can overwrite
    // the other's sale the way the old whole-array save-kv write could.
    const next = [...sales, sale];
    setSales(next);
    writeCache('sales', next);

    try {
      const { error } = await invokeFn('record-sale', { body: { token: sessionToken, action: 'insert', sale } });
      if (error) {
        if (error.network) {
          // Offline — queue it, retried automatically once back online.
          // The insert is idempotent by sale id, so a retry after a
          // connection drop (even if the first attempt actually landed)
          // can't create a duplicate.
          queueSyncAction({ type: 'record-sale', saleAction: 'insert', sale });
          refreshPending();
        } else {
          // The server refused the sale, so it is NOT in the database.
          console.error('Sale insert rejected (not retried):', error.message);

          // 1. Take it out of this till's local list so totals stay honest.
          setSales((prev) => {
            const n = prev.filter((s) => s.id !== sale.id);
            writeCache('sales', n);
            return n;
          });

          // 2. Put the stock back (completeSale already decremented it).
          const items = (sale.items || []).map((i) => ({ id: i.id, qty: i.qty }));
          setInventory((prev) => {
            const n = prev.map((p) => {
              const it = items.find((i) => i.id === p.id);
              return it ? { ...p, stock: p.stock + it.qty } : p;
            });
            writeCache('inventory', n);
            return n;
          });
          try {
            await invokeFn('adjust-stock', { body: { token: sessionToken, items, direction: 'increment' } });
          } catch (e) {
            queueSyncAction({ type: 'adjust-stock', items, direction: 'increment' });
            refreshPending();
          }

          // 3. Tell the cashier — otherwise this fails silently.
          const ref = sale.mpesaReceipt || sale.paymentRef || sale.paymentTxnId;
          window.alert(
            `This sale of KSh ${Number(sale.total).toFixed(2)} was NOT saved.\n\n${error.message}` +
            (ref ? `\n\nPayment reference: ${ref}. Note it down and tell the admin.` : '')
          );
        }
      }
    } catch (e) {
      queueSyncAction({ type: 'record-sale', saleAction: 'insert', sale });
      refreshPending();
    }
    setLastSynced(new Date().toLocaleTimeString());
  };
  const updateStock = async (items) => {
    // Optimistic UI: the sale already happened at the till, so reflect the
    // new stock immediately. The atomic decrement below is what makes the
    // *server's* number correct even if two tills do this at once — this
    // local update is just so the cashier isn't staring at stale numbers.
    const next = inventory.map((p) => {
      const sold = items.find((i) => i.id === p.id);
      return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
    });
    setInventory(next);
    writeCache('inventory', next);

    try {
      const { error } = await invokeFn('adjust-stock', { body: { token: sessionToken, items } });
      if (error) {
        if (error.network) {
          // Offline — queue it, retried automatically once back online.
          queueSyncAction({ type: 'adjust-stock', items });
          refreshPending();
        } else {
          // A real rejection — most likely someone else already sold the
          // last unit between this device's last sync and this sale. The
          // sale itself already went through (addSale ran separately), so
          // this isn't blocked at checkout — it's surfaced here so it
          // doesn't just vanish silently.
          console.error('Stock adjustment rejected (not retried):', error.message);
        }
      }
    } catch (e) {
      queueSyncAction({ type: 'adjust-stock', items });
      refreshPending();
    }
  };

  // Relative stock change for Quick adjust. Sends "+N" / "-N" to the same
  // atomic increment/decrement the till uses, so a sale that lands while
  // someone is adjusting is never overwritten — the server applies the
  // change to whatever the stock is *now*. Returns { ok, newStock, message }.
  const adjustStockBy = async (id, delta) => {
    const d = Math.trunc(Number(delta));
    if (!id || !Number.isFinite(d) || d === 0) return { ok: false, message: 'Nothing to change.' };
    const items = [{ id, qty: Math.abs(d) }];
    const direction = d > 0 ? 'increment' : 'decrement';
    const apply = (amount) => setInventory((cur) => {
      const nxt = cur.map((p) => (p.id === id ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) + amount) } : p));
      writeCache('inventory', nxt);
      return nxt;
    });
    apply(d); // optimistic
    try {
      const { data, error } = await invokeFn('adjust-stock', { body: { token: sessionToken, items, direction } });
      if (error) {
        if (error.network) {
          queueSyncAction({ type: 'adjust-stock', items, direction });
          refreshPending();
          return { ok: true, queued: true };
        }
        apply(-d); // rejected — undo the optimistic change
        return { ok: false, message: error.message };
      }
      const r = data && data.results && data.results[0];
      if (r && r.ok && Number.isFinite(Number(r.newStock))) {
        // Snap to the server's real number (it may differ if a till sold meanwhile).
        setInventory((cur) => {
          const nxt = cur.map((p) => (p.id === id ? { ...p, stock: Number(r.newStock) } : p));
          writeCache('inventory', nxt);
          return nxt;
        });
        setLastSynced(new Date().toLocaleTimeString());
        return { ok: true, newStock: Number(r.newStock) };
      }
      return { ok: true };
    } catch (e) {
      queueSyncAction({ type: 'adjust-stock', items, direction });
      refreshPending();
      return { ok: true, queued: true };
    }
  };

  // Reverses a completed sale: marks it voided (kept in the record for the
  // audit trail, not deleted) and restocks whatever it sold. Available to
  // both admins (any sale) and cashiers (their own same-day sales).
  const voidSale = async (saleId, reason) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.voided) return false;

    const voidedBy = user?.name || 'Unknown';
    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      voided: true,
      voidReason: reason || '',
      voidedAt: new Date().toISOString(),
      voidedBy,
    } : s));
    setSales(nextSales);
    writeCache('sales', nextSales);

    try {
      // Atomic per-row patch (see patch_sale in sales-migration.sql) —
      // touches only this sale, so it can't clobber a different sale
      // another till is writing to at the same time.
      const { error } = await invokeFn('record-sale', {
        body: { token: sessionToken, action: 'void', id: saleId, reason, voidedBy },
      });
      if (error) {
        if (error.network) queueSyncAction({ type: 'record-sale', saleAction: 'void', id: saleId, reason, voidedBy });
        else console.error('Sale void rejected (not retried):', error.message);
      }
    } catch (e) {
      queueSyncAction({ type: 'record-sale', saleAction: 'void', id: saleId, reason, voidedBy });
    }

    const restockItems = sale.items.map((i) => ({ id: i.id, qty: i.qty }));
    const nextInventory = inventory.map((p) => {
      const found = sale.items.find((i) => i.id === p.id);
      return found ? { ...p, stock: p.stock + found.qty } : p;
    });
    setInventory(nextInventory);
    writeCache('inventory', nextInventory);
    try {
      const { error } = await invokeFn('adjust-stock', {
        body: { token: sessionToken, items: restockItems, direction: 'increment' },
      });
      if (error) {
        if (error.network) queueSyncAction({ type: 'adjust-stock', items: restockItems, direction: 'increment' });
        else console.error('Restock on void rejected:', error.message);
      }
    } catch (e) {
      queueSyncAction({ type: 'adjust-stock', items: restockItems, direction: 'increment' });
    }

    setLastSynced(new Date().toLocaleTimeString());
    return true;
  };

  // Marks a "sale on account" as collected — used once the customer pays
  // off what they owe, recording how and by whom. mpesaReceipt is only
  // set when the balance was collected via a live STK push prompt (see
  // AccountMpesaModal) rather than just picked from the method dropdown.
  const settleAccountSale = async (saleId, method, mpesaReceipt, paymentRef, paymentTxnId) => {
    const settledBy = user?.name || 'Unknown';
    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      settled: true,
      settledAt: new Date().toISOString(),
      settledBy,
      settledMethod: method || 'cash',
      ...(mpesaReceipt ? { mpesaReceipt } : {}),
      ...(paymentRef ? { paymentRef } : {}),
      ...(paymentTxnId ? { paymentTxnId } : {}),
    } : s));
    setSales(nextSales);
    writeCache('sales', nextSales);

    try {
      const { error } = await invokeFn('record-sale', {
        body: { token: sessionToken, action: 'settle', id: saleId, method, settledBy, mpesaReceipt, paymentRef, paymentTxnId },
      });
      if (error) {
        if (error.network) queueSyncAction({ type: 'record-sale', saleAction: 'settle', id: saleId, method, settledBy, mpesaReceipt, paymentRef, paymentTxnId });
        else console.error('Sale settle rejected (not retried):', error.message);
      }
    } catch (e) {
      queueSyncAction({ type: 'record-sale', saleAction: 'settle', id: saleId, method, settledBy, mpesaReceipt, paymentRef, paymentTxnId });
    }
    setLastSynced(new Date().toLocaleTimeString());
  };

  if (!ready) {
    return (
      <div className="pos-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{buildStyles(settings.theme)}</style>
        <div style={{ width: 320, maxWidth: '100%', padding: '0 24px' }}>
          <div className="pos-skeleton" style={{ width: 52, height: 52, borderRadius: 12, margin: '0 auto 18px' }} />
          <div className="pos-skeleton" style={{ width: '55%', height: 15, margin: '0 auto 10px' }} />
          <div className="pos-skeleton" style={{ width: '35%', height: 11, margin: '0 auto 26px' }} />
          <div className="pos-skeleton" style={{ width: '100%', height: 42, borderRadius: 10, marginBottom: 10 }} />
          <div className="pos-skeleton" style={{ width: '100%', height: 42, borderRadius: 10 }} />
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, marginTop: 22 }}>Loading pharmacy data…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen settings={settings} onLogin={handleLogin} notice={loginNotice} />;
  }

  if (user.role === 'admin') {
    return (
      <AdminConsole inventory={adminInventory} sales={sales} staffList={staffList} settings={settings}
        user={user} onLogout={handleLogout} lastSynced={lastSynced}
        saveInventory={saveInventoryAdmin} adjustStockBy={adjustStockBy} saveStaff={saveStaffList} saveSettings={saveSettingsFn}
        inventoryLog={inventoryLog} logInventoryChange={logInventoryChange}
        voidSale={voidSale} settleAccountSale={settleAccountSale} />
    );
  }

  return (
    <StaffPOS inventory={inventory} sales={sales} settings={settings} user={user}
      addSale={addSale} updateStock={updateStock} lastSynced={lastSynced} onLogout={handleLogout}
      saveInventory={saveInventory} adjustStockBy={adjustStockBy} logInventoryChange={logInventoryChange} voidSale={voidSale}
      settleAccountSale={settleAccountSale} />
  );
}

/* ---------------------------------------------------------------------- */
/* Mount                                                                  */
/* ---------------------------------------------------------------------- */

function ConfigMissing() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: 24, background: '#EEF1EA'
    }}>
      <div style={{ maxWidth: 460, background: '#FBF9F3', border: '1px solid #D9DFD4', borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 18, marginBottom: 10 }}>Almost there</h1>
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>
          {configCheck.reason} See <code>SETUP-GUIDE.md</code> for exact steps.
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(configReady ? <App /> : <ConfigMissing />);
