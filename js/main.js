// State management to store fetched opportunities
let globalOpportunities = [];
let revealObserver;
const savedOpportunityIds = new Set();

function savedOpportunityStorageKey() {
  return window.portalUser?.id
    ? `youth-portal-saved-opportunities:${window.portalUser.id}`
    : 'youth-portal-saved-opportunities';
}

function loadSavedOpportunityIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(savedOpportunityStorageKey()) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch (error) {
    console.error('Saved opportunities could not be loaded from local storage:', error);
    return new Set();
  }
}

function persistSavedOpportunityIds() {
  try {
    localStorage.setItem(savedOpportunityStorageKey(), JSON.stringify([...savedOpportunityIds]));
    return true;
  } catch (error) {
    console.error('Saved opportunities could not be stored in local storage:', error);
    return false;
  }
}

async function initializeSavedOpportunities() {
  if (window.portalAuthReady) await window.portalAuthReady;
  savedOpportunityIds.clear();
  loadSavedOpportunityIds().forEach(id => savedOpportunityIds.add(id));

  if (window.portalProfile?.role === 'youth_user' && typeof window.loadSavedOpportunitiesForCurrentUser === 'function') {
    try {
      const cloudSavedIds = await window.loadSavedOpportunitiesForCurrentUser();
      cloudSavedIds.forEach(id => savedOpportunityIds.add(id));
      persistSavedOpportunityIds();
    } catch (error) {
      console.error('Unable to load saved opportunities from your account:', error);
      showSavedFeedback('Saved opportunities could not be loaded from your account. Try again later.', true);
    }
  }

  updateSavedCount();
}

function initMobileNavigation() {
  document.querySelectorAll('.nav-toggle').forEach(button => {
    const navigation = document.getElementById(button.getAttribute('aria-controls'));
    if (!navigation) return;

    const closeMenu = () => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open navigation menu');
      navigation.classList.remove('is-open');
    };

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      navigation.classList.toggle('is-open', isOpen);
    });

    navigation.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
      closeMenu();
      button.focus();
    });
  });
}

function initSavedOpportunityControls() {
  document.addEventListener('click', async event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-save-opportunity]');
    if (!button) return;

    const id = button.dataset.saveOpportunity;
    const wasSaved = savedOpportunityIds.has(id);
    if (wasSaved) savedOpportunityIds.delete(id);
    else savedOpportunityIds.add(id);

    if (!persistSavedOpportunityIds()) {
      if (wasSaved) savedOpportunityIds.add(id);
      else savedOpportunityIds.delete(id);
      updateSavedCount();
      return;
    }

    button.disabled = true;
    try {
      if (window.portalProfile?.role === 'youth_user' && typeof window.saveOpportunityForCurrentUser === 'function') {
        await window.saveOpportunityForCurrentUser(id, !wasSaved);
      }
    } catch (error) {
      console.error('Unable to update saved opportunity in your account:', error);
      if (wasSaved) savedOpportunityIds.add(id);
      else savedOpportunityIds.delete(id);
      persistSavedOpportunityIds();
      updateSavedCount();
      refreshSavedOpportunityCards();
      showSavedFeedback('Your account could not be updated, so this change was not saved. Please try again.', true);
      return;
    }

    showSavedFeedback('');
    updateSavedCount();
    refreshSavedOpportunityCards();
  });

  const savedOnly = document.getElementById('saved-only');
  if (savedOnly) savedOnly.addEventListener('change', applyFilters);
  updateSavedCount();
}

function updateSavedCount() {
  const count = document.getElementById('saved-count');
  if (count) count.textContent = `${savedOpportunityIds.size} saved`;
}

function showSavedFeedback(message, isError = false) {
  let feedback = document.getElementById('saved-feedback');
  if (!feedback) {
    const container = document.getElementById('opportunities-container') || document.getElementById('featured-container');
    if (!container) return;
    feedback = document.createElement('p');
    feedback.id = 'saved-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    container.before(feedback);
  }

  feedback.className = isError ? 'saved-feedback text-danger' : 'saved-feedback text-success';
  feedback.textContent = message;
}

