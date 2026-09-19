/* store.js — data layer for AssetTrack Pro
   Persists everything to localStorage so the app works entirely client-side
   (required since GitHub Pages only serves static content, no backend). */

const STORAGE_KEYS = {
  assets: 'atp_assets',
  categories: 'atp_categories',
  locations: 'atp_locations',
  activity: 'atp_activity',
  seeded: 'atp_seeded'
};

const DEFAULT_CATEGORIES = [
  'Laptops', 'Desktops', 'Monitors', 'Mobile Devices', 'Networking Equipment',
  'Office Furniture', 'Software Licenses', 'Servers', 'Peripherals'
];

const DEFAULT_LOCATIONS = [
  'Accra HQ - Airport City', 'Accra HQ - Ridge Office', 'Tema Warehouse',
  'Kumasi Branch', 'Takoradi Branch', 'Tamale Branch',
  'Remote / Home Office', 'East Legon Office'
];

function uid() {
  return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('Failed to parse storage key', key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const Store = {
  getAssets() { return loadJSON(STORAGE_KEYS.assets, []); },
  saveAssets(assets) { saveJSON(STORAGE_KEYS.assets, assets); },

  getCategories() { return loadJSON(STORAGE_KEYS.categories, [...DEFAULT_CATEGORIES]); },
  saveCategories(cats) { saveJSON(STORAGE_KEYS.categories, cats); },

  getLocations() { return loadJSON(STORAGE_KEYS.locations, [...DEFAULT_LOCATIONS]); },
  saveLocations(locs) { saveJSON(STORAGE_KEYS.locations, locs); },

  getActivity() { return loadJSON(STORAGE_KEYS.activity, []); },
  logActivity(message) {
    const activity = this.getActivity();
    activity.unshift({ message, timestamp: new Date().toISOString() });
    saveJSON(STORAGE_KEYS.activity, activity.slice(0, 30));
  },

  addAsset(asset) {
    const assets = this.getAssets();
    asset.id = uid();
    asset.createdAt = new Date().toISOString();
    assets.push(asset);
    this.saveAssets(assets);
    this.logActivity(`Added asset "${asset.name}" (${asset.tag})`);
    return asset;
  },

  updateAsset(id, updates) {
    const assets = this.getAssets();
    const idx = assets.findIndex(a => a.id === id);
    if (idx === -1) return null;
    assets[idx] = { ...assets[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveAssets(assets);
    this.logActivity(`Updated asset "${assets[idx].name}" (${assets[idx].tag})`);
    return assets[idx];
  },

  deleteAsset(id) {
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === id);
    const filtered = assets.filter(a => a.id !== id);
    this.saveAssets(filtered);
    if (asset) this.logActivity(`Deleted asset "${asset.name}" (${asset.tag})`);
  },

  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  seedSampleData() {
    const categories = [...DEFAULT_CATEGORIES];
    const locations = [...DEFAULT_LOCATIONS];
    this.saveCategories(categories);
    this.saveLocations(locations);

    const statuses = ['In Use', 'In Stock', 'In Maintenance', 'Retired'];
    const names = [
      ['Dell Latitude 5440', 'Laptops'], ['MacBook Pro 14"', 'Laptops'],
      ['HP EliteDesk 800', 'Desktops'], ['Dell OptiPlex 7010', 'Desktops'],
      ['LG UltraWide 34"', 'Monitors'], ['Samsung 27" Monitor', 'Monitors'],
      ['iPhone 14', 'Mobile Devices'], ['Samsung Galaxy S23', 'Mobile Devices'],
      ['Cisco Catalyst 2960 Switch', 'Networking Equipment'],
      ['Ubiquiti UniFi AP', 'Networking Equipment'],
      ['Herman Miller Aeron Chair', 'Office Furniture'],
      ['Standing Desk', 'Office Furniture'],
      ['Microsoft 365 E3 License', 'Software Licenses'],
      ['Adobe Creative Cloud License', 'Software Licenses'],
      ['Dell PowerEdge R740 Server', 'Servers'],
      ['Logitech MX Master 3', 'Peripherals'],
      ['Logitech Webcam C920', 'Peripherals'],
      ['HP LaserJet Pro Printer', 'Peripherals']
    ];
    const people = ['Kwame Owusu', 'Ama Serwaa', 'Kofi Mensah', 'Akosua Boateng', 'Yaw Asante', 'Abena Darko', '', '', ''];

    const assets = names.map((n, i) => {
      const purchaseDaysAgo = 30 + Math.floor(Math.random() * 900);
      const purchaseDate = new Date(Date.now() - purchaseDaysAgo * 86400000);
      const warrantyEnd = new Date(purchaseDate.getTime() + (365 * (1 + Math.floor(Math.random() * 3))) * 86400000);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const assignedTo = status === 'In Use' ? people[Math.floor(Math.random() * people.length)] : '';
      return {
        id: uid(),
        tag: `AST-${String(1000 + i)}`,
        name: n[0],
        category: n[1],
        serial: `SN${Math.floor(Math.random() * 900000 + 100000)}`,
        status,
        assignedTo,
        location: locations[Math.floor(Math.random() * locations.length)],
        purchaseDate: purchaseDate.toISOString().slice(0, 10),
        warrantyEnd: warrantyEnd.toISOString().slice(0, 10),
        value: Math.round((1500 + Math.random() * 42000) * 100) / 100,
        vendor: ['Compu Ghana', 'Franko Trading Enterprise', 'Jumia Ghana', 'Telefonika Ghana'][Math.floor(Math.random() * 4)],
        notes: '',
        createdAt: new Date().toISOString()
      };
    });
    this.saveAssets(assets);
    saveJSON(STORAGE_KEYS.activity, [{ message: 'Sample data loaded', timestamp: new Date().toISOString() }]);
    localStorage.setItem(STORAGE_KEYS.seeded, '1');
  },

  ensureSeeded() {
    if (!localStorage.getItem(STORAGE_KEYS.seeded)) {
      this.seedSampleData();
    }
    if (this.getCategories().length === 0) this.saveCategories([...DEFAULT_CATEGORIES]);
    if (this.getLocations().length === 0) this.saveLocations([...DEFAULT_LOCATIONS]);
  }
};
