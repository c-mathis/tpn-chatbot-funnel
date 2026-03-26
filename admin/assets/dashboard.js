/* ==========================================================================
   TPN CRM DASHBOARD JAVASCRIPT
   ========================================================================== */

// ==========================================================================
// CONFIGURATION
// ==========================================================================

const CONFIG = {
  API_BASE: 'https://tpn-crm-api.YOUR_SUBDOMAIN.workers.dev',
  AUTO_REFRESH_INTERVAL: 60000, // 60 seconds
  ITEMS_PER_PAGE: 50,
  TOAST_DURATION: 5000
};

// Global state
let state = {
  auth: null,
  leads: [],
  filteredLeads: [],
  buyers: [],
  currentPage: 1,
  sortField: 'createdAt',
  sortDirection: 'desc',
  filters: {
    startDate: null,
    endDate: null,
    buyer: '',
    status: ''
  },
  autoRefreshEnabled: false,
  autoRefreshTimer: null
};

// ==========================================================================
// AUTHENTICATION
// ==========================================================================

function initAuth() {
  const authForm = document.getElementById('auth-form');
  authForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const authError = document.getElementById('auth-error');

  // Encode credentials
  const credentials = btoa(`${username}:${password}`);
  state.auth = credentials;

  // Test authentication by fetching metrics
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/metrics`, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (response.ok) {
      // Auth successful
      document.getElementById('auth-prompt').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      initDashboard();
    } else if (response.status === 401) {
      authError.textContent = 'Invalid username or password';
      authError.style.display = 'block';
    } else {
      authError.textContent = 'Authentication failed. Please try again.';
      authError.style.display = 'block';
    }
  } catch (error) {
    authError.textContent = 'Connection failed. Please check your internet connection.';
    authError.style.display = 'block';
  }
}

function handleLogout() {
  state.auth = null;
  state.leads = [];
  state.buyers = [];

  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
  }

  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('auth-prompt').style.display = 'flex';
  document.getElementById('auth-form').reset();
  document.getElementById('auth-error').style.display = 'none';
}

// ==========================================================================
// DASHBOARD INITIALIZATION
// ==========================================================================

function initDashboard() {
  // Load initial data
  fetchMetrics();
  fetchLeads();
  fetchBuyers();

  // Set up event listeners
  setupEventListeners();

  // Update last refresh time
  updateLastRefreshTime();

  // Start auto-refresh if enabled
  if (state.autoRefreshEnabled) {
    startAutoRefresh();
  }
}

function setupEventListeners() {
  // Header controls
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('refresh-btn').addEventListener('click', handleManualRefresh);

  // Filter controls
  document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
  document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
  document.getElementById('export-csv-btn').addEventListener('click', exportLeads);

  // Pagination
  document.getElementById('prev-page-btn').addEventListener('click', () => handlePagination(state.currentPage - 1));
  document.getElementById('next-page-btn').addEventListener('click', () => handlePagination(state.currentPage + 1));

  // Retry buttons
  document.getElementById('retry-table-btn').addEventListener('click', fetchLeads);
  document.getElementById('retry-buyers-btn').addEventListener('click', fetchBuyers);

  // Table sorting
  const sortableHeaders = document.querySelectorAll('#leads-table th[data-sort]');
  sortableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      handleSort(field);
    });
  });
}

function handleManualRefresh() {
  fetchMetrics();
  fetchLeads();
  fetchBuyers();
  updateLastRefreshTime();
  showToast('Data refreshed successfully', 'success');
}

function startAutoRefresh() {
  state.autoRefreshTimer = setInterval(() => {
    fetchMetrics();
    fetchLeads();
    fetchBuyers();
    updateLastRefreshTime();
  }, CONFIG.AUTO_REFRESH_INTERVAL);
}

function updateLastRefreshTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  document.getElementById('last-updated-time').textContent = timeString;
}

// ==========================================================================
// API CALLS
// ==========================================================================

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${state.auth}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchMetrics() {
  try {
    const data = await apiRequest('/api/metrics');
    updateMetricsDisplay(data);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    showToast('Failed to load metrics', 'error');
  }
}

async function fetchLeads(filters = null) {
  // Show loading state
  document.getElementById('loading-table').style.display = 'flex';
  document.getElementById('error-table').style.display = 'none';
  document.getElementById('empty-table').style.display = 'none';
  document.getElementById('leads-table').style.display = 'none';

  try {
    // Build query string
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.buyer) params.append('buyer', filters.buyer);
      if (filters.status) params.append('status', filters.status);
    }

    const endpoint = `/api/leads${params.toString() ? '?' + params.toString() : ''}`;
    const data = await apiRequest(endpoint);

    state.leads = data.leads || [];
    state.filteredLeads = [...state.leads];

    // Hide loading, show table
    document.getElementById('loading-table').style.display = 'none';

    if (state.leads.length === 0) {
      document.getElementById('empty-table').style.display = 'flex';
    } else {
      document.getElementById('leads-table').style.display = 'table';
      renderLeadsTable();
    }
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    document.getElementById('loading-table').style.display = 'none';
    document.getElementById('error-table').style.display = 'flex';
    document.getElementById('error-table-message').textContent = 'Failed to load leads. Please try again.';
  }
}

async function updateLeadStatus(leadId, newStatus) {
  try {
    await apiRequest(`/api/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    // Update local state
    const lead = state.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = newStatus;
      renderLeadsTable();
    }

    showToast('Lead status updated', 'success');
  } catch (error) {
    console.error('Failed to update lead status:', error);
    showToast('Failed to update status', 'error');
  }
}