function refreshSavedOpportunityCards() {
  if (document.getElementById('opportunities-container')) {
    applyFilters();
    return;
  }

  renderCards(
    globalOpportunities.filter(item => !calculateTimeRemaining(item.closingDate).isExpired).slice(0, 4),
    'featured-container'
  );
}

/**
 * Initializes smooth scrolling, scroll reveals, pointer motion, and the sticky header.
 */
function initMotionEffects() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('body > header');
  const hero = document.querySelector('.hero-section');
  let lenis;

  if (!prefersReducedMotion && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      smoothWheel: true,
      easing: time => Math.min(1, 1.001 - Math.pow(2, -10 * time))
    });

    const animate = time => {
      lenis.raf(time);
      window.requestAnimationFrame(animate);
    };

    window.requestAnimationFrame(animate);
  }

  const updateScrollState = scrollPosition => {
    if (header) {
      header.classList.toggle('is-scrolled', scrollPosition > 50);
    }

    if (hero) {
      const collapsePoint = hero.offsetTop + hero.offsetHeight * 0.35;
      hero.classList.toggle('is-collapsing', scrollPosition > collapsePoint);
    }
  };

  if (lenis) {
    lenis.on('scroll', ({ scroll }) => updateScrollState(scroll));
  } else {
    window.addEventListener('scroll', () => updateScrollState(window.scrollY), { passive: true });
  }
  updateScrollState(window.scrollY);

  initHeroParallax(hero, prefersReducedMotion);
  initCardTilt(prefersReducedMotion);
  initMobileNavigation();

  const selector = [
    '.page-header',
    '.hero-section',
    '.category-card',
    '.featured-section',
    '.closing-soon-sidebar',
    '.widget-card',
    '.resource-card',
    '.scam-guide-section',
    '.filters-sidebar',
    '.opportunity-card',
    '.details-card',
    '.auth-card',
    '.admin-card',
    '.contact-card'
  ].join(',');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll(selector).forEach(element => {
      element.classList.add('reveal-on-scroll', 'visible');
    });
    return;
  }

  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  observeRevealElements(document);
}

function initHeroParallax(hero, prefersReducedMotion) {
  if (!hero || prefersReducedMotion) return;

  const cards = hero.querySelectorAll('.hero-spatial-card');
  if (!cards.length) return;

  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || hero.classList.contains('is-collapsing')) return;

    const bounds = hero.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

    cards.forEach((card, index) => {
      const depth = (index + 1) * 5;
      card.style.setProperty('--pointer-x', `${horizontal * depth}px`);
      card.style.setProperty('--pointer-y', `${vertical * depth}px`);
      card.style.setProperty('--pointer-rotate', `${horizontal * 5}deg`);
    });
  });

  hero.addEventListener('pointerleave', () => {
    cards.forEach(card => {
      card.style.removeProperty('--pointer-x');
      card.style.removeProperty('--pointer-y');
      card.style.removeProperty('--pointer-rotate');
    });
  });
}

function initCardTilt(prefersReducedMotion) {
  if (prefersReducedMotion) return;

  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;

    const card = event.target.closest('.opportunity-card');
    if (!card) return;

    const bounds = card.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width;
    const vertical = (event.clientY - bounds.top) / bounds.height;
    const rotateX = (0.5 - vertical) * 12;
    const rotateY = (horizontal - 0.5) * 12;

    card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
    card.style.setProperty('--glow-x', `${(horizontal * 100).toFixed(2)}%`);
    card.style.setProperty('--glow-y', `${(vertical * 100).toFixed(2)}%`);
    card.classList.add('is-tilting');
  });

  document.addEventListener('pointerout', event => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest('.opportunity-card');
    if (!card || (event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) return;

    card.classList.remove('is-tilting');
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
  });
}

