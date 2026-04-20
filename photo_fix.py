import re

content = open('workflow.html').read()

# ── PHOTO UPLOAD CSS ─────────────────────────────────────────────────
PHOTO_CSS = """
/* ── PHOTO UPLOAD GRID ── */
.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
.photo-slot{position:relative;aspect-ratio:4/3;border:2px dashed var(--border);border-radius:10px;overflow:hidden;background:#fafbfc;cursor:pointer;transition:border-color .15s}
.photo-slot:hover{border-color:var(--navy)}
.photo-slot input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:2}
.photo-slot .photo-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;pointer-events:none;z-index:1}
.photo-slot .photo-placeholder i{font-size:22px;color:var(--ink3)}
.photo-slot .photo-placeholder span{font-size:10px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px}
.photo-slot img.photo-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3;display:none}
.photo-slot .photo-clear{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(200,16,46,.9);color:#fff;border:none;cursor:pointer;font-size:11px;display:none;align-items:center;justify-content:center;z-index:4}
.photo-slot.has-photo{border-color:var(--green);border-style:solid}
.photo-slot.has-photo .photo-placeholder{display:none}
.photo-slot.has-photo img.photo-preview{display:block}
.photo-slot.has-photo .photo-clear{display:flex}
"""

# Add CSS to style block
content = content.replace('</style>', PHOTO_CSS + '\n</style>', 1)

# ── PHOTO UPLOAD JS ──────────────────────────────────────────────────
PHOTO_JS = """
/* ── PHOTO UPLOAD HANDLER ── */
function initPhotoSlots() {
  document.querySelectorAll('.photo-slot input[type=file]').forEach(function(input) {
    input.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var slot = this.closest('.photo-slot');
      var preview = slot.querySelector('img.photo-preview');
      var reader = new FileReader();
      reader.onload = function(e) {
        preview.src = e.target.result;
        slot.classList.add('has-photo');
        // Store in workflow data
        var key = input.id;
        if (currentVehicle) {
          var wf = getWorkflow(currentVehicle.stockNo);
          var sid = AC_WORKFLOW_STAGES[currentStageIdx].id;
          if (!wf[sid]) wf[sid] = {};
          wf[sid][key] = e.target.result;
          saveWorkflow(currentVehicle.stockNo, wf);
        }
      };
      reader.readAsDataURL(file);
    });
  });
  document.querySelectorAll('.photo-clear').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      var slot = this.closest('.photo-slot');
      var preview = slot.querySelector('img.photo-preview');
      var input = slot.querySelector('input[type=file]');
      preview.src = '';
      slot.classList.remove('has-photo');
      input.value = '';
      var key = input.id;
      if (currentVehicle) {
        var wf = getWorkflow(currentVehicle.stockNo);
        var sid = AC_WORKFLOW_STAGES[currentStageIdx].id;
        if (wf[sid]) { delete wf[sid][key]; saveWorkflow(currentVehicle.stockNo, wf); }
      }
    });
  });
}

function loadSavedPhotos(stageData) {
  document.querySelectorAll('.photo-slot input[type=file]').forEach(function(input) {
    var key = input.id;
    if (stageData && stageData[key]) {
      var slot = input.closest('.photo-slot');
      var preview = slot.querySelector('img.photo-preview');
      preview.src = stageData[key];
      slot.classList.add('has-photo');
    }
  });
}
"""

# Add JS before closing </script> of main script block
# Find the last script block (the main one)
content = content.replace(
    'document.addEventListener("DOMContentLoaded", function() { init(); });',
    PHOTO_JS + '\ndocument.addEventListener("DOMContentLoaded", function() { init(); });',
    1
)

# Also call initPhotoSlots and loadSavedPhotos after buildForm in showStageForm
old_show = "  document.getElementById('stageFormBody').innerHTML = buildForm(stage, data);"
new_show = """  document.getElementById('stageFormBody').innerHTML = buildForm(stage, data);
  initPhotoSlots();
  loadSavedPhotos(data);"""
content = content.replace(old_show, new_show, 1)

# ── PHOTO SLOT BUILDER FUNCTION ──────────────────────────────────────
# Replace all camera placeholder boxes with real upload slots

def make_photo_grid(slots):
    """Build a photo upload grid HTML string"""
    items = []
    for slot_id, label, color in slots:
        border_color = color if color else 'var(--navy)'
        items.append(f'''<div class="photo-slot" id="slot_{slot_id}">
          <input type="file" id="{slot_id}" accept="image/*" capture="environment">
          <img class="photo-preview" src="" alt="">
          <button class="photo-clear" title="Remove photo">×</button>
          <div class="photo-placeholder">
            <i class="fas fa-camera" style="color:{border_color}"></i>
            <span>{label}</span>
          </div>
        </div>''')
    return '<div class="photo-grid">' + '\n'.join(items) + '</div>'

