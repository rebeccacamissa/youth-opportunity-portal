// State management to store fetched opportunities
let globalOpportunities = [];

/**
 * 1. FETCH AND RENDER DATA
 * Loads the opportunities dataset from the JSON file and routes initialization
 * based on which page the user is currently visiting.
 */
async function loadOpportunities() {
  try {
    const response = await fetch('./data/opportunities.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    globalOpportunities = await response.json();

    // Determine current page to initialize specific logic
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
      initHomePage();
    } else if (path.endsWith('opportunities.html')) {
      initBrowsePage();
    } else if (path.endsWith('details.html')) {
      initDetailsPage();
    }
  } catch (error) {
    console.error('Error loading opportunities data:', error);
    renderErrorMessage();
  }
}

/**
 * Renders fallback error message if fetching JSON fails
 */
function renderErrorMessage() {
  const containers = ['featured-container', 'opportunities-container'];
  containers.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = `<p class="error-text">Failed to load opportunities. Please try again later.</p>`;
    }
  });
}

/**
 * 2. HOME PAGE LOGIC (index.html)
 */
function initHomePage() {
  // Render top 4 items as featured
  const featured = globalOpportunities.slice(0, 4);
  renderCards(featured, 'featured-container');

  // Render "Closing Soon" widget items
  renderClosingSoonWidget();
}

/**
 * 3. BROWSE PAGE LOGIC (opportunities.html)
 */
function initBrowsePage() {
  // Check for URL query params passed from Home page (e.g. ?category=internship or ?search=developer)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search') || '';
  const categoryParam = urlParams.get('category') || '';

  // Set initial inputs if query params exist
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchParam) searchInput.value = searchParam;

  if (categoryParam) {
    const checkbox = document.querySelector(`input[name="category"][value="${categoryParam}"]`);
    if (checkbox) checkbox.checked = true;
  }

  // Initial render with potential query filters applied
  applyFilters();

  // Attach event listeners for real-time filtering
  setupFilterEventListeners();
}

/**
 * Sets up event listeners for inputs, dropdowns, checkboxes, and reset buttons
 */
function setupFilterEventListeners() {
  const searchInput = document.getElementById('search-input');
  const locationSelect = document.getElementById('location-select');
  const experienceSelect = document.getElementById('experience-select');
  const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
  const resetBtn = document.getElementById('reset-filters-btn');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (locationSelect) locationSelect.addEventListener('change', applyFilters);
  if (experienceSelect) experienceSelect.addEventListener('change', applyFilters);

  categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.getElementById('filter-form').reset();
      applyFilters();
    });
  }
}

/**
 * IMPLEMENT CLIENT-SIDE SEARCH & MULTI-FILTER
 * Filters globalOpportunities array based on active user controls
 */
function applyFilters() {
  const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const locationVal = document.getElementById('location-select')?.value.toLowerCase() || '';
  const experienceVal = document.getElementById('experience-select')?.value.toLowerCase() || '';

  // Get array of checked category values
  const checkedCategories = Array.from(
    document.querySelectorAll('input[name="category"]:checked')
  ).map(cb => cb.value.toLowerCase());

  const filtered = globalOpportunities.filter(item => {
    // Search match (title, company, or description)
    const matchesSearch =
      !searchVal ||
      item.title.toLowerCase().includes(searchVal) ||
      item.organization.toLowerCase().includes(searchVal) ||
      (item.description && item.description.toLowerCase().includes(searchVal));

    // Category match
    const matchesCategory =
      checkedCategories.length === 0 ||
      checkedCategories.includes(item.category.toLowerCase());

    // Location match
    const matchesLocation =
      !locationVal || item.location.toLowerCase().includes(locationVal);

    // Experience match
    const matchesExperience =
      !experienceVal ||
      (item.experienceLevel && item.experienceLevel.toLowerCase() === experienceVal);

    return matchesSearch && matchesCategory && matchesLocation && matchesExperience;
  });

  // Update results counter text
  const resultsCountEl = document.getElementById('results-count');
  if (resultsCountEl) {
    resultsCountEl.textContent = `Showing ${filtered.length} opportunity${filtered.length === 1 ? '' : 'ies'}`;
  }

  // Render cards or empty state
  renderCards(filtered, 'opportunities-container');
}

/**
 * CARD RENDERING FUNCTION
 * Renders HTML cards into the specified target container element
 */