function observeRevealElements(root) {
  if (!revealObserver) return;

  const selector = [
    '.page-header',
    '.hero-section',
    '.category-card',
    '.featured-section',
    '.closing-soon-sidebar',
    '.widget-card',
    '.resource-card',
    '.scam-guide-section',
    '.filters-sidebar',
    '.opportunity-card',
    '.details-card',
    '.auth-card',
    '.admin-card',
    '.contact-card'
  ].join(',');

  if (root.matches?.(selector) && !root.classList.contains('reveal-on-scroll')) {
    root.classList.add('reveal-on-scroll');
  }

  root.querySelectorAll(selector).forEach(element => {
    if (element.classList.contains('reveal-on-scroll')) return;
    element.classList.add('reveal-on-scroll');
    revealObserver.observe(element);
  });

  if (root.matches?.(selector) && !root.classList.contains('visible')) {
    revealObserver.observe(root);
  }
}

/**
 * 1. FETCH AND RENDER DATA
 * Loads the opportunities dataset from the JSON file and routes initialization
 * based on which page the user is currently visiting.
 */
async function loadOpportunities() {
  const path = window.location.pathname;
  const usesOpportunityData =
    path.endsWith('index.html') ||
    path === '/' ||
    path.endsWith('/') ||
    path.endsWith('opportunities.html') ||
    path.endsWith('details.html');

  if (!usesOpportunityData) return;

  try {
    const response = await fetch('./data/opportunities.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    globalOpportunities = await response.json();

    // Determine current page to initialize specific logic
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

  const resultsCount = document.getElementById('results-count');
  if (resultsCount) resultsCount.textContent = 'Opportunity results could not be loaded.';

  const closingSoonList = document.getElementById('closing-soon-list');
  if (closingSoonList) {
    const message = document.createElement('li');
    message.className = 'closing-item error-text';
    message.textContent = 'Upcoming deadlines could not be loaded. Please try again later.';
    closingSoonList.replaceChildren(message);
  }

  const detailsContainer = document.getElementById('opportunity-details-container');
  if (detailsContainer) {
    detailsContainer.replaceChildren();
    const message = document.createElement('p');
    message.className = 'error-text';
    message.textContent = 'Opportunity details could not be loaded. Please try again later.';
    detailsContainer.append(message);
  }
}

/**
 * 2. HOME PAGE LOGIC (index.html)
 */
async function initHomePage() {
  await initializeSavedOpportunities();

  // Keep expired opportunities out of the active featured feed.
  const featured = globalOpportunities
    .filter(item => !calculateTimeRemaining(item.closingDate).isExpired)
    .slice(0, 4);
  renderCards(featured, 'featured-container');

  // Render "Closing Soon" widget items
  renderClosingSoonWidget();
}

/**
 * 3. BROWSE PAGE LOGIC (opportunities.html)
 */
async function initBrowsePage() {
  await initializeSavedOpportunities();

  // Check for URL query params passed from Home page (e.g. ?category=internship or ?search=developer)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search') || '';
  const categoryParam = urlParams.get('category') || '';

  // Set initial inputs if query params exist
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchParam) searchInput.value = searchParam;

  if (categoryParam) {
    const checkbox = Array.from(document.querySelectorAll('input[name="category"]'))
      .find(input => input.value.toLowerCase() === categoryParam.toLowerCase());
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
  const deadlineSelect = document.getElementById('deadline-select');
  const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
  const filterForm = document.getElementById('filter-form');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (locationSelect) locationSelect.addEventListener('change', applyFilters);
  if (experienceSelect) experienceSelect.addEventListener('change', applyFilters);
  if (deadlineSelect) deadlineSelect.addEventListener('change', applyFilters);

  categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  if (filterForm) {
    filterForm.addEventListener('reset', () => window.setTimeout(applyFilters, 0));
  }

  const container = document.getElementById('opportunities-container');
  if (container) {
    container.addEventListener('click', event => {
      if (!(event.target instanceof Element) || !event.target.closest('#reset-empty-filters')) return;
      filterForm?.reset();
      document.getElementById('search-input')?.focus();
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
  const deadlineDays = Number(document.getElementById('deadline-select')?.value || 0);
  const savedOnly = document.getElementById('saved-only')?.checked || false;

  // Get array of checked category values
  const checkedCategories = Array.from(
    document.querySelectorAll('input[name="category"]:checked')
  ).map(cb => normalizeFacet(cb.value));

  const filtered = globalOpportunities.filter(item => {
    // Search match (title, company, or description)
    const matchesSearch =
      !searchVal ||
        (item.title || '').toLowerCase().includes(searchVal) ||
        (item.organization || '').toLowerCase().includes(searchVal) ||
        (item.shortDescription || '').toLowerCase().includes(searchVal) ||
        getOpportunityDescription(item).toLowerCase().includes(searchVal);

    // Category match
    const normalizedCategory = normalizeFacet(item.category);
    const matchesCategory = checkedCategories.length === 0 || checkedCategories.some(category => {
      if (category === 'entry level jobs') {
        return normalizeFacet(item.experienceLevel) === 'entry level' ||
          normalizedCategory === 'first job';
      }
      return category === normalizedCategory;
    });

    // Location match
    const matchesLocation =
      !locationVal || normalizeFacet(item.location).includes(normalizeFacet(locationVal));

    // Experience match
    const matchesExperience = !experienceVal ||
      (experienceVal === 'matric / entry level'
        ? normalizeFacet(item.experienceLevel) === 'entry level' ||
          (Array.isArray(item.qualifications) && item.qualifications.some(value => /matric|grade\s*12/i.test(value)))
        : normalizeFacet(item.experienceLevel) === normalizeFacet(experienceVal));

    const deadline = calculateTimeRemaining(item.closingDate);
    const matchesDeadline =
      !deadline.isExpired &&
      (!deadlineDays || (deadline.daysRemaining !== null && deadline.daysRemaining <= deadlineDays));
    const matchesSaved = !savedOnly || savedOpportunityIds.has(String(item.id));

    return matchesSearch && matchesCategory && matchesLocation && matchesExperience && matchesDeadline && matchesSaved;
  });

  // Update results counter text
  const resultsCountEl = document.getElementById('results-count');
  if (resultsCountEl) {
    resultsCountEl.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'opportunity' : 'opportunities'}`;
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
    const resetButton = targetContainerId === 'opportunities-container'
      ? '<button type="button" class="btn btn-secondary" id="reset-empty-filters">Reset filters</button>'
      : '';
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No opportunities found</p>
        <p class="empty-text">Try adjusting your search terms or filters to find active positions.</p>
        ${resetButton}
      </div>
    `;
    observeRevealElements(container);
    return;
  }

  // Map opportunities into HTML markup
  container.innerHTML = opportunities
    .map(item => {
      const deadline = calculateTimeRemaining(item.closingDate);

      return `
        <article class="opportunity-card">
          <div class="card-header">
            <span class="category-badge">${escapeHTML(item.category || 'Opportunity')}</span>
            <span class="deadline-tag ${deadline.urgency}">
              ${escapeHTML(deadline.label)}
            </span>
          </div>
          <span class="demo-data-badge">Sample Opportunity / Demo Data</span>
          <h3 class="card-title">${escapeHTML(item.title || 'Untitled opportunity')}</h3>
          <p class="card-org">${escapeHTML(item.organization || 'Organisation not provided')}</p>
          <p class="card-description">${escapeHTML(item.shortDescription || getOpportunityDescription(item) || 'Description not provided.')}</p>
          <ul class="card-details-list">
            <li><i data-lucide="map-pin" aria-hidden="true"></i><span>${escapeHTML(item.location || 'Location not provided')}</span></li>
            <li><i data-lucide="calendar" aria-hidden="true"></i><span>Closes: ${escapeHTML(formatDate(item.closingDate))}</span></li>
            <li><i data-lucide="graduation-cap" aria-hidden="true"></i><span>Experience: ${escapeHTML(item.experienceLevel || 'Not specified')}</span></li>
            <li><i data-lucide="coins" aria-hidden="true"></i><span>${escapeHTML(item.stipend || 'Unspecified Stipend')}</span></li>
          </ul>
          <div class="card-footer">
            <button type="button" class="btn btn-outline btn-sm" data-save-opportunity="${escapeHTML(item.id)}" aria-label="${savedOpportunityIds.has(String(item.id)) ? 'Remove from saved opportunities' : 'Save opportunity'}: ${escapeHTML(item.title || 'Untitled opportunity')}" aria-pressed="${savedOpportunityIds.has(String(item.id))}">
              ${savedOpportunityIds.has(String(item.id)) ? 'Saved' : 'Save'}
            </button>
            <a href="details.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary btn-sm">View Details</a>
          </div>
        </article>
      `;
    })
    .join('');

  observeRevealElements(container);
  if (window.lucide) window.lucide.createIcons();
}

/**
 * 4. LIVE DEADLINE COUNTDOWN & CALCULATOR
 * Calculates days left against closingDate string (e.g. "2026-10-31")
 */
function calculateTimeRemaining(closingDateStr) {
  if (!closingDateStr) return { label: 'No Deadline', isExpired: false, daysRemaining: null, urgency: 'neutral' };

  const closeDay = new Date(`${closingDateStr}T00:00:00`);
  if (Number.isNaN(closeDay.getTime())) {
    return { label: 'Date unavailable', isExpired: false, daysRemaining: null, urgency: 'neutral' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((closeDay - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { label: 'Expired', isExpired: true, daysRemaining, urgency: 'danger' };
  }

  if (daysRemaining === 0) {
    return { label: 'Closes Today', isExpired: false, daysRemaining, urgency: 'danger' };
  }

  const urgency = daysRemaining <= 7 ? 'danger' : daysRemaining <= 30 ? 'warning' : 'neutral';
  const label = daysRemaining === 1 ? '1 Day Left' : `${daysRemaining} Days Left`;
  return { label, isExpired: false, daysRemaining, urgency };
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
    widgetContainer.innerHTML = '<li class="closing-item closing-empty">No upcoming deadlines.</li>';
    return;
  }

  widgetContainer.innerHTML = upcoming
    .map(
      item => `
    <li class="closing-item">
      <span class="deadline-tag ${item.timeInfo.urgency}">${escapeHTML(item.timeInfo.label)}</span>
      <a href="details.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a>
      <small>
        <span><i data-lucide="map-pin" aria-hidden="true"></i>${escapeHTML(item.location || 'Location not provided')}</span>
        <span><i data-lucide="calendar" aria-hidden="true"></i>Closes ${escapeHTML(formatDate(item.closingDate))}</span>
      </small>
    </li>
  `
    )
    .join('');
  observeRevealElements(widgetContainer);
  if (window.lucide) window.lucide.createIcons();
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
  setTextContent('detail-organization', opportunity.organization || 'Organisation not provided');
  setTextContent('detail-category', opportunity.category || 'Not specified');
  setTextContent('detail-stipend', opportunity.stipend || 'N/A');
  setTextContent('detail-location', opportunity.location || 'Not specified');
  setTextContent('detail-arrangement', opportunity.workArrangement || 'Not specified');
  setTextContent('detail-closing-date', formatDate(opportunity.closingDate));
  setTextContent('detail-description', getOpportunityDescription(opportunity) || 'A full description was not provided for this opportunity.');
  setTextContent('detail-verification', opportunity.verifiedStatus ? 'Verified listing' : 'Not independently verified');
  setTextContent('detail-updated', opportunity.updatedDate ? `Listing updated ${formatDate(opportunity.updatedDate)}` : 'Update date not provided');

  // Apply Live Countdown to timer element
  const deadlineStatus = calculateTimeRemaining(opportunity.closingDate);
  const timerEl = document.getElementById('live-countdown');
  if (timerEl) {
    timerEl.textContent = deadlineStatus.label;
    timerEl.classList.toggle('text-danger', deadlineStatus.isExpired || deadlineStatus.urgency === 'danger');
    const expiredNotice = document.getElementById('detail-expiry-notice');
    if (expiredNotice) expiredNotice.hidden = !deadlineStatus.isExpired;
  }

  renderDetailList('detail-requirements', opportunity.eligibility || opportunity.requirements, 'eligibility-note', 'Eligibility details were not supplied for this listing.');
  renderDetailList('detail-qualifications', opportunity.qualifications, 'qualification-note', 'No separate qualification details were supplied; review the eligibility criteria above.');
  renderDetailList('detail-documents', opportunity.documents, 'documents-note', 'No document checklist was supplied for this listing.');
  const applicationSteps = Array.isArray(opportunity.applicationInstructions) && opportunity.applicationInstructions.length
    ? opportunity.applicationInstructions
    : [
        'Confirm you meet the eligibility requirements and note the closing date.',
        'Prepare the documents listed above.',
        "Open the organisation's official application site and follow its current instructions.",
        'Submit before the deadline and keep any confirmation for your records.'
      ];
  const hasSpecificApplicationSteps = Array.isArray(opportunity.applicationInstructions) && opportunity.applicationInstructions.length > 0;
  renderDetailList('detail-application-steps', applicationSteps);
  const applicationNote = document.getElementById('application-note');
  if (applicationNote) {
    applicationNote.hidden = hasSpecificApplicationSteps;
    applicationNote.textContent = hasSpecificApplicationSteps
      ? ''
      : 'These general steps are guidance only; follow any instructions provided by the organisation.';
  }

  // Only expose an application link when the listing supplies a real HTTP(S) URL.
  const applyBtn = document.getElementById('apply-button');
  const applyUnavailable = document.getElementById('apply-unavailable');
  const applicationUrl = getSafeApplicationUrl(opportunity);
  if (applyBtn && applicationUrl && !deadlineStatus.isExpired) {
    applyBtn.href = applicationUrl;
    applyBtn.hidden = false;
  } else if (applyUnavailable) {
    applyUnavailable.textContent = deadlineStatus.isExpired
      ? 'This opportunity has passed its closing date. Confirm directly with the organisation before applying.'
      : 'The organisation has not provided a verified application link for this demo listing.';
    applyUnavailable.hidden = false;
  }
}

/**
 * HELPER UTILITIES
 */
function setTextContent(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text || '';
}

function renderDetailList(elementId, values, noteId, noteText) {
  const list = document.getElementById(elementId);
  const note = document.getElementById(noteId);
  const items = Array.isArray(values) ? values.filter(Boolean) : [];

  if (list) {
    list.replaceChildren(...items.map(value => {
      const item = document.createElement('li');
      item.textContent = value;
      return item;
    }));
  }

  if (note) {
    note.hidden = items.length > 0 || !noteText;
    note.textContent = noteText;
  }
}

function getOpportunityDescription(opportunity) {
  return opportunity.fullDescription || opportunity.description || opportunity.shortDescription || '';
}

function getSafeApplicationUrl(opportunity) {
  const candidate = opportunity.applicationLink || opportunity.applyUrl;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol) || hostname === 'example.com' || hostname.endsWith('.example.com')) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Not provided';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function normalizeFacet(value) {
  return String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
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

window.saveOpportunityForCurrentUser = saveOpportunityForCurrentUser;
window.loadSavedOpportunitiesForCurrentUser = loadSavedOpportunitiesForCurrentUser;

// Initialize script when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initMotionEffects();
  initSavedOpportunityControls();
  loadOpportunities();
});