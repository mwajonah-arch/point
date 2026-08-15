import React, { useState, useEffect, useRef, useCallback, useMemo } from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, LogOut, Package, TrendingUp,
  AlertTriangle, Users, Settings as SettingsIcon, Receipt, CheckCircle, X,
  Pill, Edit2, ChevronRight, Banknote, CreditCard, Smartphone, LayoutDashboard,
  ClipboardList, Info, Printer, MessageCircle, Camera, MoreHorizontal
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
    try {
      const body = await error.context.json();
      if (body && body.error) message = body.error;
    } catch (e) {
      // Response wasn't JSON (e.g. a network failure) — keep the generic message.
    }
    return { data: null, error: { message } };
  }
  return { data, error: null };
}

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

/* ---------------------------------------------------------------------- */
/* Storage helpers — backed by Supabase, shared across every device       */
/*                                                                        */
/* Every key also mirrors into localStorage on this device. If a save     */
/* can't reach Supabase (no signal / wifi down), the change still applies */
/* immediately on screen and is marked "dirty" locally. Dirty keys are    */
/* retried automatically — on a timer, and the moment the browser         */
/* reports it's back online — until they successfully sync.               */
/* ---------------------------------------------------------------------- */

const STORE_KEYS = ['inventory', 'sales', 'staff', 'settings', 'inventoryLog'];
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

function StaffPOS({ inventory, sales, settings, user, addSale, updateStock, lastSynced, onLogout, saveInventory, logInventoryChange, voidSale, settleAccountSale }) {
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

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return c;
        return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { id: product.id, name: product.name, price: product.price, qty: 1, requiresRx: product.requiresRx, maxStock: product.stock }];
    });
    // Brief visual confirmation that the tap registered — most useful on
    // the mobile drawer layout, where the cart panel isn't on screen.
    setFlashId(product.id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 600);
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
        addToCart(product);
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

  const scannerListening = !checkoutOpen && !summaryOpen && !inventoryOpen && !accountsOpen && !drugInfoProduct && !scannerOpen;
  useBarcodeScanner(handleBarcodeScan, scannerListening);

  const changeQty = (id, delta) => {
    setCart((c) => c.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (next <= 0) return i;
      if (next > i.maxStock) return i;
      return { ...i, qty: next };
    }));
  };

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax;

  const completeSale = (payment) => {
    const sale = {
      id: genId('sale'),
      timestamp: new Date().toISOString(),
      cashier: user.name,
      items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      subtotal, tax, total,
      paymentMethod: payment.method,
      amountTendered: payment.tendered ?? total,
      change: payment.change ?? 0,
      mpesaReceipt: payment.mpesaReceipt || null,
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

            <div style={{ fontSize: 12, opacity: 0.85 }}>{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</div>
          </div>
        } />

      <div className="pos-staff-layout">
        {/* Product browser */}
        <div className="pos-product-panel pos-scroll">
          <div className="pos-filter-row">
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }} />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or SKU"
                style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setScannerOpen(true)} title="Scan a barcode with the camera — or just fire a USB/Bluetooth scanner any time" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13
            }}>
              <Camera size={15} color="var(--pine)" />
              Scan
            </button>
          </div>

          {showFrequentRow && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>Frequently sold</div>
              <div className="pos-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {frequentProducts.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} style={{
                    flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                    padding: '8px 12px', borderRadius: 9, minWidth: 112, textAlign: 'left',
                    border: flashId === p.id ? '1px solid var(--pine)' : '1px solid var(--border)',
                    background: flashId === p.id ? 'var(--pine-pale)' : '#fff',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease'
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</span>
                    <span className="pos-mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{formatMoney(p.price, settings.currency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pos-product-grid">
            {filtered.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              const expDays = daysUntilExpiry(p.expiry);
              const expiringSoon = expDays !== null && expDays <= EXPIRY_WINDOW_DAYS;
              return (
                <div key={p.id} onClick={() => !out && addToCart(p)} role="button" tabIndex={0} style={{
                  textAlign: 'left', background: 'var(--paper)', border: '1px dashed var(--border)',
                  borderRadius: 10, padding: '14px 14px 12px', position: 'relative',
                  opacity: out ? 0.5 : 1, cursor: out ? 'not-allowed' : 'pointer'
                }}>
                  {flashId === p.id && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(22,66,60,0.88)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff',
                      fontSize: 13, fontWeight: 600, pointerEvents: 'none'
                    }}>
                      <CheckCircle size={16} /> Added
                    </div>
                  )}
                  <button className="pos-icon-btn" onClick={(e) => { e.stopPropagation(); setDrugInfoProduct(p); }} title="AI dosage / side effects / interactions lookup" style={{
                    position: 'absolute', top: 6, right: 6, color: 'var(--muted)', opacity: 0.6
                  }}><Info size={13} /></button>
                  {p.requiresRx && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--amber)', border: '1px solid var(--amber)',
                      borderRadius: 5, padding: '1px 5px', marginBottom: 4, display: 'inline-block'
                    }}>℞ Rx</span>
                  )}
                  <div className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, lineHeight: 1.25, paddingRight: 18 }}>{p.name}</div>
                  <div className="pos-mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 8 }}>{p.category} · {p.sku}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="pos-mono" style={{ fontSize: 15, fontWeight: 500 }}>{formatMoney(p.price, settings.currency)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                      background: out ? 'var(--red-pale)' : low ? 'var(--amber-pale)' : 'var(--pine-pale)',
                      color: out ? 'var(--red)' : low ? 'var(--amber)' : 'var(--pine)'
                    }}>{out ? 'Out of stock' : low ? `${p.stock} left` : `${p.stock} in stock`}</span>
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
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} />
              <span className="pos-serif" style={{ fontWeight: 600, fontSize: 15 }}>Current sale</span>
            </div>
            <button className="pos-cart-close-btn pos-icon-btn" onClick={() => setCartOpen(false)} title="Close cart" style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }} className="pos-scroll">
            {cart.length === 0 && <EmptyState icon={ShoppingCart} title="Cart is empty" subtitle="Tap a product to add it to the sale." />}
            {cart.map((i) => (
              <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{i.name}{i.requiresRx ? ' ℞' : ''}</span>
                  <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => removeFromCart(i.id)} title="Remove from cart" style={{ color: 'var(--muted)' }}><Trash2 size={13} /></button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => changeQty(i.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span className="pos-mono" style={{ fontSize: 13, minWidth: 16, textAlign: 'center' }}>{i.qty}</span>
                    <button onClick={() => changeQty(i.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                  <span className="pos-mono" style={{ fontSize: 13 }}>{formatMoney(i.price * i.qty, settings.currency)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Subtotal</span><span className="pos-mono">{formatMoney(subtotal, settings.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              <span>Tax ({settings.taxRate}%)</span><span className="pos-mono">{formatMoney(tax, settings.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              <span className="pos-serif">Total</span><span className="pos-mono">{formatMoney(total, settings.currency)}</span>
            </div>
            <button onClick={() => { setCheckoutOpen(true); setCartOpen(false); }} disabled={cart.length === 0} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: cart.length === 0 ? '#B9C4B4' : 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: 15
            }}>Charge {cart.length > 0 ? formatMoney(total, settings.currency) : ''}</button>
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
        <CheckoutModal cart={cart} subtotal={subtotal} tax={tax} total={total} settings={settings}
          onClose={() => setCheckoutOpen(false)} onComplete={completeSale} />
      )}
      {receipt && <ReceiptModal sale={receipt} settings={settings} onClose={() => { setReceipt(null); setCartOpen(false); }} />}
      {summaryOpen && <CashierSummaryModal sales={sales} settings={settings} user={user} onClose={() => setSummaryOpen(false)} voidSale={voidSale} />}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
      {scannerOpen && <BarcodeScannerModal onDetect={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}
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
          <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} user={user} logInventoryChange={logInventoryChange} />
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

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
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
            <Field label="Contraindications" value={info.contraindications} />
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

function CheckoutModal({ cart, subtotal, tax, total, settings, onClose, onComplete }) {
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [rxConfirmed, setRxConfirmed] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('idle'); // idle | sending | waiting | success | failed | timeout
  const [mpesaError, setMpesaError] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const pollTimer = useRef(null);
  const needsRx = cart.some((i) => i.requiresRx);
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === 'cash' ? Math.max(0, tenderedNum - total) : 0;
  const canComplete = (!needsRx || rxConfirmed) && (method !== 'cash' || tenderedNum >= total) && (method !== 'account' || customerName.trim().length > 0);

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  // Once M-Pesa confirms payment, finish the sale automatically.
  useEffect(() => {
    if (method === 'mpesa' && mpesaStatus === 'success') {
      onComplete({ method: 'mpesa', tendered: total, change: 0, mpesaReceipt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpesaStatus]);

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
            setMpesaReceipt(data.mpesa_receipt);
            setMpesaStatus('success');
          } else {
            setMpesaError(data.result_desc || 'The customer did not complete the payment.');
            setMpesaStatus('failed');
          }
          return;
        }
      } catch (e) { /* keep polling */ }
      if (attempts >= 30) { // ~60 seconds
        clearInterval(pollTimer.current);
        setMpesaStatus((s) => (s === 'waiting' ? 'timeout' : s));
      }
    }, 2000);
  };

  const sendMpesaRequest = async () => {
    setMpesaError('');
    setMpesaStatus('sending');
    const saleRef = 'POS' + Date.now().toString().slice(-8);
    try {
      const { data, error } = await invokeFn('mpesa-stk-push', {
        body: { phone: mpesaPhone, amount: total, saleRef },
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

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Complete sale</span>
          <button className="pos-icon-btn" onClick={onClose} title="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <div className="pos-scroll" style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14 }}>
          {cart.map((i, idx) => (
            <div key={i.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              padding: '8px 12px', fontSize: 12.5, borderBottom: idx < cart.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ flex: 1 }}>
                {i.name}{i.requiresRx ? ' ℞' : ''}
                <span className="pos-mono" style={{ color: 'var(--muted)', marginLeft: 6 }}>×{i.qty}</span>
              </span>
              <span className="pos-mono" style={{ whiteSpace: 'nowrap' }}>{formatMoney(i.price * i.qty, settings.currency)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          <span className="pos-serif">Total due</span>
          <span className="pos-mono">{formatMoney(total, settings.currency)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'cash', label: 'Cash', Icon: Banknote },
            { key: 'card', label: 'Card', Icon: CreditCard },
            { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
            { key: 'account', label: 'On account', Icon: Users },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setMethod(key)} style={{
              flex: '1 1 70px', padding: '10px 0', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: method === key ? '1px solid var(--pine)' : '1px solid var(--border)',
              background: method === key ? 'var(--pine-pale)' : '#fff', color: method === key ? 'var(--pine)' : 'var(--ink)', fontSize: 12, fontWeight: 500
            }}><Icon size={16} />{label}</button>
          ))}
        </div>

        {method === 'cash' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Amount tendered</label>
            <input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={formatMoney(total, settings.currency)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[50, 100, 200, 500, 1000].map((amt) => (
                <button key={amt} type="button" onClick={() => setTendered((t) => String((parseFloat(t) || 0) + amt))}
                  style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 12, fontWeight: 600 }}>
                  +{settings.currency} {amt}
                </button>
              ))}
              <button type="button" onClick={() => setTendered(String(total))}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--pine)', background: 'var(--pine-pale)', color: 'var(--pine)', fontSize: 12, fontWeight: 600 }}>
                Exact amount
              </button>
              {tendered !== '' && (
                <button type="button" onClick={() => setTendered('')}
                  style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--muted)', fontSize: 12 }}>
                  Clear
                </button>
              )}
            </div>
            {tenderedNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, color: tenderedNum < total ? 'var(--red)' : 'var(--muted)' }}>
                <span>{tenderedNum < total ? 'Insufficient amount' : 'Change due'}</span>
                <span className="pos-mono">{tenderedNum < total ? '' : formatMoney(change, settings.currency)}</span>
              </div>
            )}
          </div>
        )}

        {method === 'account' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Customer name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Wanjiku Kamau"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4, marginBottom: 10 }} />
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Phone (optional)</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>This sale will be recorded as unpaid on the customer's account until it's settled from the Accounts tab.</p>
          </div>
        )}

        {method === 'mpesa' && (
          <div style={{ marginBottom: 16 }}>
            {(mpesaStatus === 'idle' || mpesaStatus === 'sending' || mpesaStatus === 'failed') && (
              <>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Customer's M-Pesa number</label>
                <input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
                {mpesaError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{mpesaError}</p>}
                <button type="button" onClick={sendMpesaRequest}
                  disabled={!mpesaPhone || mpesaStatus === 'sending' || (needsRx && !rxConfirmed)}
                  style={{
                    marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 8,
                    border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontWeight: 600, fontSize: 14,
                    opacity: (!mpesaPhone || mpesaStatus === 'sending' || (needsRx && !rxConfirmed)) ? 0.5 : 1
                  }}>
                  {mpesaStatus === 'sending' ? 'Sending request…' : mpesaError ? 'Try again' : 'Send payment request'}
                </button>
              </>
            )}
            {(mpesaStatus === 'waiting' || mpesaStatus === 'timeout') && (
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ width: 34, height: 34, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  {mpesaStatus === 'timeout' ? 'Still waiting — ask the customer to check their phone.' : `A prompt was sent to ${mpesaPhone}.`}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ask them to enter their M-Pesa PIN to complete the payment.</p>
                {mpesaStatus === 'timeout' && (
                  <button type="button" onClick={sendMpesaRequest} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontSize: 13 }}>
                    Resend request
                  </button>
                )}
              </div>
            )}
            {mpesaStatus === 'success' && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--pine)' }}>
                <CheckCircle size={24} style={{ marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>Payment received{mpesaReceipt ? ` — ${mpesaReceipt}` : ''}</p>
              </div>
            )}
          </div>
        )}

        {needsRx && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 16, padding: 10, background: 'var(--amber-pale)', borderRadius: 8, color: '#5C3A12' }}>
            <input type="checkbox" checked={rxConfirmed} onChange={(e) => setRxConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
            I have verified a valid prescription for the item(s) marked ℞.
          </label>
        )}

        {method !== 'mpesa' && (
          <button onClick={() => onComplete({
            method, tendered: method === 'cash' ? tenderedNum : total, change,
            customerName: method === 'account' ? customerName.trim() : undefined,
            customerPhone: method === 'account' ? customerPhone.trim() : undefined,
          })} disabled={!canComplete} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
            background: canComplete ? 'var(--pine)' : '#B9C4B4', color: '#fff'
          }}>Confirm payment</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>M-Pesa receipt</span><span>{sale.mpesaReceipt}</span></div>
        )}
        {sale.paymentMethod === 'account' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Customer</span><span>{sale.customerName}{sale.customerPhone ? ` (${sale.customerPhone})` : ''}</span></div>
            <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--amber)', marginTop: 8 }}>UNPAID — on account</div>
          </>
        )}
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>Thank you — get well soon</div>
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
  saveInventory, saveStaff, saveSettings, inventoryLog, logInventoryChange, voidSale, settleAccountSale }) {
  const [tab, setTab] = useState('dashboard');
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
            <button key={key} onClick={() => setTab(key)} className="pos-admin-nav-btn" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', marginBottom: 4, textAlign: 'left', fontSize: 14,
              background: tab === key ? 'var(--pine)' : 'transparent', color: tab === key ? '#fff' : 'var(--ink)'
            }}><Icon size={16} />{label}</button>
          ))}
        </div>
        <div className="pos-admin-content pos-scroll">
          {tab === 'dashboard' && <DashboardTab inventory={inventory} sales={sales} settings={settings} />}
          {tab === 'inventory' && <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} user={user} logInventoryChange={logInventoryChange} />}
          {tab === 'activity' && <ActivityTab inventoryLog={inventoryLog} />}
          {tab === 'sales' && <SalesTab sales={sales} settings={settings} voidSale={voidSale} />}
          {tab === 'accounts' && <AccountsTab sales={sales} settings={settings} settleAccountSale={settleAccountSale} />}
          {tab === 'staff' && <StaffTab staffList={staffList} saveStaff={saveStaff} />}
          {tab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div className="pos-serif" style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

// Interactive 7-day revenue chart — tap/click a day to see its totals.
// Plain divs sized by percentage, no charting library needed.
function RevenueTrend({ sales, settings }) {
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
        count: daySales.length,
      });
    }
    return arr;
  }, [sales]);

  const [selected, setSelected] = useState(6); // default to today
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const sel = days[selected];

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600 }}>Last 7 days</h3>
        <div style={{ textAlign: 'right' }}>
          <div className="pos-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(sel.revenue, settings.currency)}</div>
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
              height: `${Math.max(4, (d.revenue / max) * 66)}px`,
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

