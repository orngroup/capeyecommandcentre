// CapEye — Firebase Init + Session Manager
// Loads after firebase-config.js and ac-data.js

var _firebaseApp, DB, AUTH, STORE;
try {
  _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  DB    = firebase.database();
  AUTH  = firebase.auth();
  STORE = firebase.storage ? firebase.storage() : null;
} catch(e) {
  // Already initialised
  try { _firebaseApp = firebase.app(); DB = firebase.database(); AUTH = firebase.auth(); } catch(e2) {}
}

// PWA service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function(){});
}

// ── SESSION ──────────────────────────────────────────────────────────
// Session expires after 12 hours — user must re-login
var SESSION_TTL = 12 * 60 * 60 * 1000;

function isSessionValid() {
  var ts = parseInt(localStorage.getItem('ce_auth_ts') || '0');
  return ts && (Date.now() - ts) < SESSION_TTL;
}

function getCurrentUser() {
  // Return a user object from localStorage session
  // Falls back to keith (for any pages opened before login is wired)
  if (isSessionValid()) {
    var id   = localStorage.getItem('ce_user_id')   || 'keith';
    var name = localStorage.getItem('ce_user_name') || 'Keith Hardy';
    var dept = localStorage.getItem('ce_user_dept') || 'Management';
    var staffMatch = AC_STAFF.find(function(s){ return s.id === id; });
    return staffMatch || {
      id: id, name: name, dept: dept,
      canSeePurchasePrice: localStorage.getItem('ce_user_price') === '1',
      canSkipStages:       localStorage.getItem('ce_user_mgr')   === '1',
      canSendBack:         localStorage.getItem('ce_user_mgr')   === '1',
      admin:               localStorage.getItem('ce_user_admin') === '1',
    };
  }
  // No valid session — find by department default (Keith for review/test)
  return AC_STAFF.find(function(s){ return s.id === 'keith'; }) || AC_STAFF[2];
}

function canSeePurchasePrice() {
  var u = getCurrentUser();
  return !!u.canSeePurchasePrice;
}

function isManager() {
  var u = getCurrentUser();
  return !!(u.canSkipStages || u.canSendBack || u.dept === 'Management');
}

function isAdmin() {
  var u = getCurrentUser();
  return !!u.admin;
}

function doLogout() {
  localStorage.removeItem('ce_user_id');
  localStorage.removeItem('ce_user_name');
  localStorage.removeItem('ce_user_dept');
  localStorage.removeItem('ce_user_email');
  localStorage.removeItem('ce_user_admin');
  localStorage.removeItem('ce_user_price');
  localStorage.removeItem('ce_user_mgr');
  localStorage.removeItem('ce_auth_ts');
  if (AUTH) AUTH.signOut().catch(function(){});
  window.location.href = 'login.html';
}

// ── WORKFLOW HELPERS ──────────────────────────────────────────────────
function getWorkflow(stockNo) {
  try { return JSON.parse(localStorage.getItem('ac_wf_'+stockNo)||'{}'); } catch(e) { return {}; }
}
function saveWorkflow(stockNo, data) {
  localStorage.setItem('ac_wf_'+stockNo, JSON.stringify(data));
}
function getHandover(stockNo, stageId) {
  try { return JSON.parse(localStorage.getItem('ac_ho_'+stockNo+'_'+stageId)||'null'); } catch(e) { return null; }
}
function saveHandover(stockNo, stageId, data) {
  var obj = Object.assign({}, data, { ts: Date.now() });
  localStorage.setItem('ac_ho_'+stockNo+'_'+stageId, JSON.stringify(obj));
  if (DB) {
    DB.ref('handovers/'+stockNo+'/stage'+stageId).set(obj).catch(function(){});
  }
}
function logWorkflowEvent(reg, eventType, details, userName) {
  if (!DB) return;
  DB.ref('workflow_log/'+reg).push({
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
    eventType: eventType, details: details, user: userName || 'Unknown'
  }).catch(function(){});
}

// ── HELPERS ────────────────────────────────────────────────────────────
function formatGBP(n) {
  if (!n && n !== 0) return '—';
  return '£' + Number(n).toLocaleString('en-GB', {minimumFractionDigits:0, maximumFractionDigits:0});
}
function getDaysInStage(stageStarted) {
  if (!stageStarted) return 0;
  var p = stageStarted.split('/');
  if (p.length !== 3) return 0;
  var d = new Date(p[2], p[1]-1, p[0]);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function getMOTDaysLeft(motExpiry) {
  if (!motExpiry) return 999;
  var p = motExpiry.split('/');
  if (p.length !== 3) return 999;
  var d = new Date(p[2], p[1]-1, p[0]);
  return Math.floor((d.getTime() - Date.now()) / 86400000);
}
function isOverdue(v) {
  return getDaysInStage(v.stageStarted) > 3 &&
    !['Sold','Aftersales','Ready for Sale'].includes(v.workflowStage);
}
function stageColor(stageName) {
  var s = AC_WORKFLOW_STAGES.find(function(x){ return x.name === stageName; });
  return s ? s.color : '#64748b';
}
function showToast(msg, type) {
  type = type || 'info';
  var colors = {info:'#3b82f6', success:'#10b981', warning:'#f59e0b', error:'#ef4444', urgent:'#C8102E'};
  document.querySelectorAll('.ce-toast').forEach(function(t){ t.remove(); });
  var t = document.createElement('div');
  t.className = 'ce-toast';
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;background:'+(colors[type]||colors.info)+';color:#fff;border-radius:10px;font-family:"IBM Plex Sans",sans-serif;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.25);max-width:340px;line-height:1.4;transition:opacity .3s';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ t.remove(); }, 300); }, 3500);
}

// ── NAV USER DISPLAY ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('nav-user');
  if (el) {
    var u = getCurrentUser();
    el.textContent = u.name || 'CapEye';
    el.title = 'Click to sign out';
    el.style.cursor = 'pointer';
    el.onclick = function() {
      if (confirm('Sign out of CapEye?')) doLogout();
    };
  }
});
