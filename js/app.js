/* app.js — UI logic, routing, CRUD and reporting for AssetTrack Pro */

(() => {
  'use strict';

  Store.ensureSeeded();

  const state = {
    view: 'dashboard',
    search: '',
    filters: { category: '', status: '', location: '' },
    sort: { field: 'tag', dir: 'asc' },
    page: 1,
    pageSize: 10
  };

  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Toast helper ---------- */
  function toast(msg) {
    $('#appToastBody').textContent = msg;
    new bootstrap.Toast(document.getElementById('appToast'), { delay: 2200 }).show();
  }

  /* ---------- Sidebar / routing ---------- */
  function setView(view) {
    state.view = view;
    $all('.view').forEach(v => v.classList.add('d-none'));
    document.getElementById(`view-${view}`).classList.remove('d-none');
    $all('.sidebar-nav .nav-link').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    const titles = {
      dashboard: 'Dashboard', assets: 'Assets', assignments: 'Assignments',
      maintenance: 'Maintenance', reports: 'Reports', settings: 'Settings'
    };
    $('#viewTitle').textContent = titles[view] || view;
    render();
    document.getElementById('sidebar').classList.remove('show');
  }

  $all('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setView(link.dataset.view);
    });
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
  });

  window.addEventListener('hashchange', () => {
    const v = location.hash.replace('#', '') || 'dashboard';
    if (document.getElementById(`view-${v}`)) setView(v);
  });

  /* ---------- Populate select options ---------- */
  function fillOptions(select, values, includeBlank, blankLabel) {
    const current = select.value;
    select.innerHTML = '';
    if (includeBlank) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = blankLabel || 'All';
      select.appendChild(opt);
    }
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      select.appendChild(opt);
    });
    if (values.includes(current)) select.value = current;
  }

  function refreshLookups() {
    const categories = Store.getCategories();
    const locations = Store.getLocations();
    fillOptions($('#filterCategory'), categories, true, 'All Categories');
    fillOptions($('#filterLocation'), locations, true, 'All Locations');
    fillOptions($('#fCategory'), categories, false);
    fillOptions($('#fLocation'), locations, false);
  }

  /* ---------- Status badge helper ---------- */
  function statusBadge(status) {
    const map = {
      'In Use': 'badge-status-inuse',
      'In Stock': 'badge-status-instock',
      'In Maintenance': 'badge-status-maintenance',
      'Retired': 'badge-status-retired',
      'Lost/Stolen': 'badge-status-lost'
    };
    return `<span class="badge rounded-pill ${map[status] || 'text-bg-secondary'}">${status}</span>`;
  }

  function fmtMoney(n) {
    return (Number(n) || 0).toLocaleString('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date) ? '—' : date.toLocaleDateString('en-GH');
  }

  /* ---------- Filtering / search ---------- */
  function getFilteredAssets() {
    let assets = Store.getAssets();
    const q = state.search.trim().toLowerCase();
    if (q) {
      assets = assets.filter(a =>
        [a.name, a.tag, a.serial, a.assignedTo, a.category, a.location, a.vendor]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    if (state.filters.category) assets = assets.filter(a => a.category === state.filters.category);
    if (state.filters.status) assets = assets.filter(a => a.status === state.filters.status);
    if (state.filters.location) assets = assets.filter(a => a.location === state.filters.location);

    const { field, dir } = state.sort;
    assets.sort((a, b) => {
      let va = a[field], vb = b[field];
      if (field === 'value') { va = Number(va) || 0; vb = Number(vb) || 0; }
      else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return assets;
  }

  /* ---------- Rendering: Dashboard ---------- */
  function renderDashboard() {
    const assets = Store.getAssets();
    $('#kpiTotalAssets').textContent = assets.length.toLocaleString();
    $('#kpiTotalValue').textContent = fmtMoney(assets.reduce((s, a) => s + (Number(a.value) || 0), 0));
    $('#kpiAssigned').textContent = assets.filter(a => a.assignedTo).length;
    $('#kpiMaintenance').textContent = assets.filter(a => a.status === 'In Maintenance').length;

    ChartsModule.renderStatusChart(assets);
    ChartsModule.renderCategoryChart(assets);
    ChartsModule.renderValueChart(assets);

    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 86400000);
    const expiring = assets
      .filter(a => a.warrantyEnd && new Date(a.warrantyEnd) >= now && new Date(a.warrantyEnd) <= soon)
      .sort((a, b) => new Date(a.warrantyEnd) - new Date(b.warrantyEnd));
    $('#badgeExpiring').textContent = expiring.length;
    $('#tblExpiring tbody').innerHTML = expiring.length
      ? expiring.map(a => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.tag)}</td><td>${fmtDate(a.warrantyEnd)}</td></tr>`).join('')
      : `<tr><td colspan="3" class="text-center text-muted py-3">No warranties expiring in the next 60 days</td></tr>`;

    const activity = Store.getActivity();
    $('#activityFeed').innerHTML = activity.length
      ? activity.slice(0, 10).map(a => `<li class="list-group-item d-flex justify-content-between"><span>${escapeHtml(a.message)}</span><small class="text-muted">${new Date(a.timestamp).toLocaleString()}</small></li>`).join('')
      : `<li class="list-group-item text-center text-muted">No recent activity</li>`;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- Rendering: Assets table ---------- */
  function renderAssetsTable() {
    const all = getFilteredAssets();
    $('#assetsCountLabel').textContent = `${all.length} asset${all.length === 1 ? '' : 's'}`;

    const totalPages = Math.max(1, Math.ceil(all.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageItems = all.slice(start, start + state.pageSize);

    $('#assetsTableBody').innerHTML = pageItems.length ? pageItems.map(rowHtml).join('') :
      `<tr><td colspan="9" class="text-center text-muted py-4">No assets match your filters</td></tr>`;

    renderPagination(totalPages);
    bindRowActions();
  }

  function rowHtml(a) {
    const photoCell = a.photo
      ? `<img src="${a.photo}" class="asset-thumb btn-view-photo" data-name="${escapeHtml(a.name)}" alt="${escapeHtml(a.name)}">`
      : `<span class="asset-thumb-placeholder"><i class="bi bi-image"></i></span>`;
    return `<tr data-id="${a.id}">
      <td>${photoCell}</td>
      <td class="fw-semibold">${escapeHtml(a.tag)}</td>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.category)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${escapeHtml(a.assignedTo) || '<span class="text-muted">Unassigned</span>'}</td>
      <td>${escapeHtml(a.location) || '—'}</td>
      <td>${fmtDate(a.purchaseDate)}</td>
      <td>${fmtMoney(a.value)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary btn-edit" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }

  function renderPagination(totalPages) {
    const pag = $('#pagination');
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === state.page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    pag.innerHTML = html;
    pag.querySelectorAll('a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      state.page = Number(a.dataset.page);
      renderAssetsTable();
    }));
  }

  function bindRowActions() {
    $all('#assetsTableBody .btn-edit').forEach(btn => btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      openAssetModal(id);
    }));
    $all('#assetsTableBody .btn-delete').forEach(btn => btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      const asset = Store.getAssets().find(a => a.id === id);
      if (confirm(`Delete asset "${asset?.name}"? This cannot be undone.`)) {
        Store.deleteAsset(id);
        toast('Asset deleted');
        render();
      }
    }));
    $all('#assetsTableBody .btn-view-photo').forEach(img => img.addEventListener('click', () => {
      $('#photoLightboxTitle').textContent = img.dataset.name || 'Asset Photo';
      $('#photoLightboxImg').src = img.src;
      new bootstrap.Modal(document.getElementById('photoLightbox')).show();
    }));
  }

  /* Sortable headers */
  $all('#assetsTable thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (state.sort.field === field) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      else { state.sort.field = field; state.sort.dir = 'asc'; }
      renderAssetsTable();
    });
  });

  /* Filters */
  ['filterCategory', 'filterStatus', 'filterLocation'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('filter', '').toLowerCase();
      state.filters[key] = e.target.value;
      state.page = 1;
      renderAssetsTable();
    });
  });

  document.getElementById('globalSearch').addEventListener('input', (e) => {
    state.search = e.target.value;
    state.page = 1;
    render();
  });

  /* ---------- Assignments & Maintenance views ---------- */
  function renderAssignments() {
    const assigned = Store.getAssets().filter(a => a.assignedTo);
    $('#assignmentsTable tbody').innerHTML = assigned.length ? assigned.map(a => `
      <tr data-id="${a.id}">
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.tag)}</td>
        <td>${escapeHtml(a.assignedTo)}</td>
        <td>${fmtDate(a.updatedAt || a.createdAt)}</td>
        <td>${escapeHtml(a.location) || '—'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary btn-unassign">Unassign</button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-muted py-4">No assigned assets</td></tr>`;

    $all('.btn-unassign').forEach(btn => btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      Store.updateAsset(id, { assignedTo: '', status: 'In Stock' });
      toast('Asset unassigned');
      render();
    }));
  }

  function renderMaintenance() {
    const items = Store.getAssets().filter(a => a.status === 'In Maintenance');
    $('#maintenanceTable tbody').innerHTML = items.length ? items.map(a => `
      <tr data-id="${a.id}">
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.tag)}</td>
        <td>${escapeHtml(a.category)}</td>
        <td>${escapeHtml(a.notes) || '—'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success btn-resolve">Mark In Use</button>
        </td>
      </tr>`).join('') : `<tr><td colspan="5" class="text-center text-muted py-4">No assets in maintenance</td></tr>`;

    $all('.btn-resolve').forEach(btn => btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      Store.updateAsset(id, { status: 'In Use' });
      toast('Asset marked as In Use');
      render();
    }));
  }

  /* ---------- Reports ---------- */
  function renderReports() {
    const assets = Store.getAssets();
    ChartsModule.renderDepreciationChart(assets);
    ChartsModule.renderAcquiredChart(assets);

    const byCategory = {};
    assets.forEach(a => {
      const c = a.category || 'Uncategorized';
      byCategory[c] = byCategory[c] || { count: 0, total: 0, book: 0 };
      byCategory[c].count += 1;
      byCategory[c].total += Number(a.value) || 0;
      const years = Math.max(0, (Date.now() - new Date(a.purchaseDate || Date.now())) / (365 * 86400000));
      const depRate = Math.min(1, years / 5);
      byCategory[c].book += Math.max(0, (Number(a.value) || 0) * (1 - depRate));
    });
    $('#reportTable tbody').innerHTML = Object.entries(byCategory).map(([cat, v]) => `
      <tr><td>${escapeHtml(cat)}</td><td>${v.count}</td><td>${fmtMoney(v.total)}</td><td>${fmtMoney(v.book)}</td></tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted py-4">No data</td></tr>`;
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    const categories = Store.getCategories();
    const locations = Store.getLocations();
    $('#categoryList').innerHTML = categories.map(c => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        ${escapeHtml(c)}
        <button class="btn btn-sm btn-outline-danger btn-remove-cat" data-value="${escapeHtml(c)}"><i class="bi bi-x-lg"></i></button>
      </li>`).join('');
    $('#locationList').innerHTML = locations.map(l => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        ${escapeHtml(l)}
        <button class="btn btn-sm btn-outline-danger btn-remove-loc" data-value="${escapeHtml(l)}"><i class="bi bi-x-lg"></i></button>
      </li>`).join('');

    $all('.btn-remove-cat').forEach(btn => btn.addEventListener('click', () => {
      const remaining = Store.getCategories().filter(c => c !== btn.dataset.value);
      Store.saveCategories(remaining);
      refreshLookups();
      renderSettings();
    }));
    $all('.btn-remove-loc').forEach(btn => btn.addEventListener('click', () => {
      const remaining = Store.getLocations().filter(l => l !== btn.dataset.value);
      Store.saveLocations(remaining);
      refreshLookups();
      renderSettings();
    }));
  }

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const input = document.getElementById('newCategory');
    const val = input.value.trim();
    if (!val) return;
    const cats = Store.getCategories();
    if (!cats.includes(val)) { cats.push(val); Store.saveCategories(cats); }
    input.value = '';
    refreshLookups();
    renderSettings();
  });

  document.getElementById('addLocationBtn').addEventListener('click', () => {
    const input = document.getElementById('newLocation');
    const val = input.value.trim();
    if (!val) return;
    const locs = Store.getLocations();
    if (!locs.includes(val)) { locs.push(val); Store.saveLocations(locs); }
    input.value = '';
    refreshLookups();
    renderSettings();
  });

  document.getElementById('btnResetData').addEventListener('click', () => {
    if (confirm('This will replace all current data with sample data. Continue?')) {
      Store.seedSampleData();
      refreshLookups();
      render();
      toast('Sample data restored');
    }
  });

  document.getElementById('btnClearData').addEventListener('click', () => {
    if (confirm('This will permanently delete ALL assets, categories, and locations. Continue?')) {
      Store.clearAll();
      Store.ensureSeeded === undefined; // no-op guard
      localStorage.setItem(STORAGE_KEYS.seeded, '1');
      Store.saveAssets([]);
      Store.saveCategories([]);
      Store.saveLocations([]);
      refreshLookups();
      render();
      toast('All data cleared');
    }
  });

  /* ---------- Asset modal (add/edit) ---------- */
  const assetModalEl = document.getElementById('assetModal');
  const assetModal = new bootstrap.Modal(assetModalEl);

  /* Resize/compress an uploaded image client-side before storing it as a
     base64 data URL in localStorage, keeping saved data small since browser
     storage quotas are limited (typically ~5-10MB per origin). */
  const MAX_PHOTO_DIMENSION = 480;
  const PHOTO_JPEG_QUALITY = 0.72;

  function resizeImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not load the selected image.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > MAX_PHOTO_DIMENSION) {
            height = Math.round(height * (MAX_PHOTO_DIMENSION / width));
            width = MAX_PHOTO_DIMENSION;
          } else if (height > MAX_PHOTO_DIMENSION) {
            width = Math.round(width * (MAX_PHOTO_DIMENSION / height));
            height = MAX_PHOTO_DIMENSION;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setPhotoPreview(dataUrl) {
    $('#fPhoto').value = dataUrl || '';
    if (dataUrl) {
      $('#photoPreview').src = dataUrl;
      $('#photoPreview').classList.remove('d-none');
      $('#photoPlaceholder').classList.add('d-none');
      $('#btnRemovePhoto').classList.remove('d-none');
    } else {
      $('#photoPreview').src = '';
      $('#photoPreview').classList.add('d-none');
      $('#photoPlaceholder').classList.remove('d-none');
      $('#btnRemovePhoto').classList.add('d-none');
    }
  }

  document.getElementById('fPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); e.target.value = ''; return; }
    try {
      const dataUrl = await resizeImageFile(file);
      setPhotoPreview(dataUrl);
    } catch (err) {
      alert(err.message || 'Failed to process the image.');
    }
    e.target.value = '';
  });

  document.getElementById('btnRemovePhoto').addEventListener('click', () => setPhotoPreview(''));

  function openAssetModal(id) {
    const form = document.getElementById('assetForm');
    form.reset();
    refreshLookups();
    setPhotoPreview('');
    if (id) {
      const asset = Store.getAssets().find(a => a.id === id);
      if (!asset) return;
      document.getElementById('assetModalTitle').textContent = `Edit Asset — ${asset.tag}`;
      $('#assetId').value = asset.id;
      $('#fName').value = asset.name || '';
      $('#fTag').value = asset.tag || '';
      $('#fSerial').value = asset.serial || '';
      $('#fCategory').value = asset.category || '';
      $('#fStatus').value = asset.status || 'In Use';
      $('#fLocation').value = asset.location || '';
      $('#fAssignedTo').value = asset.assignedTo || '';
      $('#fPurchaseDate').value = asset.purchaseDate || '';
      $('#fValue').value = asset.value ?? '';
      $('#fWarrantyEnd').value = asset.warrantyEnd || '';
      $('#fVendor').value = asset.vendor || '';
      $('#fNotes').value = asset.notes || '';
      setPhotoPreview(asset.photo || '');
    } else {
      document.getElementById('assetModalTitle').textContent = 'New Asset';
      $('#assetId').value = '';
      const assets = Store.getAssets();
      $('#fTag').value = `AST-${String(1000 + assets.length)}`;
    }
    assetModal.show();
  }

  document.getElementById('btnAddAsset').addEventListener('click', () => openAssetModal());

  document.getElementById('assetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#assetId').value;
    const payload = {
      name: $('#fName').value.trim(),
      tag: $('#fTag').value.trim(),
      serial: $('#fSerial').value.trim(),
      category: $('#fCategory').value,
      status: $('#fStatus').value,
      location: $('#fLocation').value,
      assignedTo: $('#fAssignedTo').value.trim(),
      purchaseDate: $('#fPurchaseDate').value,
      value: parseFloat($('#fValue').value) || 0,
      warrantyEnd: $('#fWarrantyEnd').value,
      vendor: $('#fVendor').value.trim(),
      notes: $('#fNotes').value.trim(),
      photo: $('#fPhoto').value || ''
    };

    const assets = Store.getAssets();
    const dupe = assets.find(a => a.tag.toLowerCase() === payload.tag.toLowerCase() && a.id !== id);
    if (dupe) { alert('An asset with this tag already exists. Please use a unique tag.'); return; }

    try {
      if (id) {
        Store.updateAsset(id, payload);
        toast('Asset updated');
      } else {
        Store.addAsset(payload);
        toast('Asset added');
      }
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') {
        alert('Your browser storage is full. Try removing the photo or deleting older assets, then save again.');
        return;
      }
      throw err;
    }
    assetModal.hide();
    render();
  });

  /* ---------- Import / Export ---------- */
  document.getElementById('btnExport').addEventListener('click', () => {
    const assets = getFilteredAssets();
    const headers = ['tag', 'name', 'category', 'serial', 'status', 'assignedTo', 'location', 'purchaseDate', 'warrantyEnd', 'value', 'vendor', 'notes'];
    const rows = [headers.join(',')].concat(assets.map(a => headers.map(h => csvEscape(a[h])).join(',')));
    downloadFile(rows.join('\n'), 'assettrack-export.csv', 'text/csv');
  });

  document.getElementById('btnExportJson').addEventListener('click', () => {
    const assets = getFilteredAssets();
    downloadFile(JSON.stringify(assets, null, 2), 'assettrack-export.json', 'application/json');
  });

  function csvEscape(val) {
    const s = (val ?? '').toString();
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('btnImport').addEventListener('click', () => document.getElementById('importFile').click());

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        let imported = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(reader.result);
        } else {
          imported = parseCsv(reader.result);
        }
        const assets = Store.getAssets();
        const existingTags = new Set(assets.map(a => a.tag.toLowerCase()));
        let added = 0;
        imported.forEach(row => {
          if (!row.tag || existingTags.has(row.tag.toLowerCase())) return;
          Store.addAsset({
            name: row.name || 'Unnamed Asset',
            tag: row.tag,
            serial: row.serial || '',
            category: row.category || Store.getCategories()[0] || 'Uncategorized',
            status: row.status || 'In Stock',
            assignedTo: row.assignedTo || '',
            location: row.location || '',
            purchaseDate: row.purchaseDate || '',
            warrantyEnd: row.warrantyEnd || '',
            value: parseFloat(row.value) || 0,
            vendor: row.vendor || '',
            notes: row.notes || ''
          });
          existingTags.add(row.tag.toLowerCase());
          added++;
        });
        refreshLookups();
        render();
        toast(`Imported ${added} asset(s)`);
      } catch (err) {
        alert('Failed to import file: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = splitCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] ?? '');
      return obj;
    });
  }

  function splitCsvLine(line) {
    const result = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  /* ---------- Master render ---------- */
  function render() {
    refreshLookups();
    if (state.view === 'dashboard') renderDashboard();
    else if (state.view === 'assets') renderAssetsTable();
    else if (state.view === 'assignments') renderAssignments();
    else if (state.view === 'maintenance') renderMaintenance();
    else if (state.view === 'reports') renderReports();
    else if (state.view === 'settings') renderSettings();
  }

  /* ---------- Init ---------- */
  const initialView = (location.hash.replace('#', '') || 'dashboard');
  setView(document.getElementById(`view-${initialView}`) ? initialView : 'dashboard');
})();
