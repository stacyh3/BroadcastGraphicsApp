// Control panel logic — ports MainWindow.xaml.cs behavior to Electron renderer

let templates = [];
let rundownItems = [];
let activeGraphics = []; // { id, templateId, name, fieldValues }
let selectedTemplateId = null;
let selectedRundownId = null;
let selectedActiveId = null;

// DOM refs
const lstTemplates = document.getElementById('lstTemplates');
const lstRundown = document.getElementById('lstRundown');
const lstActiveGraphics = document.getElementById('lstActiveGraphics');
const pnlProperties = document.getElementById('pnlProperties');
const previewFrame = document.getElementById('previewFrame');

// ─── Init ───

async function init() {
    templates = await window.api.getTemplates();
    rundownItems = await window.api.getRundown();

    renderTemplateList();
    renderRundown();
    initPreview();
    await refreshMonitors();

    // Listen for rundown changes from main process
    window.api.onRundownChanged((items) => {
        rundownItems = items;
        renderRundown();
    });
}

function initPreview() {
    // Point preview iframe to same output.html used by the output window
    // Use a relative path from ui/ to assets/html/
    previewFrame.src = '../assets/html/output.html';
}

// ─── Template List ───

function renderTemplateList() {
    lstTemplates.innerHTML = '';
    for (const t of templates) {
        const li = document.createElement('li');
        li.textContent = t.name;
        li.dataset.id = t.id;
        if (t.id === selectedTemplateId) li.classList.add('selected');
        li.addEventListener('click', () => selectTemplate(t.id));
        lstTemplates.appendChild(li);
    }
}

function selectTemplate(id) {
    selectedTemplateId = id;
    selectedRundownId = null;
    selectedActiveId = null;
    renderTemplateList();
    clearRundownSelection();
    clearActiveSelection();
    generateProperties();
}

// ─── Rundown List ───

