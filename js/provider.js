(() => {
  const client = window.supabaseClient;
  const dashboard = document.getElementById('provider-dashboard');
  if (!dashboard) return;

  const panels = [...document.querySelectorAll('.provider-panel')];
  const navigationButtons = [...document.querySelectorAll('[data-dashboard-panel]')];
  const form = document.getElementById('provider-opportunity-form');
  const profileForm = document.getElementById('provider-profile-form');
  const listingsBody = document.getElementById('provider-listings-body');
  const deleteDialog = document.getElementById('delete-listing-dialog');
  const verificationAlert = document.getElementById('provider-verification-alert');
  const toast = document.getElementById('provider-toast');
  let currentUser = null;
  let currentProfile = null;
  let opportunityToDelete = null;
  let toastTimeout;

  function readLocalDemoData(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      if (value === null || typeof value !== typeof fallback) {
        throw new Error(`The local demo data for ${key} has an invalid format.`);
      }
      return value;
    } catch (error) {
      logProviderError(`read local demo data (${key})`, error);
      throw new Error('Dashboard demo data could not be read from this browser.');
    }
  }

  function writeLocalDemoData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logProviderError(`write local demo data (${key})`, error);
      throw new Error('Dashboard demo data could not be saved in this browser.');
    }
  }

  function localDemoListings() {
    const listings = readLocalDemoData('portal_demo_opportunities', []);
    return listings.filter(listing => listing.owner_id === currentUser.id);
  }

  function saveLocalDemoListings(ownerListings) {
    const listings = readLocalDemoData('portal_demo_opportunities', [])
      .filter(listing => listing.owner_id !== currentUser.id);
    writeLocalDemoData('portal_demo_opportunities', [...listings, ...ownerListings]);
    localStorage.removeItem('youth-portal-opportunities-cache');
  }

  function logProviderError(action, error) {
    console.error(`[provider-dashboard] ${action} failed`, {
      message: error?.message || String(error),
      code: error?.code || null,
      details: error?.details || null,
      hint: error?.hint || null
    });
  }

  function showToast(message, type = 'success') {
    window.clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = `provider-toast provider-toast-${type}`;
    toast.hidden = false;
    toastTimeout = window.setTimeout(() => {
      toast.hidden = true;
    }, 6000);
  }

  function showInlineFeedback(id, message, type = '') {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `auth-feedback${type ? ` text-${type}` : ''}`;
    element.hidden = !message;
  }

  function setBusy(button, isBusy, busyText) {
    if (!button) return;
    if (isBusy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function setVerifiedFormState(isVerified) {
    verificationAlert.hidden = isVerified;
    const postingForm = document.getElementById('provider-opportunity-form');
    postingForm.classList.toggle('provider-form-disabled', !isVerified);
    postingForm.querySelectorAll('input, select, textarea, button').forEach(control => {
      control.disabled = !isVerified;
    });
    document.getElementById('metric-verification').textContent = isVerified ? 'Verified' : 'Pending';
    document.getElementById('metric-verification').classList.toggle('is-verified', isVerified);
  }

  function activatePanel(panelId, anchorId) {
    panels.forEach(panel => {
      panel.hidden = panel.id !== panelId;
    });
    const activeButton = navigationButtons.find(button =>
      button.dataset.dashboardPanel === panelId &&
      (!anchorId || button.dataset.dashboardAnchor === anchorId)
    );
    navigationButtons.forEach(button => {
      const active = button === activeButton;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (anchorId) {
      window.requestAnimationFrame(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeRequirements(value) {
    if (Array.isArray(value)) return value.map(String).join('\n');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String).join('\n') : value;
      } catch {
        return value;
      }
    }
    return '';
  }

  function appendTableCell(row, value, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function renderListings(listings) {
    listingsBody.replaceChildren();
    if (!listings.length) {
      const row = document.createElement('tr');
      const cell = appendTableCell(row, 'You have not posted any opportunities yet.');
      cell.colSpan = 5;
      listingsBody.append(row);
      return;
    }

    listings.forEach(listing => {
      const row = document.createElement('tr');
      appendTableCell(row, listing.title || 'Untitled opportunity');
      appendTableCell(row, listing.category || 'Uncategorized');
      appendTableCell(row, listing.created_at ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(listing.created_at)) : 'Date unavailable');

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `provider-listing-status${listing.is_published ? ' is-published' : ''}`;
      badge.textContent = listing.is_published ? 'Published' : 'Draft';
      statusCell.append(badge);
      row.append(statusCell);

      const actions = document.createElement('td');
      actions.className = 'provider-table-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn btn-secondary btn-sm';
      editButton.dataset.editListing = listing.id;
      editButton.textContent = 'Edit';
      editButton.setAttribute('aria-label', `Edit ${listing.title}`);
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-outline btn-sm';
      deleteButton.dataset.deleteListing = listing.id;
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${listing.title}`);
      actions.append(editButton, deleteButton);
      row.append(actions);
      listingsBody.append(row);
    });
  }

  async function fetchListings() {
    showInlineFeedback('listings-feedback', 'Loading your listings…');
    try {
      if (window.PORTAL_DEMO_MODE) {
        const listings = localDemoListings().sort((left, right) =>
          new Date(right.created_at) - new Date(left.created_at)
        );
        renderListings(listings);
        showInlineFeedback('listings-feedback', '');
        return;
      }
      const { data, error } = await client
        .from('opportunities')
        .select('id, title, category, created_at, is_published, organization_name, location, closing_date, description, requirements, application_url')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      renderListings(data || []);
      showInlineFeedback('listings-feedback', '');
    } catch (error) {
      logProviderError('fetch provider listings', error);
      listingsBody.replaceChildren();
      showInlineFeedback('listings-feedback', 'Your listings could not be loaded. Check your connection and try again.', 'danger');
      showToast('Database connection failed. Your listings could not be loaded.', 'error');
    } finally {
      document.getElementById('refresh-dashboard').disabled = false;
    }
  }

  async function fetchMetrics() {
    try {
      if (window.PORTAL_DEMO_MODE) {
        const listings = localDemoListings();
        const activeListings = listings.filter(listing =>
          listing.is_published === true && listing.closing_date >= localDateString()
        );
        const listingIds = new Set(listings.map(listing => String(listing.id)));
        let engagement = 0;
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (!key || !key.startsWith('youth-portal-saved-opportunities:')) continue;
          const savedIds = readLocalDemoData(key, []);
          engagement += savedIds.filter(id => listingIds.has(String(id))).length;
        }
        document.getElementById('metric-active-listings').textContent = String(activeListings.length);
        document.getElementById('metric-student-engagement').textContent = String(engagement);
        return;
      }
      const { data, error } = await client.rpc('provider_dashboard_metrics');
      if (error) throw error;
      const metrics = Array.isArray(data) ? data[0] : data;
      if (!metrics) throw new Error('The provider metrics response was empty.');
      document.getElementById('metric-active-listings').textContent = String(metrics.active_listings ?? 0);
      document.getElementById('metric-student-engagement').textContent = String(metrics.student_engagement ?? 0);
    } catch (error) {
      logProviderError('fetch dashboard metrics', error);
      document.getElementById('metric-active-listings').textContent = 'Unavailable';
      document.getElementById('metric-student-engagement').textContent = 'Unavailable';
      showToast('Dashboard metrics could not be loaded. Please refresh and try again.', 'error');
    } finally {
      document.getElementById('refresh-dashboard').disabled = false;
    }
  }

  function resetOpportunityForm() {
    form.reset();
    document.getElementById('editing-opportunity-id').value = '';
    document.getElementById('opportunity-organization').value = currentProfile.organization_name || '';
    document.getElementById('opportunity-closing-date').min = localDateString();
    document.getElementById('opportunity-submit').textContent = 'Publish Opportunity';
    document.getElementById('opportunity-submit').dataset.originalText = 'Publish Opportunity';
    document.getElementById('cancel-opportunity-edit').hidden = true;
    showInlineFeedback('opportunity-form-feedback', '');
  }

  function startEditingListing(listingId) {
    const row = [...listingsBody.querySelectorAll('[data-edit-listing]')]
      .find(button => button.dataset.editListing === listingId)?.closest('tr');
    if (!row) return;

    fetchListingForEdit(listingId);
  }

  async function fetchListingForEdit(listingId) {
    try {
      let data;
      if (window.PORTAL_DEMO_MODE) {
        data = localDemoListings().find(listing => String(listing.id) === String(listingId));
      } else {
        const result = await client
          .from('opportunities')
          .select('id, title, category, organization_name, location, closing_date, description, requirements, application_url')
          .eq('id', listingId)
          .eq('owner_id', currentUser.id)
          .single();
        if (result.error) throw result.error;
        data = result.data;
      }
      if (!data) throw new Error('The selected listing could not be found.');

      document.getElementById('editing-opportunity-id').value = data.id;
      document.getElementById('opportunity-title').value = data.title || '';
      document.getElementById('opportunity-organization').value = data.organization_name || currentProfile.organization_name || '';
      document.getElementById('opportunity-category').value = data.category || '';
      document.getElementById('opportunity-location').value = data.location || '';
      document.getElementById('opportunity-closing-date').value = data.closing_date || '';
      document.getElementById('opportunity-description').value = data.description || '';
      document.getElementById('opportunity-requirements').value = normalizeRequirements(data.requirements);
      document.getElementById('opportunity-application-url').value = data.application_url || '';
      document.getElementById('opportunity-submit').textContent = 'Save Listing Changes';
      document.getElementById('opportunity-submit').dataset.originalText = 'Save Listing Changes';
      document.getElementById('cancel-opportunity-edit').hidden = false;
      activatePanel('post-opportunity-section');
      document.getElementById('opportunity-title').focus();
    } catch (error) {
      logProviderError('load listing for editing', error);
      showToast('This listing could not be opened for editing. Please try again.', 'error');
    } finally {
      document.getElementById('opportunity-submit').disabled = currentProfile.is_verified !== true;
    }
  }

  function getOpportunityPayload() {
    const applicationUrl = new URL(document.getElementById('opportunity-application-url').value.trim());
    if (applicationUrl.protocol !== 'https:') {
      throw new Error('Enter a secure HTTPS application link.');
    }
    const closingDate = document.getElementById('opportunity-closing-date').value;
    if (!closingDate || closingDate <= localDateString()) {
      throw new Error('Choose a closing date later than today.');
    }

    const requirements = document.getElementById('opportunity-requirements').value
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
    if (!requirements.length) throw new Error('Add at least one requirement.');

    return {
      title: document.getElementById('opportunity-title').value.trim(),
      organization_name: currentProfile.organization_name,
      category: document.getElementById('opportunity-category').value,
      location: document.getElementById('opportunity-location').value.trim(),
      closing_date: closingDate,
      description: document.getElementById('opportunity-description').value.trim(),
      requirements,
      application_url: applicationUrl.href
    };
  }

  async function saveOpportunity(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (currentProfile.is_verified !== true) {
      showToast('Opportunity posting is locked until your provider account is verified.', 'error');
      return;
    }

    const submitButton = document.getElementById('opportunity-submit');
    setBusy(submitButton, true, 'Saving…');
    try {
      const payload = getOpportunityPayload();
      const editingId = document.getElementById('editing-opportunity-id').value;
      if (window.PORTAL_DEMO_MODE) {
        const listings = localDemoListings();
        const updatedListings = editingId
          ? listings.map(listing => String(listing.id) === editingId
            ? { ...listing, ...payload, updated_at: new Date().toISOString() }
            : listing)
          : [...listings, {
            ...payload,
            id: window.crypto?.randomUUID?.() || `demo-listing-${Date.now()}`,
            owner_id: currentUser.id,
            is_published: true,
            created_at: new Date().toISOString()
          }];
        saveLocalDemoListings(updatedListings);
      } else {
        const result = editingId
          ? await client.from('opportunities').update(payload).eq('id', editingId).eq('owner_id', currentUser.id).select('id').single()
          : await client.from('opportunities').insert({
            ...payload,
            owner_id: currentUser.id,
            is_published: true,
            created_at: new Date().toISOString()
          }).select('id').single();
        if (result.error) throw result.error;
      }

      showInlineFeedback(
        'opportunity-form-feedback',
        editingId ? 'Listing changes saved.' : 'Opportunity posted successfully and published to live feed!',
        'success'
      );
      showToast(editingId ? 'Listing changes saved successfully.' : 'Opportunity posted successfully and published to live feed!');
      resetOpportunityForm();
      await Promise.all([fetchListings(), fetchMetrics()]);
      activatePanel('manage-listings-section');
    } catch (error) {
      logProviderError('save opportunity', error);
      const message = error instanceof TypeError
        ? 'Database connection failed. Please check your inputs and try again.'
        : error.message || 'The opportunity could not be saved. Check your inputs and try again.';
      showInlineFeedback('opportunity-form-feedback', message, 'danger');
      showToast(message, 'error');
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function confirmDeleteListing() {
    const listingId = opportunityToDelete;
    const confirmButton = document.getElementById('confirm-delete-listing');
    if (!listingId) return;

    setBusy(confirmButton, true, 'Deleting…');
    try {
      if (window.PORTAL_DEMO_MODE) {
        saveLocalDemoListings(localDemoListings().filter(listing =>
          String(listing.id) !== String(listingId)
        ));
      } else {
        const { error } = await client
          .from('opportunities')
          .delete()
          .eq('id', listingId)
          .eq('owner_id', currentUser.id);
        if (error) throw error;
      }
      deleteDialog.close();
      opportunityToDelete = null;
      showInlineFeedback('listings-feedback', 'Listing deleted successfully.', 'success');
      showToast('Listing deleted successfully.');
      await Promise.all([fetchListings(), fetchMetrics()]);
    } catch (error) {
      logProviderError('delete opportunity', error);
      showToast(error instanceof TypeError
        ? 'Database connection failed. Please try again.'
        : error.message || 'The listing could not be deleted. Please try again.', 'error');
    } finally {
      setBusy(confirmButton, false);
    }
  }

  async function fetchProviderProfile() {
    showInlineFeedback('provider-profile-feedback', 'Loading funding and business profile…');
    try {
      if (window.PORTAL_DEMO_MODE) {
        const profiles = readLocalDemoData('portal_demo_provider_profiles', {});
        const data = profiles[currentUser.id];
        if (data) {
          document.getElementById('sponsorship-budget').value = data.sponsorship_budget ?? '';
          document.getElementById('available-slots').value = data.available_slots ?? '';
          document.getElementById('funding-criteria').value = data.funding_criteria || '';
          document.getElementById('eligibility-rules').value = data.eligibility_rules || '';
          document.getElementById('business-bio').value = data.business_bio || '';
        }
        showInlineFeedback('provider-profile-feedback', '');
        return;
      }
      const { data, error } = await client
        .from('provider_business_profiles')
        .select('sponsorship_budget, available_slots, funding_criteria, eligibility_rules, business_bio')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        document.getElementById('sponsorship-budget').value = data.sponsorship_budget ?? '';
        document.getElementById('available-slots').value = data.available_slots ?? '';
        document.getElementById('funding-criteria').value = data.funding_criteria || '';
        document.getElementById('eligibility-rules').value = data.eligibility_rules || '';
        document.getElementById('business-bio').value = data.business_bio || '';
      }
      showInlineFeedback('provider-profile-feedback', '');
    } catch (error) {
      logProviderError('load provider funding and business profile', error);
      showInlineFeedback('provider-profile-feedback', 'Funding and business profile data could not be loaded.', 'danger');
      showToast('Your business profile could not be loaded. Please refresh and try again.', 'error');
    } finally {
      document.getElementById('provider-profile-submit').disabled = false;
    }
  }

  async function saveProviderProfile(event) {
    event.preventDefault();
    const submitButton = document.getElementById('provider-profile-submit');
    setBusy(submitButton, true, 'Saving…');
    try {
      const budgetInput = document.getElementById('sponsorship-budget').value;
      const slotsInput = document.getElementById('available-slots').value;
      const budget = budgetInput === '' ? null : Number(budgetInput);
      const slots = slotsInput === '' ? null : Number(slotsInput);
      if ((budget !== null && (!Number.isFinite(budget) || budget < 0)) ||
        (slots !== null && (!Number.isInteger(slots) || slots < 0))) {
        throw new Error('Enter a valid non-negative budget and whole-number slot count.');
      }

      const profileData = {
          user_id: currentUser.id,
          sponsorship_budget: budget,
          available_slots: slots,
          funding_criteria: document.getElementById('funding-criteria').value.trim(),
          eligibility_rules: document.getElementById('eligibility-rules').value.trim(),
          business_bio: document.getElementById('business-bio').value.trim(),
          updated_at: new Date().toISOString()
      };
      if (window.PORTAL_DEMO_MODE) {
        const profiles = readLocalDemoData('portal_demo_provider_profiles', {});
        profiles[currentUser.id] = profileData;
        writeLocalDemoData('portal_demo_provider_profiles', profiles);
      } else {
        const { error } = await client
          .from('provider_business_profiles')
          .upsert(profileData, { onConflict: 'user_id' });
        if (error) throw error;
      }
      showInlineFeedback('provider-profile-feedback', 'Funding and business profile saved successfully.', 'success');
      showToast('Funding and business profile saved successfully.');
    } catch (error) {
      logProviderError('save provider funding and business profile', error);
      const message = error.message || 'Your funding and business profile could not be saved. Please try again.';
      showInlineFeedback('provider-profile-feedback', message, 'danger');
      showToast(message, 'error');
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function logout() {
    const button = document.getElementById('provider-logout');
    setBusy(button, true, 'Signing out…');
    try {
      if (window.PORTAL_DEMO_MODE) {
        localStorage.removeItem('current_user');
        window.portalUser = null;
        window.portalProfile = null;
        window.location.replace('auth.html');
        return;
      }
      if (!client) throw new Error('The Supabase client is unavailable.');
      const { error } = await client.auth.signOut();
      if (error) throw error;
      window.location.replace('auth.html');
    } catch (error) {
      logProviderError('sign out', error);
      showToast('You could not be signed out. Please try again.', 'error');
    } finally {
      if (window.location.pathname.endsWith('provider-dashboard.html')) setBusy(button, false);
    }
  }

  async function authorizeDashboard() {
    if (!window.PORTAL_DEMO_MODE && !client) {
      window.location.replace('auth.html');
      return;
    }

    try {
      let profile;
      if (window.PORTAL_DEMO_MODE) {
        const demoUser = JSON.parse(localStorage.getItem('current_user') || 'null');
        if (!demoUser?.id) {
          window.location.replace('auth.html');
          return;
        }
        currentUser = {
          id: demoUser.id,
          email: demoUser.email,
          user_metadata: { full_name: demoUser.full_name }
        };
        profile = demoUser;
        document.getElementById('provider-demo-notice').hidden = false;
      } else {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        currentUser = data.session?.user || null;
        if (!currentUser) {
          window.location.replace('auth.html');
          return;
        }

        const { data: loadedProfile, error: profileError } = await client
          .from('profiles')
          .select('id, full_name, role, organization_name, is_verified')
          .eq('id', currentUser.id)
          .single();
        if (profileError) throw profileError;
        profile = loadedProfile;
      }
      if (!profile || profile.role !== 'community_provider') {
        window.location.replace('opportunities.html');
        return;
      }

      currentProfile = profile;
      window.portalUser = currentUser;
      window.portalProfile = currentProfile;
      document.getElementById('provider-welcome').textContent =
        `Welcome${profile.full_name ? `, ${profile.full_name}` : ''}. Manage ${profile.organization_name || 'your organization'}’s listings and profile.`;
      document.getElementById('opportunity-organization').value = profile.organization_name || '';
      document.getElementById('opportunity-closing-date').min = localDateString();
      setVerifiedFormState(profile.is_verified === true);
      dashboard.hidden = false;

      await Promise.all([fetchListings(), fetchMetrics(), fetchProviderProfile()]);
    } catch (error) {
      logProviderError('authorize dashboard', error);
      showInlineFeedback('provider-dashboard-error', 'Your dashboard could not be opened. Check your connection and sign in again.', 'danger');
      if (!currentUser) window.location.replace('auth.html');
    } finally {
      document.getElementById('refresh-dashboard').disabled = false;
    }
  }

  navigationButtons.forEach(button => {
    button.addEventListener('click', () => activatePanel(
      button.dataset.dashboardPanel,
      button.dataset.dashboardAnchor
    ));
  });
  document.getElementById('provider-navigation').addEventListener('click', event => {
    if (event.target.closest('button')) {
      document.getElementById('provider-navigation').classList.remove('is-open');
      document.querySelector('.nav-toggle').setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelector('.nav-toggle').addEventListener('click', event => {
    const button = event.currentTarget;
    const isOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(isOpen));
    document.getElementById('provider-navigation').classList.toggle('is-open', isOpen);
  });
  document.getElementById('provider-logout').addEventListener('click', logout);
  document.getElementById('refresh-dashboard').addEventListener('click', async event => {
    setBusy(event.currentTarget, true, 'Refreshing…');
    await Promise.all([fetchListings(), fetchMetrics()]);
    setBusy(event.currentTarget, false);
  });
  form.addEventListener('submit', saveOpportunity);
  profileForm.addEventListener('submit', saveProviderProfile);
  document.getElementById('cancel-opportunity-edit').addEventListener('click', resetOpportunityForm);
  listingsBody.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.editListing) startEditingListing(button.dataset.editListing);
    if (button.dataset.deleteListing) {
      opportunityToDelete = button.dataset.deleteListing;
      if (typeof deleteDialog.showModal === 'function') deleteDialog.showModal();
    }
  });
  document.getElementById('confirm-delete-listing').addEventListener('click', confirmDeleteListing);
  document.getElementById('cancel-delete-listing').addEventListener('click', () => {
    opportunityToDelete = null;
    deleteDialog.close();
  });
  deleteDialog.addEventListener('click', event => {
    if (event.target === deleteDialog) {
      opportunityToDelete = null;
      deleteDialog.close();
    }
  });

  document.addEventListener('DOMContentLoaded', authorizeDashboard, { once: true });
})();