function renderCards(opportunities, targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  // Empty state rendering
  if (opportunities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No opportunities found</p>
        <p class="empty-text">Try adjusting your search terms or filters to find active positions.</p>
      </div>
    `;
    return;
  }

  // Map opportunities into HTML markup
  container.innerHTML = opportunities
    .map(item => {
      const countdown = calculateTimeRemaining(item.closingDate);

      return `
        <article class="opportunity-card">
          <div class="card-header">
            <span class="category-badge">${escapeHTML(item.category)}</span>
            <span class="deadline-tag ${countdown.isExpired ? 'danger' : 'warning'}">
              ${countdown.label}
            </span>
          </div>
          <h3 class="card-title">${escapeHTML(item.title)}</h3>
          <p class="card-org">${escapeHTML(item.organization)}</p>
          <ul class="card-details-list">
            <li>📍 ${escapeHTML(item.location)}</li>
            <li>💰 ${escapeHTML(item.stipend || 'Unspecified Stipend')}</li>
          </ul>
          <div class="card-footer">
            <a href="details.html?id=${item.id}" class="btn btn-secondary btn-sm">View Details</a>
          </div>
        </article>
      `;
    })
    .join('');
}

/**
 * 4. LIVE DEADLINE COUNTDOWN & CALCULATOR
 * Calculates days left against closingDate string (e.g. "2026-10-31")
 */
function calculateTimeRemaining(closingDateStr) {
  if (!closingDateStr) return { label: 'No Deadline', isExpired: false };

  const now = new Date();
  const closingDate = new Date(closingDateStr);
  const diffTime = closingDate - now;

  if (diffTime <= 0) {
    return { label: 'Expired', isExpired: true };
  }

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { label: '1 Day Left', isExpired: false };
  }
  return { label: `${diffDays} Days Left`, isExpired: false };
}

/**
 * Renders Closing Soon Widget on Home Page
 */
function renderClosingSoonWidget() {
  const widgetContainer = document.getElementById('closing-soon-list');
  if (!widgetContainer) return;

  // Filter unexpired items and sort by closing date ascending
  const upcoming = globalOpportunities
    .map(item => ({ ...item, timeInfo: calculateTimeRemaining(item.closingDate) }))
    .filter(item => !item.timeInfo.isExpired)
    .sort((a, b) => new Date(a.closingDate) - new Date(b.closingDate))
    .slice(0, 4);

  if (upcoming.length === 0) {
    widgetContainer.innerHTML = '<li>No urgent deadlines.</li>';
    return;
  }

  widgetContainer.innerHTML = upcoming
    .map(
      item => `
    <li class="closing-item">
      <span class="deadline-tag danger">${item.timeInfo.label}</span>
      <a href="details.html?id=${item.id}">${escapeHTML(item.title)}</a>
      <small>${escapeHTML(item.location)}</small>
    </li>
  `
    )
    .join('');
}

/**
 * 5. DETAILS PAGE LOGIC (details.html)
 * Reads opportunity ID from URL query parameters and renders detailed view
 */
function initDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const opportunity = globalOpportunities.find(item => String(item.id) === String(id));

  if (!opportunity) {
    const container = document.getElementById('opportunity-details-container');
    if (container) {
      container.innerHTML = `
        <h2>Opportunity Not Found</h2>
        <p>The position you are looking for may have been removed or expired.</p>
        <a href="opportunities.html" class="btn btn-primary">Back to Listings</a>
      `;
    }
    return;
  }

  // Populate Details elements
  setTextContent('detail-title', opportunity.title);
  setTextContent('detail-company', opportunity.organization);
  setTextContent('detail-stipend', opportunity.stipend || 'N/A');
  setTextContent('detail-location', opportunity.location);
  setTextContent('detail-arrangement', opportunity.workArrangement || 'On-site');
  setTextContent('detail-closing-date', opportunity.closingDate);
  setTextContent('detail-description', opportunity.description);

  // Apply Live Countdown to timer element
  const timerEl = document.getElementById('live-countdown');
  if (timerEl) {
    const countdown = calculateTimeRemaining(opportunity.closingDate);
    timerEl.textContent = countdown.label;
    if (countdown.isExpired) {
      timerEl.classList.add('text-danger');
    }
  }

  // Render Requirements list
  const reqList = document.getElementById('detail-requirements');
  if (reqList && Array.isArray(opportunity.requirements)) {
    reqList.innerHTML = opportunity.requirements
      .map(req => `<li>${escapeHTML(req)}</li>`)
      .join('');
  }

  // Apply Direct Application URL
  const applyBtn = document.getElementById('apply-button');
  if (applyBtn && opportunity.applyUrl) {
    applyBtn.href = opportunity.applyUrl;
  }
}

/**
 * HELPER UTILITIES
 */
function setTextContent(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text || '';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize script when DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadOpportunities);