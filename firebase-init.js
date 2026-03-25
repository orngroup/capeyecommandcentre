// CapEye v10 — Firebase Init (localStorage-based, no ES modules)
// Compatible with Firebase compat SDK 9.x

const _app  = firebase.initializeApp(FIREBASE_CONFIG);
const DB    = firebase.database();
const AUTH  = firebase.auth();
const STORE = firebase.storage ? firebase.storage() : null;

// Register PWA service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ── localStorage workflow helpers ────────────────────────────────────
function getWorkflow(stockNo) {
  try { return JSON.parse(localStorage.getItem('wf_'+stockNo)||'{}'); } catch(e) { return {}; }
}
function saveWorkflow(stockNo, data) {
  localStorage.setItem('wf_'+stockNo, JSON.stringify(data));
}
function getHandover(stockNo, stageId) {
  try { return JSON.parse(localStorage.getItem('ho_'+stockNo+'_'+stageId)||'null'); } catch(e) { return null; }
}
function saveHandover(stockNo, stageId, data) {
  data.ts = Date.now();
  localStorage.setItem('ho_'+stockNo+'_'+stageId, JSON.stringify(data));
  // also log to Firebase
  DB.ref('handovers/'+stockNo+'/stage'+stageId).set(data);
}
function logWorkflowEvent(reg, eventType, details, userName) {
  DB.ref('workflow_log/'+reg).push({
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
    eventType, details, user: userName||'Unknown'
  });
}

// ── User / session ───────────────────────────────────────────────────
function getCurrentUser() {
  const uid = localStorage.getItem('ce_user')||'keith';
  return AC_STAFF.find(s=>s.id===uid) || AC_STAFF[2];
}
function canSeePurchasePrice() {
  const u = getCurrentUser();
  return !!u.canSeePurchasePrice;
}
function isManager() {
  const u = getCurrentUser();
  return u.canSkipStages || u.canSendBack || (u.dept==='Management');
}

// ── Helpers ──────────────────────────────────────────────────────────
function formatGBP(n) {
  return '£'+Number(n||0).toLocaleString('en-GB');
}
function getDaysInStage(stageStarted) {
  if (!stageStarted) return 0;
  const parts = stageStarted.split('/');
  if (parts.length!==3) return 0;
  const d = new Date(parts[2], parts[1]-1, parts[0]);
  return Math.floor((Date.now()-d.getTime())/86400000);
}
function getMOTDaysLeft(motExpiry) {
  if (!motExpiry) return 999;
  const parts = motExpiry.split('/');
  if (parts.length!==3) return 999;
  const d = new Date(parts[2], parts[1]-1, parts[0]);
  return Math.floor((d.getTime()-Date.now())/86400000);
}
function isOverdue(v) {
  return getDaysInStage(v.stageStarted)>3 &&
    !['Sold','Aftersales','Ready for Sale'].includes(v.workflowStage);
}
function stageColor(stageName) {
  const s = AC_WORKFLOW_STAGES.find(x=>x.name===stageName);
  return s ? s.color : '#64748b';
}
function showToast(msg, type='info') {
  const colors={info:'#3b82f6',success:'#10b981',warning:'#f59e0b',error:'#ef4444',urgent:'#C8102E'};
  document.querySelectorAll('.ce-toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className='ce-toast';
  t.style.cssText=`position:fixed;bottom:24px;right:24px;padding:12px 20px;background:${colors[type]||colors.info};color:#fff;border-radius:10px;font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.25);max-width:340px;line-height:1.4`;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},3500);
}