async function fetchBuyers() {
  // Show loading state
  document.getElementById('loading-buyers').style.display = 'flex';
  document.getElementById('error-buyers').style.display = 'none';
  document.getElementById('buyers-container').style.display = 'none';

  try {
    const data = await apiRequest('/api/buyers');
    state.buyers = data.buyers || [];

    // Hide loading, show buyers
    document.getElementById('loading-buyers').style.display = 'none';
    document.getElementById('buyers-container').style.display = 'block';

    renderBuyerSettings();
    updateBuyerFilters();
  } catch (error) {
    console.error('Failed to fetch buyers:', error);
    document.getElementById('loading-buyers').style.display = 'none';
    document.getElementById('error-buyers').style.display = 'flex';
    document.getElementById('error-buyers-message').textContent = 'Failed to load buyer settings. Please try again.';
  }
}

async function updateBuyer(buyerId, updates) {
  try {
    await apiRequest(`/api/buyers/${buyerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    // Update local state
    const buyer = state.buyers.find(b => b.id === buyerId);
    if (buyer) {
      Object.assign(buyer, updates);
      renderBuyerSettings();
    }

    showToast('Buyer settings updated', 'success');
  } catch (error) {
    console.error('Failed to update buyer:', error);
    showToast('Failed to update buyer settings', 'error');
  }
}

async function exportLeads() {
  try {
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const endpoint = `/api/export${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Basic ${state.auth}`
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tpn-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast('Leads exported successfully', 'success');
  } catch (error) {
    console.error('Failed to export leads:', error);
    showToast('Failed to export leads', 'error');
  }
}

// ==========================================================================
// RENDERING FUNCTIONS
// ==========================================================================

function updateMetricsDisplay(data) {
  document.getElementById('total-leads').textContent = data.totalLeads || 0;
  document.getElementById('today-leads').textContent = data.todayLeads || 0;
  document.getElementById('buyer1-distribution').textContent = `${data.buyer1Distribution || 0}%`;
  document.getElementById('buyer2-distribution').textContent = `${data.buyer2Distribution || 0}%`;
}

function renderLeadsTable() {
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = '';

  // Sort leads
  const sortedLeads = [...state.filteredLeads].sort((a, b) => {
    const aVal = a[state.sortField];
    const bVal = b[state.sortField];

    if (aVal < bVal) return state.sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return state.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedLeads.length / CONFIG.ITEMS_PER_PAGE);
  const startIndex = (state.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
  const paginatedLeads = sortedLeads.slice(startIndex, endIndex);

  // Render rows
  paginatedLeads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="lead-id">${lead.id || 'N/A'}</span></td>
      <td><span class="lead-name">${escapeHtml(lead.name || 'N/A')}</span></td>
      <td><span class="lead-email">${escapeHtml(lead.email || 'N/A')}</span></td>
      <td><span class="lead-phone">${escapeHtml(lead.phone || 'N/A')}</span></td>
      <td>${escapeHtml(lead.state || 'N/A')}</td>
      <td>${escapeHtml(lead.taxProblem || 'N/A')}</td>
      <td>${escapeHtml(lead.buyer || 'N/A')}</td>
      <td>
        <select class="status-select" data-lead-id="${lead.id}">
          <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
          <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
          <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>Qualified</option>
          <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
          <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
        </select>
      </td>
      <td>${formatDate(lead.createdAt)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon-small" title="View Details" data-action="view" data-lead-id="${lead.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners to status selects
  const statusSelects = tbody.querySelectorAll('.status-select');
  statusSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const leadId = e.target.getAttribute('data-lead-id');
      const newStatus = e.target.value;
      updateLeadStatus(leadId, newStatus);
    });
  });

  // Add event listeners to action buttons
  const actionButtons = tbody.querySelectorAll('[data-action="view"]');
  actionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const leadId = e.currentTarget.getAttribute('data-lead-id');
      viewLeadDetails(leadId);
    });
  });

  // Update table info
  document.getElementById('table-count').textContent = `${sortedLeads.length} lead${sortedLeads.length !== 1 ? 's' : ''}`;

  // Update pagination
  updatePagination(totalPages);
}

function renderBuyerSettings() {
  const container = document.getElementById('buyers-container');

  if (state.buyers.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No buyers configured</p></div>';
    return;
  }

  const buyerList = document.createElement('div');
  buyerList.className = 'buyer-list';

  state.buyers.forEach(buyer => {
    const buyerItem = document.createElement('div');
    buyerItem.className = 'buyer-item';
    buyerItem.innerHTML = `
      <div class="buyer-item-header">
        <div class="buyer-name">${escapeHtml(buyer.name)}</div>
        <div class="buyer-status">
          <span class="status-indicator ${buyer.active ? 'active' : ''}"></span>
          <label class="buyer-toggle">
            <input type="checkbox" ${buyer.active ? 'checked' : ''} data-buyer-id="${buyer.id}">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="buyer-stats">
        <div class="buyer-stat">
          <div class="buyer-stat-label">Total Leads</div>
          <div class="buyer-stat-value">${buyer.totalLeads || 0}</div>
        </div>
        <div class="buyer-stat">
          <div class="buyer-stat-label">Weight</div>
          <div class="buyer-stat-value">${buyer.weight || 0}%</div>
        </div>
      </div>
      <div class="buyer-weight-control">
        <label class="buyer-stat-label">Distribution Weight</label>
        <div class="weight-slider">
          <input type="range" min="0" max="100" value="${buyer.weight || 50}" data-buyer-id="${buyer.id}" data-control="weight">
          <span class="weight-value">${buyer.weight || 50}%</span>
        </div>
      </div>
    `;
    buyerList.appendChild(buyerItem);
  });

  container.innerHTML = '';
  container.appendChild(buyerList);

  // Add event listeners
  const toggles = container.querySelectorAll('.buyer-toggle input');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const buyerId = e.target.getAttribute('data-buyer-id');
      const active = e.target.checked;
      updateBuyer(buyerId, { active });
    });
  });

  const weightSliders = container.querySelectorAll('[data-control="weight"]');
  weightSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const weightValue = e.target.parentElement.querySelector('.weight-value');
      weightValue.textContent = `${e.target.value}%`;
    });

    slider.addEventListener('change', (e) => {
      const buyerId = e.target.getAttribute('data-buyer-id');
      const weight = parseInt(e.target.value);
      updateBuyer(buyerId, { weight });
    });
  });
}

function updateBuyerFilters() {
  const buyerFilter = document.getElementById('filter-buyer');
  buyerFilter.innerHTML = '<option value="">All Buyers</option>';

  state.buyers.forEach(buyer => {
    const option = document.createElement('option');
    option.value = buyer.id;
    option.textContent = buyer.name;
    buyerFilter.appendChild(option);
  });
}

function updatePagination(totalPages) {
  const pagination = document.getElementById('pagination');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const currentPageSpan = document.getElementById('current-page');
  const totalPagesSpan = document.getElementById('total-pages');

  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  currentPageSpan.textContent = state.currentPage;
  totalPagesSpan.textContent = totalPages;

  prevBtn.disabled = state.currentPage === 1;
  nextBtn.disabled = state.currentPage === totalPages;
}

// ==========================================================================
// FILTER & SORT HANDLERS
// ==========================================================================

function applyFilters() {
  const startDate = document.getElementById('filter-start-date').value;
  const endDate = document.getElementById('filter-end-date').value;
  const buyer = document.getElementById('filter-buyer').value;
  const status = document.getElementById('filter-status').value;

  state.filters = { startDate, endDate, buyer, status };
  state.currentPage = 1;

  // Filter locally if API doesn't support filtering
  state.filteredLeads = state.leads.filter(lead => {
    if (buyer && lead.buyer !== buyer) return false;
    if (status && lead.status !== status) return false;
    if (startDate && new Date(lead.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(lead.createdAt) > new Date(endDate)) return false;
    return true;
  });

  renderLeadsTable();
  showToast('Filters applied', 'info');
}

function resetFilters() {
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('filter-buyer').value = '';
  document.getElementById('filter-status').value = '';

  state.filters = { startDate: null, endDate: null, buyer: '', status: '' };
  state.filteredLeads = [...state.leads];
  state.currentPage = 1;

  renderLeadsTable();
  showToast('Filters reset', 'info');
}

function handleSort(field) {
  if (state.sortField === field) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortField = field;
    state.sortDirection = 'asc';
  }

  renderLeadsTable();
}

function handlePagination(page) {
  state.currentPage = page;
  renderLeadsTable();

  // Scroll to top of table
  document.querySelector('.table-section').scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

function viewLeadDetails(leadId) {
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;

  // Create a simple modal or alert for now
  const details = `
Lead Details:
-------------
ID: ${lead.id}
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone}
State: ${lead.state}
Tax Problem: ${lead.taxProblem}
Buyer: ${lead.buyer}
Status: ${lead.status}
Created: ${formatDate(lead.createdAt)}
  `;

  alert(details);
  // TODO: Replace with proper modal
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close">&times;</button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.remove();
  }, CONFIG.TOAST_DURATION);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