# ── STAGE 1: Intake — 6 sided photos ────────────────────────────────
old_s1_photos = """    <div class="form-field full"><div class="form-label">Photo Checklist</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${['Front','Rear','Offside','Nearside','Interior','Dashboard'].map(p=>`<div style="padding:10px;border:2px dashed var(--border);border-radius:8px;text-align:center;font-size:11px;color:var(--ink3);cursor:pointer"><i class="fas fa-camera" style="display:block;font-size:18px;margin-bottom:4px"></i>${p}</div>`).join('')}
    </div></div>"""

new_s1_photos = '''    <div class="form-field full"><div class="form-label">Vehicle Photos (tap to capture or upload)</div>''' + make_photo_grid([
    ('s1_front',    'Front',     'var(--navy)'),
    ('s1_rear',     'Rear',      'var(--navy)'),
    ('s1_offside',  'Offside',   'var(--navy)'),
    ('s1_nearside', 'Nearside',  'var(--navy)'),
    ('s1_interior', 'Interior',  'var(--navy)'),
    ('s1_dash',     'Dashboard', 'var(--navy)'),
]) + '</div>'

content = content.replace(old_s1_photos, new_s1_photos, 1)

# ── STAGE 2: Bodywork — 6 imperfection photos ───────────────────────
old_s2_photos = """    <div class="form-field full"><div class="form-label">Imperfection Photos (6)</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${[1,2,3,4,5,6].map(n=>`<div style="padding:10px;border:2px dashed var(--border);border-radius:8px;text-align:center;font-size:11px;color:var(--ink3);cursor:pointer"><i class="fas fa-camera" style="display:block;font-size:18px;margin-bottom:4px"></i>Photo ${n}</div>`).join('')}
    </div></div>"""

new_s2_photos = '''    <div class="form-field full"><div class="form-label">Imperfection Photos (tap to capture or upload)</div>''' + make_photo_grid([
    ('s2_p1', 'Photo 1', 'var(--amber)'),
    ('s2_p2', 'Photo 2', 'var(--amber)'),
    ('s2_p3', 'Photo 3', 'var(--amber)'),
    ('s2_p4', 'Photo 4', 'var(--amber)'),
    ('s2_p5', 'Photo 5', 'var(--amber)'),
    ('s2_p6', 'Photo 6', 'var(--amber)'),
]) + '</div>'

content = content.replace(old_s2_photos, new_s2_photos, 1)

# ── STAGE 6: Valeting — before AND after photos ──────────────────────
old_s6_before = """    <div class="form-field full"><div class="form-label">Before Photos (6)</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${[1,2,3,4,5,6].map(n=>`<div style="padding:10px;border:2px dashed #f59e0b;border-radius:8px;text-align:center;font-size:11px;color:var(--ink3);cursor:pointer"><i class="fas fa-camera" style="display:block;font-size:18px;margin-bottom:4px;color:#f59e0b"></i>Before ${n}</div>`).join('')}
    </div></div>
    <div class="form-field full"><div class="form-label">After Photos (6)</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${[1,2,3,4,5,6].map(n=>`<div style="padding:10px;border:2px dashed #10b981;border-radius:8px;text-align:center;font-size:11px;color:var(--ink3);cursor:pointer"><i class="fas fa-camera" style="display:block;font-size:18px;margin-bottom:4px;color:#10b981"></i>After ${n}</div>`).join('')}
    </div></div>"""

new_s6_photos = '''    <div class="form-field full"><div class="form-label">Before Photos (tap to capture or upload)</div>''' + make_photo_grid([
    ('s6_b1', 'Before 1', '#f59e0b'),
    ('s6_b2', 'Before 2', '#f59e0b'),
    ('s6_b3', 'Before 3', '#f59e0b'),
    ('s6_b4', 'Before 4', '#f59e0b'),
    ('s6_b5', 'Before 5', '#f59e0b'),
    ('s6_b6', 'Before 6', '#f59e0b'),
]) + '''</div>
    <div class="form-field full"><div class="form-label">After Photos (tap to capture or upload)</div>''' + make_photo_grid([
    ('s6_a1', 'After 1', '#10b981'),
    ('s6_a2', 'After 2', '#10b981'),
    ('s6_a3', 'After 3', '#10b981'),
    ('s6_a4', 'After 4', '#10b981'),
    ('s6_a5', 'After 5', '#10b981'),
    ('s6_a6', 'After 6', '#10b981'),
]) + '</div>'

content = content.replace(old_s6_before, new_s6_photos, 1)

open('workflow.html', 'w').write(content)
print('Photo upload slots built for stages 1, 2 and 6')

# Verify
checks = [
    ('input[type=file]' in content, 'file inputs present'),
    ('photo-slot' in content, 'photo-slot class present'),
    ('photo-preview' in content, 'photo-preview img present'),
    ('initPhotoSlots' in content, 'initPhotoSlots function present'),
    ('loadSavedPhotos' in content, 'loadSavedPhotos function present'),
    ('s1_front' in content, 'Stage 1 front photo present'),
    ('s6_b1' in content, 'Stage 6 before photos present'),
    ('s6_a1' in content, 'Stage 6 after photos present'),
]
print()
for ok, label in checks:
    print(f'  {"✓" if ok else "✗"} {label}')