// Whether a timestamp falls within a given reporting window, anchored to
// calendar boundaries (start of today / start of this week / start of this
// month) rather than a rolling N-day lookback, since that's what a pharmacy
// owner planning restocks or checking in on the month actually expects.
function isInDashboardRange(timestamp, range) {
  const d = new Date(timestamp);
  const now = new Date();
  if (range === 'today') return isSameDay(timestamp, now);
  if (range === 'week') {
    const start = new Date(now);
    const dow = start.getDay(); // 0 = Sun
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    return d >= start && d <= now;
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= start && d <= now;
  }
  return true;
}

const DASHBOARD_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

function DashboardTab({ inventory, sales, settings }) {
  const [range, setRange] = useState('today');
  const rangeLabel = DASHBOARD_RANGES.find((r) => r.key === range).label;
  const rangeSales = sales.filter((s) => isInDashboardRange(s.timestamp, range) && !s.voided);
  const revenue = rangeSales.reduce((sum, s) => sum + s.total, 0);
  const lowStock = inventory.filter((p) => p.stock <= p.reorderLevel);
  const expiringSoon = inventory
    .filter((p) => p.stock > 0 && daysUntilExpiry(p.expiry) !== null && daysUntilExpiry(p.expiry) <= EXPIRY_WINDOW_DAYS)
    .sort((a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry));
  const recent = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

  // What's actually moving, for the selected window — the most actionable
  // number for restock decisions, since low-stock alone doesn't say whether
  // a slow mover is worth reordering.
  const topSelling = useMemo(() => {
    const counts = {};
    for (const s of rangeSales) {
      for (const item of s.items || []) {
        if (!counts[item.id]) counts[item.id] = { name: item.name, qty: 0, revenue: 0 };
        counts[item.id].qty += item.qty;
        counts[item.id].revenue += item.price * item.qty;
      }
    }
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [rangeSales]);

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
        <StatCard label={`Revenue ${range === 'today' ? 'today' : rangeLabel.toLowerCase()}`} value={formatMoney(revenue, settings.currency)} />
        <StatCard label={`Transactions ${range === 'today' ? 'today' : rangeLabel.toLowerCase()}`} value={rangeSales.length} />
        <StatCard label="Products tracked" value={inventory.length} />
        <StatCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? 'var(--red)' : undefined} />
        <StatCard label="Expiring within 30d" value={expiringSoon.length} accent={expiringSoon.length ? 'var(--red)' : undefined} />
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RevenueTrend sales={sales} settings={settings} />
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{rangeLabel}'s payments</h3>
          <PaymentMethodBars sales={rangeSales} settings={settings} />
        </div>
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={15} color="var(--pine)" /> Top sellers ({rangeLabel.toLowerCase()})
          </h3>
          {topSelling.length === 0 && <EmptyState icon={TrendingUp} title="No sales in this period yet" compact />}
          {topSelling.map((item, i) => (
            <div key={item.name + i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{item.name}</span>
              <span className="pos-mono" style={{ color: 'var(--muted)' }}>{item.qty} sold</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color="var(--amber)" /> Needs reordering
          </h3>
          {lowStock.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>All stock levels are healthy.</p>}
          {lowStock.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{p.name}</span>
              <span className="pos-mono" style={{ color: p.stock === 0 ? 'var(--red)' : 'var(--amber)' }}>{p.stock} left (reorder at {p.reorderLevel})</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color="var(--red)" /> Expiring within 30 days
          </h3>
          {expiringSoon.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nothing in stock is close to expiry.</p>}
          {expiringSoon.map((p) => {
            const days = daysUntilExpiry(p.expiry);
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{p.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({p.stock} in stock)</span></span>
                <span className="pos-mono" style={{ color: days < 0 ? 'var(--red)' : 'var(--amber)' }}>{expiryLabel(days)}</span>
              </div>
            );
          })}
        </div>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Receipt size={15} /> Recent transactions
          </h3>
          {recent.length === 0 && <EmptyState icon={Receipt} title="No sales recorded yet" compact />}
          {recent.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{s.cashier} · {new Date(s.timestamp).toLocaleTimeString()}</span>
              <span className="pos-mono" style={{ color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{s.voided ? 'Voided' : formatMoney(s.total, settings.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const emptyProduct = { name: '', category: '', sku: '', price: '', stock: '', reorderLevel: '', expiry: '', requiresRx: false };

// Builds a short, human-readable summary of what changed between two
// versions of a product — e.g. "Stock 40 → 60, Price KSh180 → KSh190".
// Only reports fields that actually changed, so a name-only edit doesn't
// show a wall of unchanged numbers.
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
function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy, error }) {
  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 340, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 22 }}>
        <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: error ? 10 : 18, lineHeight: 1.4 }}>{message}</p>
        {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} disabled={busy} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Removing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ inventory, settings, saveInventory, user, logInventoryChange }) {
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = new, obj = edit
  const [drugInfoProduct, setDrugInfoProduct] = useState(null);
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const filtered = inventory.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()));

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sort.key === 'expiry') {
        av = a.expiry ? new Date(a.expiry).getTime() : Infinity;
        bv = b.expiry ? new Date(b.expiry).getTime() : Infinity;
      } else if (sort.key === 'price' || sort.key === 'stock') {
        av = Number(a[sort.key]); bv = Number(b[sort.key]);
      } else {
        av = String(a[sort.key] || '').toLowerCase();
        bv = String(b[sort.key] || '').toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const upsert = (product) => {
    if (product.id) {
      const before = inventory.find((p) => p.id === product.id);
      saveInventory(inventory.map((p) => (p.id === product.id ? product : p)));
      if (logInventoryChange && before) {
        logInventoryChange({
          action: 'edit',
          productName: product.name,
          sku: product.sku,
          detail: summarizeProductChange(before, product, settings),
        });
      }
    } else {
      const created = { ...product, id: genId('p') };
      saveInventory([...inventory, created]);
      if (logInventoryChange) {
        logInventoryChange({
          action: 'add',
          productName: created.name,
          sku: created.sku,
          detail: `Added with ${created.stock} in stock at ${formatMoney(created.price, settings.currency)}`,
        });
      }
    }
    setModalProduct(null);
  };

  const remove = (id) => {
    const product = inventory.find((p) => p.id === id);
    saveInventory(inventory.filter((p) => p.id !== id));
    if (logInventoryChange && product) {
      logInventoryChange({
        action: 'delete',
        productName: product.name,
        sku: product.sku,
        detail: `Removed (had ${product.stock} in stock)`,
      });
    }
    setSelectedIds((s) => { const next = new Set(s); next.delete(id); return next; });
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
      if (allVisibleSelected) {
        const next = new Set(s);
        sorted.forEach((p) => next.delete(p.id));
        return next;
      }
      const next = new Set(s);
      sorted.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const applyBulkEdit = (updatedProducts, detailLabel) => {
    const byId = new Map(updatedProducts.map((p) => [p.id, p]));
    saveInventory(inventory.map((p) => (byId.has(p.id) ? byId.get(p.id) : p)));
    if (logInventoryChange) {
      logInventoryChange({
        action: 'bulk',
        productName: `${updatedProducts.length} product${updatedProducts.length !== 1 ? 's' : ''}`,
        sku: '',
        detail: detailLabel,
      });
    }
    setSelectedIds(new Set());
    setBulkModalOpen(false);
  };

  const SortHeader = ({ label, sortKey }) => (
    <button onClick={() => toggleSort(sortKey)} style={{
      background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 3,
      fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
      color: sort.key === sortKey ? 'var(--ink)' : 'var(--muted)', fontWeight: sort.key === sortKey ? 700 : 400
    }}>
      {label}
      {sort.key === sortKey && <span style={{ fontSize: 10 }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );

  return (
    <div>
      <div className="pos-inv-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Inventory</h2>
        <button onClick={() => setModalProduct({ ...emptyProduct })} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Plus size={14} /> Add product
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory"
          style={{ flex: '1 1 240px', maxWidth: 320, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--pine-pale)', border: '1px solid var(--pine)', borderRadius: 8, padding: '7px 12px' }}>
            <span style={{ fontSize: 12.5, color: 'var(--pine)', fontWeight: 600 }}>{selectedIds.size} selected</span>
            <button onClick={() => setBulkModalOpen(true)} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600 }}>
              Bulk edit
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', color: 'var(--pine)', fontSize: 12, textDecoration: 'underline' }}>
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="pos-table-scroll" style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ minWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 116px', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
            <SortHeader label="Product" sortKey="name" />
            <SortHeader label="Category" sortKey="category" />
            <SortHeader label="SKU" sortKey="sku" />
            <SortHeader label="Price" sortKey="price" />
            <SortHeader label="Stock" sortKey="stock" />
            <SortHeader label="Expiry" sortKey="expiry" />
            <span></span>
          </div>
          {sorted.map((p) => {
            const expDays = daysUntilExpiry(p.expiry);
            const expiringSoon = expDays !== null && expDays <= EXPIRY_WINDOW_DAYS;
            return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 116px', padding: '10px 16px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center', background: selectedIds.has(p.id) ? 'var(--pine-pale)' : 'transparent' }}>
              <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelected(p.id)} />
              <span>{p.name}{p.requiresRx ? ' ℞' : ''}</span>
              <span style={{ color: 'var(--muted)' }}>{p.category}</span>
              <span className="pos-mono" style={{ fontSize: 12 }}>{p.sku}</span>
              <span className="pos-mono">{formatMoney(p.price, settings.currency)}</span>
              <span style={{ color: p.stock <= p.reorderLevel ? 'var(--red)' : 'var(--ink)' }}>{p.stock}</span>
              <span style={{ color: expiringSoon ? (expDays < 0 ? 'var(--red)' : 'var(--amber)') : 'var(--muted)', fontSize: 12, fontWeight: expiringSoon ? 600 : 400 }} title={expiringSoon ? expiryLabel(expDays) : ''}>{p.expiry}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="pos-icon-btn" onClick={() => setDrugInfoProduct(p)} title="AI dosage / side effects / interactions lookup" style={{ color: 'var(--pine)' }}><Info size={14} /></button>
                <button className="pos-icon-btn" onClick={() => setModalProduct(p)} title="Edit product" style={{ color: 'var(--muted)' }}><Edit2 size={14} /></button>
                <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => setConfirmDeleteId(p.id)} title="Delete product" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onSave={upsert} />}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
      {bulkModalOpen && (
        <BulkEditModal
          products={inventory.filter((p) => selectedIds.has(p.id))}
          categories={Array.from(new Set(inventory.map((p) => p.category))).filter(Boolean)}
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
          ['price', 'Price', 'number'], ['stock', 'Stock quantity', 'number'], ['reorderLevel', 'Reorder level', 'number'], ['expiry', 'Expiry date', 'date'],
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
        <button disabled={!valid} onClick={() => onSave({ ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, reorderLevel: parseInt(form.reorderLevel) || 0 })}
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

const ACTIVITY_ACTION_META = {
  add: { label: 'Added', color: 'var(--pine)', bg: 'var(--pine-pale)' },
  edit: { label: 'Edited', color: 'var(--amber)', bg: 'var(--amber-pale)' },
  delete: { label: 'Deleted', color: 'var(--red)', bg: 'var(--red-pale)' },
  bulk: { label: 'Bulk edit', color: 'var(--pine)', bg: 'var(--pine-pale)' },
};

function ActivityTab({ inventoryLog }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('All');

  const staffNames = ['All', ...Array.from(new Set(inventoryLog.map((e) => e.staffName)))];

  const filtered = inventoryLog.filter((e) => {
    const d = new Date(e.timestamp);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    if (staffFilter !== 'All' && e.staffName !== staffFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Inventory activity</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Every product added, edited, or removed — by admin or staff with inventory access.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
          {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} change{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && <EmptyState icon={ClipboardList} title="No inventory changes in this range" subtitle="Try widening the date filter above." />}
        {filtered.map((e) => {
          const meta = ACTIVITY_ACTION_META[e.action] || ACTIVITY_ACTION_META.edit;
          return (
            <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  <span style={{ fontWeight: 600 }}>{e.productName}</span>
                  {e.sku && <span className="pos-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{e.sku}</span>}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{e.staffName} · {new Date(e.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', paddingLeft: 2 }}>{e.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalesTab({ sales, settings, voidSale }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = sales.filter((s) => {
    const d = new Date(s.timestamp);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = filtered.filter((s) => !s.voided).reduce((sum, s) => sum + s.total, 0);

  const confirmVoid = async (id) => {
    if (!voidSale) return;
    setBusy(true);
    await voidSale(id, voidReason.trim());
    setBusy(false);
    setVoidingId(null);
    setVoidReason('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Sales history</h2>
        <button onClick={() => exportSalesCsv(filtered, settings)} disabled={filtered.length === 0} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 13, fontWeight: 600, color: filtered.length === 0 ? 'var(--muted)' : 'var(--pine)'
        }}>
          <ClipboardList size={14} /> Export CSV
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} transactions · <b className="pos-mono" style={{ color: 'var(--ink)' }}>{formatMoney(total, settings.currency)}</b></span>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && <EmptyState icon={Receipt} title="No transactions in this range" subtitle="Try widening the date filter above." />}
        {filtered.map((s) => (
          <div key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <div onClick={() => setExpanded(expanded === s.id ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} style={{ transform: expanded === s.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>
                  {new Date(s.timestamp).toLocaleString()} · {s.cashier}
                </span>
                {s.voided && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-pale)', padding: '2px 6px', borderRadius: 5 }}>Voided</span>}
                {s.paymentMethod === 'account' && !s.settled && !s.voided && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-pale)', padding: '2px 6px', borderRadius: 5 }}>Unpaid</span>}
              </span>
              <span className="pos-mono" style={{ color: s.voided ? 'var(--muted)' : 'var(--ink)', textDecoration: s.voided ? 'line-through' : 'none' }}>{formatMoney(s.total, settings.currency)}</span>
            </div>
            {expanded === s.id && (
              <div style={{ padding: '4px 16px 14px 37px', fontSize: 12.5, color: 'var(--muted)' }}>
                {s.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{i.qty} x {i.name}</span><span className="pos-mono">{formatMoney(i.price * i.qty, settings.currency)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>Paid via {s.paymentMethod}{s.customerName ? ` — ${s.customerName}` : ''}</div>
                {s.voided && <div style={{ marginTop: 4, color: 'var(--red)' }}>Voided by {s.voidedBy} on {new Date(s.voidedAt).toLocaleString()}{s.voidReason ? `: ${s.voidReason}` : ''}</div>}

                {!s.voided && voidSale && (
                  voidingId === s.id ? (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--red-pale)', borderRadius: 8 }}>
                      <label style={{ fontSize: 11, color: '#7A2530' }}>Reason for reversing this sale</label>
                      <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. customer changed their mind"
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, marginTop: 4, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={busy} onClick={() => confirmVoid(s.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
                          {busy ? 'Voiding…' : 'Confirm void'}
                        </button>
                        <button onClick={() => setVoidingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setVoidingId(s.id); setVoidReason(''); }} style={{ marginTop: 8, background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>
                      Void this sale
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountsTab({ sales, settings, settleAccountSale }) {
  const [settleMethod, setSettleMethod] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');

  const accountSales = sales.filter((s) => s.paymentMethod === 'account' && !s.voided);
  const outstanding = accountSales.filter((s) => !s.settled).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const settledRecently = accountSales.filter((s) => s.settled).sort((a, b) => new Date(b.settledAt || b.timestamp) - new Date(a.settledAt || a.timestamp)).slice(0, 10);

  const byCustomer = {};
  outstanding.forEach((s) => {
    const key = s.customerName || 'Unknown customer';
    if (!byCustomer[key]) byCustomer[key] = { name: key, phone: s.customerPhone, sales: [], total: 0 };
    byCustomer[key].sales.push(s);
    byCustomer[key].total += s.total;
  });
  const allCustomers = Object.values(byCustomer).sort((a, b) => b.total - a.total);
  const customers = allCustomers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const totalOutstanding = outstanding.reduce((sum, s) => sum + s.total, 0);

  const markPaid = async (id) => {
    if (!settleAccountSale) return;
    setBusyId(id);
    await settleAccountSale(id, settleMethod[id] || 'cash');
    setBusyId(null);
  };

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Customer accounts</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sales rung up "on account" — track who owes what, and mark them settled once collected.</p>

      <div style={{ marginBottom: 20 }}>
        <StatCard label="Total outstanding" value={formatMoney(totalOutstanding, settings.currency)} accent={totalOutstanding ? 'var(--red)' : undefined} />
      </div>

      {allCustomers.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by customer name"
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
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
        <div key={c.name} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="pos-mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>{formatMoney(c.total, settings.currency)}</div>
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
              <span style={{ color: 'var(--muted)' }}>{new Date(s.timestamp).toLocaleDateString()} · {s.items.length} item{s.items.length !== 1 ? 's' : ''} · {s.cashier}</span>
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
                    <button disabled={busyId === s.id} onClick={() => markPaid(s.id)} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, opacity: busyId === s.id ? 0.6 : 1 }}>
                      {busyId === s.id ? 'Saving…' : 'Mark as paid'}
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
                <span>{s.customerName} · settled {s.settledAt ? new Date(s.settledAt).toLocaleDateString() : '—'}{s.settledMethod ? ` via ${s.settledMethod}` : ''}</span>
                <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StaffTab({ staffList, saveStaff }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Every PIN add/change/delete is confirmed server-side against the
  // admin's own PIN — the browser never stores or reads anyone's real
  // PIN value, it just relays what was typed to staff-admin and reports
  // back whether that succeeded.
  const callStaffAdmin = async (body) => {
    setActionError('');
    if (!adminPin || adminPin.length !== 4) {
      setActionError('Enter your admin PIN above to make staff changes.');
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

  const add = async () => {
    if (!name || pin.length !== 4) return;
    const id = genId('s');
    const ok = await callStaffAdmin({ action: 'set', staffId: id, pin, role: 'staff' });
    if (!ok) return;
    saveStaff([...staffList, { id, name, role: 'staff', canManageInventory: false }]);
    setName(''); setPin('');
  };

  const remove = async (id) => {
    const ok = await callStaffAdmin({ action: 'delete', staffId: id });
    if (!ok) return;
    saveStaff(staffList.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  };

  const startEdit = (s) => { setEditingId(s.id); setEditName(s.name); setEditPin(''); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    if (!editName) return;
    if (editPin && editPin.length !== 4) return; // only validate PIN if actually changing it
    if (editPin) {
      const target = staffList.find((s) => s.id === id);
      const ok = await callStaffAdmin({ action: 'set', staffId: id, pin: editPin, role: target.role });
      if (!ok) return;
    }
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, name: editName } : s)));
    setEditingId(null);
  };

  const toggleInventoryAccess = (id, checked) => {
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, canManageInventory: checked } : s)));
  };

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Staff accounts</h2>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Your admin PIN — required to add, edit, or remove a PIN below</label>
        <input type="password" inputMode="numeric" autoComplete="off" value={adminPin}
          onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
          style={{ width: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 4, display: 'block' }} />
      </div>
      {actionError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{actionError}</p>}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20 }}>
        {staffList.map((s) => (
          editingId === s.id ? (
            <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name"
                style={{ flex: '1 1 140px', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
              <input value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New PIN (optional)"
                style={{ width: 140, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
              <button onClick={() => saveEdit(s.id)} disabled={busy} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>Save</button>
              <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: 'var(--muted)' }}>Cancel</button>
            </div>
          ) : (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
              <span>{s.name} <span style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', marginLeft: 6 }}>{s.role}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {s.role !== 'admin' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <input
                      type="checkbox"
                      checked={!!s.canManageInventory}
                      onChange={(e) => toggleInventoryAccess(s.id, e.target.checked)}
                    />
                    Can add inventory
                  </label>
                )}
                <span className="pos-mono" style={{ color: 'var(--muted)' }}>PIN ••••</span>
                <button className="pos-icon-btn" onClick={() => startEdit(s)} title="Change name or PIN" style={{ color: 'var(--muted)' }}><Edit2 size={14} /></button>
                {s.role !== 'admin' && <button className="pos-icon-btn pos-icon-btn-danger" onClick={() => setConfirmDeleteId(s.id)} disabled={busy} title="Remove staff account" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>}
              </span>
            </div>
          )
        ))}
      </div>
      <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add cashier</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={{ flex: '1 1 140px', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit PIN" style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <button onClick={add} disabled={busy} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>Add</button>
      </div>
      {confirmDeleteId && (() => {
        const s = staffList.find((x) => x.id === confirmDeleteId);
        if (!s) return null;
        return (
          <ConfirmModal
            title="Remove this staff account?"
            message={`"${s.name}" will lose access immediately and won't be able to log in again. This can't be undone.`}
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

function SettingsTab({ settings, saveSettings }) {
  const [form, setForm] = useState({ ...settings });
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Settings</h2>
      <div style={{ maxWidth: 340 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Pharmacy name</label>
          <input value={form.pharmacyName} onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Currency symbol</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Tax rate (%)</label>
          <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Auto logout after inactivity (minutes)</label>
          <input type="number" min="0" value={form.sessionTimeoutMinutes} onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Cashiers and admins are logged out after this many minutes with no activity on a terminal. Set to 0 to disable.</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Theme</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} type="button" onClick={() => setForm({ ...form, theme: key })} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 12px',
                borderRadius: 10, border: (form.theme || DEFAULT_THEME) === key ? '2px solid var(--pine)' : '1px solid var(--border)',
                background: '#fff', minWidth: 78
              }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {t.swatch.map((c, i) => (
                    <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                  ))}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: (form.theme || DEFAULT_THEME) === key ? 700 : 500 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Applies to every screen and every till once saved.</p>
        </div>
        <button disabled={!dirty} onClick={() => saveSettings(form)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: dirty ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600 }}>Save changes</button>
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

  const refreshPending = () => setPendingCount(getDirtyKeys().length);

  const loadAll = useCallback(async () => {
    await flushDirtyKeys();
    const [inv, sls, stf, cfg, invLog] = await Promise.all([
      getOrInit('inventory', DEFAULT_INVENTORY),
      getOrInit('sales', []),
      getOrInit('staff', DEFAULT_STAFF),
      getOrInit('settings', DEFAULT_SETTINGS),
      getOrInit('inventoryLog', []),
    ]);
    setInventory(inv); setSales(sls); setStaffList(stf); setSettings({ ...DEFAULT_SETTINGS, ...cfg }); setInventoryLog(invLog);
    setLastSynced(new Date().toLocaleTimeString());
    refreshPending();
    setReady(true);
  }, []);

  useEffect(() => {
    loadAll();

    // Instant sync: any device that writes to kv_store pushes an update here.
    const channel = supabase
      .channel('kv_store_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, () => {
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
      setUser(match);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
    }
  }, [ready, staffList]);

  const handleLogin = (staffMember, token) => {
    setSessionToken(token);
    // staff-login only returns { id, role } — it never holds display
    // names, so the full profile (name, canManageInventory) comes from
    // the staff list already loaded from kv_store.
    const profile = staffList.find((s) => s.id === staffMember.id);
    const fullUser = profile || { id: staffMember.id, name: staffMember.role === 'admin' ? 'Admin' : 'Staff', role: staffMember.role };
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

  const saveInventory = async (next) => {
    setInventory(next);
    await saveShared('inventory', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const logInventoryChange = async ({ action, productName, sku, detail }) => {
    const entry = {
      id: genId('log'),
      timestamp: new Date().toISOString(),
      staffId: user?.id,
      staffName: user?.name || 'Unknown',
      action, productName, sku, detail,
    };
    const next = [...inventoryLog, entry];
    setInventoryLog(next);
    await saveShared('inventoryLog', next);
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
    const next = [...sales, sale];
    setSales(next);
    await saveShared('sales', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const updateStock = async (items) => {
    const next = inventory.map((p) => {
      const sold = items.find((i) => i.id === p.id);
      return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
    });
    setInventory(next);
    await saveShared('inventory', next);
  };

  // Reverses a completed sale: marks it voided (kept in the record for the
  // audit trail, not deleted) and restocks whatever it sold. Available to
  // both admins (any sale) and cashiers (their own same-day sales).
  const voidSale = async (saleId, reason) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.voided) return false;

    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      voided: true,
      voidReason: reason || '',
      voidedAt: new Date().toISOString(),
      voidedBy: user?.name || 'Unknown',
    } : s));
    setSales(nextSales);
    await saveShared('sales', nextSales);

    const nextInventory = inventory.map((p) => {
      const found = sale.items.find((i) => i.id === p.id);
      return found ? { ...p, stock: p.stock + found.qty } : p;
    });
    setInventory(nextInventory);
    await saveShared('inventory', nextInventory);

    setLastSynced(new Date().toLocaleTimeString());
    return true;
  };

  // Marks a "sale on account" as collected — used once the customer pays
  // off what they owe, recording how and by whom.
  const settleAccountSale = async (saleId, method) => {
    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      settled: true,
      settledAt: new Date().toISOString(),
      settledBy: user?.name || 'Unknown',
      settledMethod: method || 'cash',
    } : s));
    setSales(nextSales);
    await saveShared('sales', nextSales);
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
      <AdminConsole inventory={inventory} sales={sales} staffList={staffList} settings={settings}
        user={user} onLogout={handleLogout} lastSynced={lastSynced}
        saveInventory={saveInventory} saveStaff={saveStaffList} saveSettings={saveSettingsFn}
        inventoryLog={inventoryLog} logInventoryChange={logInventoryChange}
        voidSale={voidSale} settleAccountSale={settleAccountSale} />
    );
  }

  return (
    <StaffPOS inventory={inventory} sales={sales} settings={settings} user={user}
      addSale={addSale} updateStock={updateStock} lastSynced={lastSynced} onLogout={handleLogout}
      saveInventory={saveInventory} logInventoryChange={logInventoryChange} voidSale={voidSale}
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