function renderRundown() {
    lstRundown.innerHTML = '';
    for (const item of rundownItems) {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        if (item.id === selectedRundownId) li.classList.add('selected');

        li.innerHTML = `
            <div class="rundown-row">
                <span class="indicator ${item.isActive ? 'active' : ''}"></span>
                <span class="name">${escapeHtml(item.name)}</span>
                <button class="toggle-btn ${item.isActive ? 'active' : ''}" data-id="${item.id}" title="${item.isActive ? 'Stop' : 'Play'}">
                    ${item.isActive ? '&#9632;' : '&#9654;'}
                </button>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-btn')) return;
            selectRundownItem(item.id);
        });

        const toggleBtn = li.querySelector('.toggle-btn');
        toggleBtn.addEventListener('click', () => toggleRundownItem(item.id));

        lstRundown.appendChild(li);
    }
}

function selectRundownItem(id) {
    selectedRundownId = id;
    selectedTemplateId = null;
    selectedActiveId = null;
    renderRundown();
    clearTemplateSelection();
    clearActiveSelection();
    generateProperties();
}

function clearRundownSelection() {
    lstRundown.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
}

function clearTemplateSelection() {
    lstTemplates.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
}

function clearActiveSelection() {
    lstActiveGraphics.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
}

async function toggleRundownItem(id) {
    const item = rundownItems.find(i => i.id === id);
    if (!item) return;
    if (item.isActive) {
        await window.api.stopRundownItem(id);
    } else {
        await window.api.playRundownItem(id);
    }
    rundownItems = await window.api.getRundown();
    renderRundown();
}

// ─── Active Graphics ───

function renderActiveGraphics() {
    lstActiveGraphics.innerHTML = '';
    for (const item of activeGraphics) {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        if (item.id === selectedActiveId) li.classList.add('selected');
        li.innerHTML = `
            <span>${escapeHtml(item.name)}</span>
            <button class="remove-btn" data-id="${item.id}" title="Remove">&times;</button>
        `;
        li.addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn')) return;
            selectActiveGraphic(item.id);
        });
        li.querySelector('.remove-btn').addEventListener('click', () => removeActiveGraphic(item.id));
        lstActiveGraphics.appendChild(li);
    }
}

function selectActiveGraphic(id) {
    selectedActiveId = id;
    selectedTemplateId = null;
    selectedRundownId = null;
    clearTemplateSelection();
    clearRundownSelection();
    renderActiveGraphics();
    generateProperties();
}

async function removeActiveGraphic(id) {
    const item = activeGraphics.find(i => i.id === id);
    if (item) {
        const template = templates.find(t => t.id === item.templateId);
        if (template) {
            await window.api.clearLayer(template.layer);
        }
    }
    activeGraphics = activeGraphics.filter(i => i.id !== id);
    if (selectedActiveId === id) {
        selectedActiveId = null;
        renderEmptyProperties();
    }
    renderActiveGraphics();
    updatePreviewAll();
}

// ─── Properties Panel ───

function generateProperties() {
    let template = null;
    let fieldValues = {};
    let isActiveItem = false;

    if (selectedActiveId) {
        const item = activeGraphics.find(i => i.id === selectedActiveId);
        if (item) {
            template = templates.find(t => t.id === item.templateId);
            fieldValues = item.fieldValues || {};
            isActiveItem = true;
        }
    } else if (selectedRundownId) {
        const item = rundownItems.find(i => i.id === selectedRundownId);
        if (item) {
            template = templates.find(t => t.id === item.templateId);
            fieldValues = item.fieldValues || {};
        }
    } else if (selectedTemplateId) {
        template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
            fieldValues = {};
            template.fields.forEach(f => { fieldValues[f.id] = f.default || ''; });
        }
    }

    if (!template) {
        renderEmptyProperties();
        return;
    }

    pnlProperties.innerHTML = '<div class="section-label">PROPERTIES</div>';

    // "Add to Scene" button if selecting from template library (not an existing active/rundown item)
    if (selectedTemplateId && !selectedRundownId && !selectedActiveId) {
        const btnAdd = document.createElement('button');
        btnAdd.className = 'btn btn-accent';
        btnAdd.textContent = 'Add to Scene';
        btnAdd.style.marginBottom = '10px';
        btnAdd.addEventListener('click', () => addToScene(template, fieldValues));
        pnlProperties.appendChild(btnAdd);
    }

    for (const field of template.fields) {
        const row = document.createElement('div');
        row.className = 'property-row';
        const currentVal = fieldValues[field.id] !== undefined ? fieldValues[field.id] : (field.default || '');

        if (field.type === 'score') {
            row.innerHTML = `
                <label>${escapeHtml(field.label)}</label>
                <div class="score-row">
                    <button class="btn" data-field="${field.id}" data-action="dec">−</button>
                    <input type="text" data-field="${field.id}" value="${escapeAttr(currentVal)}">
                    <button class="btn" data-field="${field.id}" data-action="inc">+</button>
                </div>
            `;
        } else if (field.type === 'file') {
            row.innerHTML = `
                <label>${escapeHtml(field.label)}</label>
                <div class="file-row">
                    <input type="text" data-field="${field.id}" value="${escapeAttr(currentVal)}" style="flex:1;">
                </div>
            `;
        } else {
            row.innerHTML = `
                <label>${escapeHtml(field.label)}</label>
                <input type="text" data-field="${field.id}" value="${escapeAttr(currentVal)}">
            `;
        }

        pnlProperties.appendChild(row);
    }

    // Wire up change handlers
    pnlProperties.querySelectorAll('input[data-field]').forEach(input => {
        input.addEventListener('input', () => onFieldChanged());
    });

    pnlProperties.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldId = btn.dataset.field;
            const input = pnlProperties.querySelector(`input[data-field="${fieldId}"]`);
            if (!input) return;
            let val = parseInt(input.value, 10) || 0;
            val = btn.dataset.action === 'inc' ? val + 1 : Math.max(0, val - 1);
            input.value = val;
            onFieldChanged();
        });
    });
}

function renderEmptyProperties() {
    pnlProperties.innerHTML = `
        <div class="section-label">PROPERTIES</div>
        <p style="color: var(--text-secondary); font-style: italic; text-align: center; margin-top: 16px; font-size: 13px;">
            Select a graphic to edit
        </p>
    `;
}

function collectFieldValues() {
    const values = {};
    pnlProperties.querySelectorAll('input[data-field]').forEach(input => {
        values[input.dataset.field] = input.value;
    });
    return values;
}

function onFieldChanged() {
    const values = collectFieldValues();

    if (selectedActiveId) {
        const item = activeGraphics.find(i => i.id === selectedActiveId);
        if (item) {
            item.fieldValues = { ...values };
            updatePreviewAll();
        }
    } else if (selectedRundownId) {
        window.api.updateRundownFieldValues(selectedRundownId, values);
    }
}

// ─── Scene / Preview ───

function addToScene(template, fieldValues) {
    const item = {
        id: crypto.randomUUID(),
        templateId: template.id,
        name: template.name,
        fieldValues: { ...fieldValues }
    };
    // Capture current property panel values
    const currentValues = collectFieldValues();
    if (Object.keys(currentValues).length > 0) {
        item.fieldValues = currentValues;
    }
    activeGraphics.push(item);
    renderActiveGraphics();
    updatePreviewAll();
}

async function updatePreviewAll() {
    const frame = previewFrame.contentWindow;
    if (!frame) return;

    // Clear first
    try { frame.clearAll(); } catch { /* iframe may not be ready */ return; }

    for (const item of activeGraphics) {
        const template = templates.find(t => t.id === item.templateId);
        if (!template) continue;

        const renderedHtml = await window.api.renderTemplate(template.id, item.fieldValues);
        if (renderedHtml) {
            try {
                frame.injectGraphic(template.layer, renderedHtml);
                frame.updateGraphic(template.id, null, true);
            } catch { /* ignore */ }
        }
    }
}

// ─── Sidebar Buttons ───

document.getElementById('btnSaveRundown').addEventListener('click', () => window.api.saveRundown());
document.getElementById('btnLoadRundown').addEventListener('click', async () => {
    await window.api.loadRundown();
    rundownItems = await window.api.getRundown();
    renderRundown();
});

document.getElementById('btnRenameRundown').addEventListener('click', async () => {
    if (!selectedRundownId) return;
    const item = rundownItems.find(i => i.id === selectedRundownId);
    if (!item) return;
    const newName = prompt('Rename item:', item.name);
    if (newName !== null && newName.trim()) {
        await window.api.renameRundownItem(selectedRundownId, newName.trim());
        rundownItems = await window.api.getRundown();
        renderRundown();
    }
});

document.getElementById('btnRemoveRundown').addEventListener('click', async () => {
    if (!selectedRundownId) return;
    await window.api.removeRundownItem(selectedRundownId);
    selectedRundownId = null;
    rundownItems = await window.api.getRundown();
    renderRundown();
    renderEmptyProperties();
});

// ─── Editor Buttons ───

document.getElementById('btnClearPreview').addEventListener('click', () => {
    activeGraphics = [];
    selectedActiveId = null;
    renderActiveGraphics();
    renderEmptyProperties();
    try { previewFrame.contentWindow.clearAll(); } catch {}
});

document.getElementById('btnSaveAsRundown').addEventListener('click', async () => {
    if (activeGraphics.length === 0) {
        alert('No active graphics to save.');
        return;
    }
    const items = activeGraphics.map(item => ({
        templateId: item.templateId,
        name: item.name,
        fieldValues: { ...item.fieldValues }
    }));
    // Replace rundown with preview items via main process
    await window.api.replaceRundown(items.map(i => ({
        id: crypto.randomUUID(),
        templateId: i.templateId,
        name: i.name,
        isActive: false,
        fieldValues: i.fieldValues
    })));
    rundownItems = await window.api.getRundown();
    renderRundown();
});

// ─── Tabs ───

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ─── Settings ───

document.getElementById('chkLumaKey').addEventListener('change', (e) => {
    window.api.setBackgroundMode(e.target.checked ? 'luma' : 'chroma');
});

document.getElementById('btnMoveOutput').addEventListener('click', () => {
    const select = document.getElementById('cboMonitors');
    const index = parseInt(select.value, 10);
    if (!isNaN(index)) window.api.moveOutputToMonitor(index);
});

document.getElementById('cboThemePresets').addEventListener('change', (e) => {
    const presets = {
        microsoft: { primary: '#0078D7', secondary: '#737373', text: '#FFFFFF' },
        broadcast: { primary: '#00008B', secondary: '#FFD700', text: '#FFFFFF' },
        sports:    { primary: '#D50000', secondary: '#FFFFFF', text: '#FFFFFF' }
    };
    const p = presets[e.target.value];
    if (p) {
        setThemeInputs(p.primary, p.secondary, p.text);
        applyTheme();
    }
});

document.getElementById('btnApplyTheme').addEventListener('click', applyTheme);

// Sync color pickers ↔ text inputs
['Primary', 'Secondary', 'Text'].forEach(name => {
    const picker = document.getElementById(`color${name}`);
    const text = document.getElementById(`txt${name}Color`);
    picker.addEventListener('input', () => { text.value = picker.value; });
    text.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
    });
});

function setThemeInputs(primary, secondary, text) {
    document.getElementById('txtPrimaryColor').value = primary;
    document.getElementById('colorPrimary').value = primary;
    document.getElementById('txtSecondaryColor').value = secondary;
    document.getElementById('colorSecondary').value = secondary;
    document.getElementById('txtTextColor').value = text;
    document.getElementById('colorText').value = text;
}

function applyTheme() {
    window.api.applyTheme({
        primaryColor: document.getElementById('txtPrimaryColor').value,
        secondaryColor: document.getElementById('txtSecondaryColor').value,
        textColor: document.getElementById('txtTextColor').value
    });
}

async function refreshMonitors() {
    const monitors = await window.api.getMonitors();
    const select = document.getElementById('cboMonitors');
    select.innerHTML = '';
    monitors.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.index;
        opt.textContent = m.label + (m.isPrimary ? ' [Primary]' : '');
        select.appendChild(opt);
    });
    // Default to second monitor
    if (monitors.length > 1) select.value = '1';
    document.getElementById('txtMonitorCount').textContent = `Monitors: ${monitors.length}`;
}

// ─── Keyboard shortcuts ───

document.addEventListener('keydown', (e) => {
    // Delete key removes selected rundown item
    if (e.key === 'Delete' && selectedRundownId) {
        document.getElementById('btnRemoveRundown').click();
    }
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        window.api.saveRundown();
    }
    // Space to toggle selected rundown item
    if (e.key === ' ' && selectedRundownId && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleRundownItem(selectedRundownId);
    }
    // 1-9 for quick play
    if (/^[1-9]$/.test(e.key) && e.target.tagName !== 'INPUT') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < rundownItems.length) {
            toggleRundownItem(rundownItems[idx].id);
        }
    }
});

// ─── Helpers ───

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Boot ───
init();
