/* charts.js — Chart.js wrappers for AssetTrack Pro */

const ChartsModule = (() => {
  let statusChart, categoryChart, valueChart, depreciationChart, acquiredChart;

  const PALETTE = ['#4f46e5', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f43f5e'];

  function destroy(chart) { if (chart) chart.destroy(); }

  function renderStatusChart(assets) {
    const ctx = document.getElementById('chartStatus');
    const counts = {};
    assets.forEach(a => counts[a.status] = (counts[a.status] || 0) + 1);
    destroy(statusChart);
    statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: PALETTE }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }, maintainAspectRatio: false }
    });
  }

  function renderCategoryChart(assets) {
    const ctx = document.getElementById('chartCategory');
    const counts = {};
    assets.forEach(a => counts[a.category] = (counts[a.category] || 0) + 1);
    destroy(categoryChart);
    categoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [{ label: 'Assets', data: Object.values(counts), backgroundColor: '#4f46e5', borderRadius: 4 }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } }, y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  function renderValueChart(assets) {
    const ctx = document.getElementById('chartValue');
    const sums = {};
    assets.forEach(a => sums[a.category] = (sums[a.category] || 0) + (Number(a.value) || 0));
    destroy(valueChart);
    valueChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(sums),
        datasets: [{ data: Object.values(sums), backgroundColor: PALETTE }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }, maintainAspectRatio: false }
    });
  }

  function renderDepreciationChart(assets) {
    const ctx = document.getElementById('chartDepreciation');
    const now = new Date();
    const labels = assets.map(a => a.tag);
    const bookValues = assets.map(a => {
      const purchase = new Date(a.purchaseDate || now);
      const years = Math.max(0, (now - purchase) / (365 * 86400000));
      const depRate = Math.min(1, years / 5);
      return Math.max(0, Number(a.value || 0) * (1 - depRate));
    });
    destroy(depreciationChart);
    depreciationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Original Value', data: assets.map(a => Number(a.value) || 0), backgroundColor: '#c7d2fe' },
          { label: 'Est. Book Value', data: bookValues, backgroundColor: '#4f46e5' }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: { x: { ticks: { display: false } }, y: { beginAtZero: true } }
      }
    });
  }

  function renderAcquiredChart(assets) {
    const ctx = document.getElementById('chartAcquired');
    const buckets = {};
    assets.forEach(a => {
      if (!a.purchaseDate) return;
      const key = a.purchaseDate.slice(0, 7);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const labels = Object.keys(buckets).sort();
    destroy(acquiredChart);
    acquiredChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Assets Acquired', data: labels.map(l => buckets[l]), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.15)', fill: true, tension: 0.3 }]
      },
      options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }

  return { renderStatusChart, renderCategoryChart, renderValueChart, renderDepreciationChart, renderAcquiredChart };
})();
