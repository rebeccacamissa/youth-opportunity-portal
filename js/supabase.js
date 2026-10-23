const SUPABASE_URL = 'https://gznwogkctpxffmfowntp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jD_L6Kc2wWNecORjKzgkbw_-OXRdxO7';
const PORTAL_DEMO_MODE = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
window.PORTAL_API_BASE_URL = window.PORTAL_API_BASE_URL || 'http://localhost:5000/api';
const supabaseClient = PORTAL_DEMO_MODE ? null : (() => {
  if (typeof SUPABASE_URL !== 'string' || !SUPABASE_URL.trim()) {
    console.error('Supabase is not configured: SUPABASE_URL is missing.');
    return null;
  }
  if (typeof SUPABASE_ANON_KEY !== 'string' || !SUPABASE_ANON_KEY.trim()) {
    console.error('Supabase is not configured: SUPABASE_ANON_KEY is missing.');
    return null;
  }
  try {
    const url = new URL(SUPABASE_URL);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) {
      throw new Error('SUPABASE_URL must be a valid HTTP or HTTPS URL.');
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('The Supabase JavaScript library did not load.');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Supabase could not be initialized:', error);
    return null;
  }
})();

window.supabaseClient = supabaseClient;
window.PORTAL_DEMO_MODE = PORTAL_DEMO_MODE;
window.portalUser = null;
window.portalProfile = null;

let resolvePortalAuthReady;
window.portalAuthReady = new Promise(resolve => {
  resolvePortalAuthReady = resolve;
});
window.setTimeout(resolvePortalAuthReady, 4000);

function getAuthFeedback() {
  return document.getElementById('auth-feedback');
}

function showAuthFeedback(message, type = '') {
  const element = getAuthFeedback();
  if (!element) return;
  element.className = `auth-feedback${type ? ` ${type}` : ''}`;
  element.textContent = message;
}

function getUserFacingError(error, fallback) {
  const message = error?.message || '';
  return /failed to fetch|network|cors|load failed/i.test(message)
    ? fallback
    : message || fallback;
}

function safeAuthRedirect(role) {
  if (role === 'community_provider') return 'provider-dashboard.html';
  if (role === 'youth_user') return 'opportunities.html';

  const next = new URLSearchParams(window.location.search).get('next');
  const allowed = new Set(['index.html', 'opportunities.html', 'resources.html', 'contact.html', 'admin-post.html', 'provider-dashboard.html']);
  if (next && allowed.has(next)) {
    if (next !== 'admin-post.html') return next;
  }
  return role === 'high_school_student' ? 'opportunities.html' : 'index.html';
}

function readDemoUsers() {
  try {
    const users = JSON.parse(localStorage.getItem('portal_users') || '[]');
    if (!Array.isArray(users)) throw new Error('Saved demo accounts have an invalid format.');
    const sanitizedUsers = users.map(user => ({
      id: String(user.id || ''),
      email: String(user.email || ''),
      full_name: String(user.full_name || ''),
      role: String(user.role || ''),
      organization_name: user.organization_name || null,
      is_verified: user.is_verified === true,
      profile_details: user.profile_details && typeof user.profile_details === 'object'
        ? user.profile_details
        : {}
    }));
    localStorage.setItem('portal_users', JSON.stringify(sanitizedUsers));
    return sanitizedUsers;
  } catch (error) {
    console.error('Local demo accounts could not be loaded:', error);
    throw new Error('Local demo accounts could not be loaded. Clear the portal demo storage and try again.');
  }
}

function saveDemoSession(user) {
  const demoUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name || '',
    role: user.role,
    organization_name: user.organization_name || null,
    is_verified: user.is_verified === true,
    profile_details: user.profile_details || {}
  };
  try {
    localStorage.setItem('current_user', JSON.stringify(demoUser));
  } catch (error) {
    console.error('Local demo session could not be saved:', error);
    throw new Error('Your demo session could not be saved in this browser.');
  }
  return demoUser;
}

function renderAuthNavigation(user, profile) {
  const list = document.querySelector('#portal-navigation ul');
  if (!list) return;

  list.querySelectorAll('[data-provider-management]').forEach(item => {
    item.hidden = !user || profile?.role !== 'community_provider';
  });
  list.querySelectorAll('[data-auth-nav]').forEach(item => item.remove());
  const addItem = content => {
    const item = document.createElement('li');
    item.dataset.authNav = 'true';
    item.append(content);
    list.append(item);
  };

  if (!user) {
    const login = document.createElement('a');
    login.href = 'auth.html?mode=signin';
    login.className = 'nav-auth-link';
    login.textContent = 'Log In';
    addItem(login);

    const register = document.createElement('a');
    register.href = 'auth.html?mode=signup';
    register.className = 'nav-auth-link nav-register-link';
    register.textContent = 'Register';
    addItem(register);
    return;
  }

  const identity = document.createElement('span');
  identity.className = 'nav-profile-badge';
  const name = document.createElement('strong');
  name.textContent = profile?.full_name || user.user_metadata?.full_name || user.email || 'Account';
  const role = document.createElement('small');
  role.textContent = profile?.role === 'community_provider'
    ? 'Community Provider'
    : profile?.role === 'youth_user'
      ? 'Youth Job Seeker'
      : profile?.role === 'high_school_student'
        ? 'High School Student / Matriculant'
      : 'Profile unavailable';
  identity.append(name, role);
  addItem(identity);

  if (profile?.role === 'community_provider') {
    const postLink = document.createElement('a');
    postLink.href = 'provider-dashboard.html';
    postLink.className = 'nav-auth-link nav-provider-link btn btn-primary';
    postLink.textContent = profile.is_verified === true ? 'Provider Dashboard' : 'Provider Dashboard (Pending)';
    addItem(postLink);
  }

  document.querySelectorAll('#saved-only, .saved-filter-label, [data-youth-only]').forEach(element => {
    element.hidden = profile?.role === 'community_provider';
  });

  const signOut = document.createElement('button');
  signOut.type = 'button';
  signOut.className = 'nav-auth-link nav-signout-button';
  signOut.dataset.signOut = 'true';
  signOut.textContent = 'Sign Out';
  addItem(signOut);

  const feedback = document.createElement('span');
  feedback.id = 'auth-nav-feedback';
  feedback.className = 'auth-nav-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  addItem(feedback);
}

async function refreshPortalAuth(user) {
  window.portalUser = user || null;
  window.portalProfile = null;
  let profileLoadFailed = false;
  let guestBookmarksSyncFailed = false;

  if (user && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email, role, organization_name, is_verified')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      window.portalProfile = data;
    } catch (error) {
      profileLoadFailed = true;
      console.error('Unable to load account profile:', error);
    }

    if (window.portalProfile?.role === 'youth_user') {
      guestBookmarksSyncFailed = !await syncGuestSavedOpportunities(user.id);
    }
  }

  renderAuthNavigation(window.portalUser, window.portalProfile);
  if (profileLoadFailed || guestBookmarksSyncFailed) {
    const feedback = document.getElementById('auth-nav-feedback');
    if (feedback) {
      feedback.textContent = profileLoadFailed
        ? 'Your account profile could not be loaded. Check your connection and try again.'
        : 'Some guest bookmarks could not be synced. They remain saved on this device; try again when connected.';
    }
  }
  updateProviderPostingAccess();
  document.dispatchEvent(new CustomEvent('portal-auth-state-change', {
    detail: { user: window.portalUser, profile: window.portalProfile }
  }));
}

function updateProviderPostingAccess() {
  const section = document.getElementById('admin-post-section');
  if (!section) return;

  const message = document.getElementById('provider-access-message');
  const verificationAlert = document.getElementById('provider-verification-alert');
  const form = document.getElementById('opportunity-post-form');
  const profile = window.portalProfile;
  const setFormDisabled = disabled => {
    if (form) form.querySelectorAll('input, select, textarea, button').forEach(control => {
      control.disabled = disabled;
    });
  };
  if (!window.portalUser) {
    if (message) {
      message.className = 'auth-feedback text-danger';
      message.innerHTML = 'Sign in with a verified provider account to post opportunities. <a href="auth.html?mode=signin&next=admin-post.html">Sign in</a>';
    }
    if (verificationAlert) verificationAlert.hidden = true;
    setFormDisabled(true);
    section.hidden = true;
    return;
  }

  if (profile?.role !== 'community_provider') {
    if (message) {
      message.className = 'auth-feedback text-danger';
      message.textContent = 'This page is available to community opportunity providers. Sign in with a provider account to continue.';
    }
    if (verificationAlert) verificationAlert.hidden = true;
    setFormDisabled(true);
    section.hidden = true;
    return;
  }

  const isVerified = profile.is_verified === true;
  if (!isVerified) {
    if (message) {
      message.className = 'auth-feedback';
      message.textContent = '';
    }
    if (verificationAlert) {
      verificationAlert.textContent = 'Your provider account is pending administrative verification';
      verificationAlert.hidden = false;
    }
    const organization = document.getElementById('provider-organization');
    if (organization) organization.textContent = profile.organization_name || '';
    setFormDisabled(true);
    section.hidden = false;
    return;
  }

  if (verificationAlert) verificationAlert.hidden = true;
  if (message) {
    message.className = 'auth-feedback text-success';
    message.textContent = 'Your provider account is verified. You can publish opportunities for your organization.';
  }
  const organization = document.getElementById('provider-organization');
  if (organization) organization.textContent = profile.organization_name || '';
  setFormDisabled(false);
  section.hidden = false;
}

function initAuthState() {
  if (PORTAL_DEMO_MODE) {
    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || 'null');
      if (storedUser && typeof storedUser.id === 'string' && typeof storedUser.role === 'string') {
        window.portalUser = {
          id: storedUser.id,
          email: storedUser.email,
          user_metadata: { full_name: storedUser.full_name }
        };
        window.portalProfile = storedUser;
      }
    } catch (error) {
      console.error('Local demo session could not be loaded:', error);
      localStorage.removeItem('current_user');
    }
    renderAuthNavigation(window.portalUser, window.portalProfile);
    updateProviderPostingAccess();
    document.dispatchEvent(new CustomEvent('portal-auth-state-change', {
      detail: { user: window.portalUser, profile: window.portalProfile, demo: true }
    }));
    resolvePortalAuthReady();
    return;
  }

  if (!supabaseClient) {
    renderAuthNavigation(null, null);
    resolvePortalAuthReady();
    return;
  }

  try {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(async () => {
        try {
          await refreshPortalAuth(session?.user || null);
        } catch (error) {
          console.error('Unable to refresh portal authentication state:', error);
        } finally {
          resolvePortalAuthReady();
        }
      }, 0);
    });
  } catch (error) {
    console.error('Unable to subscribe to portal authentication changes:', error);
    renderAuthNavigation(null, null);
    resolvePortalAuthReady();
  }
}

function setAuthTab(mode, moveFocus = false) {
  const isSignup = mode === 'signup';
  const signinTab = document.getElementById('signin-tab');
  const signupTab = document.getElementById('signup-tab');
  const signinPanel = document.getElementById('signin-panel');
  const signupPanel = document.getElementById('signup-panel');
  if (!signinTab || !signupTab || !signinPanel || !signupPanel) return;

  signinTab.classList.toggle('is-active', !isSignup);
  signupTab.classList.toggle('is-active', isSignup);
  signinTab.setAttribute('aria-selected', String(!isSignup));
  signupTab.setAttribute('aria-selected', String(isSignup));
  signinPanel.hidden = isSignup;
  signupPanel.hidden = !isSignup;
  if (moveFocus) (isSignup ? signupTab : signinTab).focus();
  showAuthFeedback('');
}

function initAuthForms() {
  const signinForm = document.getElementById('signin-form');
  const signupStepOne = document.getElementById('signup-step-1-form');
  const signupStepTwo = document.getElementById('signup-step-2-form');
  if (!signinForm || !signupStepOne || !signupStepTwo) return;

  document.querySelectorAll('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => setAuthTab(tab.dataset.authTab));
  });

  const roleSelect = document.getElementById('signup-role');
  const stepLabel = document.getElementById('signup-step-label');
  const progress = document.querySelector('.auth-step-progress-track');
  const progressFill = document.getElementById('signup-step-progress');
  const roleSections = [...signupStepTwo.querySelectorAll('[data-role-fields]')];
  const setRoleFields = () => {
    roleSections.forEach(section => {
      const active = section.dataset.roleFields === roleSelect.value;
      section.hidden = !active;
      section.querySelectorAll('input, select, textarea').forEach(control => {
        control.disabled = !active;
      });
    });
  };
  const setSignupStep = step => {
    const showDetails = step === 2;
    signupStepOne.hidden = showDetails;
    signupStepTwo.hidden = !showDetails;
    stepLabel.textContent = showDetails
      ? 'Step 2 of 2: Profile Details'
      : 'Step 1 of 2: Core Credentials';
    progress.setAttribute('aria-valuenow', String(step));
    progressFill.style.width = showDetails ? '100%' : '50%';
    if (showDetails) {
      setRoleFields();
      signupStepTwo.querySelector('[data-role-fields]:not([hidden]) input:not(:disabled), [data-role-fields]:not([hidden]) select:not(:disabled), [data-role-fields]:not([hidden]) textarea:not(:disabled)')?.focus();
    } else {
      document.getElementById('signup-full-name').focus();
    }
    showAuthFeedback('');
  };
  roleSelect.addEventListener('change', setRoleFields);
  setRoleFields();

  document.getElementById('signup-next-step').addEventListener('click', () => {
    if (!signupStepOne.reportValidity()) return;
    setSignupStep(2);
  });
  document.getElementById('signup-back-step').addEventListener('click', () => setSignupStep(1));

  signupStepTwo.querySelectorAll('[data-required-choices]').forEach(group => {
    group.addEventListener('change', () => {
      group.classList.remove('has-choice-error');
      const activeSection = group.closest('[data-role-fields]');
      activeSection.querySelectorAll('[data-required-choices] input').forEach(input => {
        input.setCustomValidity('');
      });
    });
  });

  const getStepTwoData = () => {
    const fields = new FormData(signupStepTwo);
    const details = Object.fromEntries(fields.entries());
    if (roleSelect.value === 'high_school_student') {
      details.interests = fields.getAll('interests');
    } else if (roleSelect.value === 'community_provider') {
      details.focus_areas = fields.getAll('focus_areas');
    }
    return details;
  };

  const validateStepTwo = () => {
    if (!signupStepTwo.reportValidity()) return false;
    const activeSection = roleSections.find(item => item.dataset.roleFields === roleSelect.value);
    const emptyChoiceGroup = [...activeSection.querySelectorAll('[data-required-choices]')]
      .find(group => !group.querySelector('input:checked'));
    if (emptyChoiceGroup) {
      emptyChoiceGroup.classList.add('has-choice-error');
      showAuthFeedback('Select at least one option to continue.', 'text-danger');
      emptyChoiceGroup.querySelector('input')?.focus();
      return false;
    }
    return true;
  };

  const showSignupSuccess = (message) => {
    const dialog = document.getElementById('signup-success-dialog');
    document.getElementById('signup-success-message').textContent = message;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else showAuthFeedback(message, 'text-success');
  };
  document.getElementById('signup-success-close').addEventListener('click', () => {
    document.getElementById('signup-success-dialog').close();
  });

  const mode = new URLSearchParams(window.location.search).get('mode');
  setAuthTab(mode === 'signup' ? 'signup' : 'signin');
  const demoNotice = document.getElementById('local-demo-notice');
  if (demoNotice) demoNotice.hidden = !PORTAL_DEMO_MODE;
  const signinPassword = document.getElementById('signin-password');
  const signupPassword = document.getElementById('signup-password');
  if (PORTAL_DEMO_MODE && signinPassword) {
    signinPassword.required = false;
    signinPassword.autocomplete = 'off';
  }
  if (PORTAL_DEMO_MODE && signupPassword) {
    signupPassword.required = false;
    signupPassword.autocomplete = 'off';
  }

  signinForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) {
      showAuthFeedback('The sign-in service is unavailable. Please try again later.', 'text-danger');
      return;
    }

    const button = signinForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Signing in…';
    showAuthFeedback('Signing in…');

    try {
      const formData = new FormData(signinForm);
      const email = String(formData.get('email')).trim().toLowerCase();
      if (PORTAL_DEMO_MODE) {
        const account = readDemoUsers().find(user =>
          String(user.email || '').trim().toLowerCase() === email
        );
        if (!account) throw new Error('No local demo account was found for that email. Register an account on this device first.');
        const currentUser = saveDemoSession(account);
        showAuthFeedback('Demo sign-in successful. Redirecting…', 'text-success');
        window.location.replace(safeAuthRedirect(currentUser.role));
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: String(formData.get('password'))
      });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, is_verified, organization_name')
        .eq('id', data.user.id)
        .single();
      if (profileError) throw profileError;
      if (!profile) throw new Error('Your account profile could not be found.');

      const isPendingProvider = profile.role === 'community_provider' && profile.is_verified !== true;
      showAuthFeedback(
        isPendingProvider
          ? 'Signed in. Your account is pending administrative verification.'
          : 'Signed in successfully. Redirecting…',
        'text-success'
      );
      window.location.replace(safeAuthRedirect(profile.role));
    } catch (error) {
      console.error('Sign in failed:', error);
      showAuthFeedback(getUserFacingError(error, 'Unable to sign in. Check your details and connection, then try again.'), 'text-danger');
    } finally {
      button.disabled = false;
      button.textContent = 'Sign In';
    }
  });

  signupStepTwo.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateStepTwo()) return;
    if (!supabaseClient) {
      showAuthFeedback('The registration service is unavailable. Please try again later.', 'text-danger');
      return;
    }

    const button = document.getElementById('signup-submit');
    button.disabled = true;
    button.textContent = 'Creating account...';
    showAuthFeedback('Creating your account...');

    try {
      const fullName = document.getElementById('signup-full-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const role = roleSelect.value;
      if (!['high_school_student', 'youth_user', 'community_provider'].includes(role)) {
        throw new Error('Choose a valid account type.');
      }
      const profileDetails = getStepTwoData();
      const organizationName = role === 'community_provider'
        ? String(profileDetails.organization_name || '').trim()
        : null;
      if (role === 'community_provider' && !organizationName) {
        throw new Error('Enter your organization name to register as a community provider.');
      }
      if (role === 'community_provider') profileDetails.organization_name = organizationName;
      if (PORTAL_DEMO_MODE) {
        const users = readDemoUsers();
        if (users.some(user => String(user.email || '').trim().toLowerCase() === email.toLowerCase())) {
          throw new Error('A local demo account already exists for this email.');
        }
        const demoUser = {
          id: window.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          full_name: fullName,
          email,
          role,
          organization_name: organizationName,
          is_verified: true,
          profile_details: profileDetails
        };
        try {
          localStorage.setItem('portal_users', JSON.stringify([...users, demoUser]));
        } catch (error) {
          console.error('Local demo account could not be saved:', error);
          throw new Error('Your demo account could not be saved in this browser.');
        }
        saveDemoSession(demoUser);
        showSignupSuccess('Demo account created on this device. Passwords are not saved or checked in local demo mode.');
        window.setTimeout(() => {
          window.location.replace(safeAuthRedirect(role));
        }, 700);
        return;
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            organization_name: organizationName,
            profile_details: profileDetails
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return the newly registered user.');

      if (data.session) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ profile_details: profileDetails })
          .eq('id', data.user.id);
        if (profileError) throw profileError;
      }
      const confirmationMessage = !data.session
        ? 'Your profile has been saved. Check your email to confirm your address before signing in.'
        : role === 'community_provider'
          ? 'Your provider profile has been saved. An administrator must verify your organization before you can publish opportunities.'
          : 'Your profile has been saved. You can now explore opportunities matched to your interests.';
      showSignupSuccess(confirmationMessage);
    } catch (error) {
      console.error('Account registration failed:', error);
      showAuthFeedback(getUserFacingError(error, 'Unable to create your account. Check your connection and try again.'), 'text-danger');
    } finally {
      button.disabled = false;
      button.textContent = 'Create Account';
    }
  });
}

async function saveOpportunityForCurrentUser(opportunityId, isSaved) {
  if (!supabaseClient || !window.portalUser || !['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
    if (PORTAL_DEMO_MODE && window.portalUser && ['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
      return true;
    }
    throw new Error('Sign in with a youth account to sync saved opportunities.');
  }

  try {
    if (isSaved) {
      const { error } = await supabaseClient
        .from('user_saved_opportunities')
        .upsert({
          user_id: window.portalUser.id,
          opportunity_id: String(opportunityId)
        }, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from('user_saved_opportunities')
        .delete()
        .eq('user_id', window.portalUser.id)
        .eq('opportunity_id', String(opportunityId));
      if (error) throw error;
    }
  } catch (error) {
    console.error('Saved opportunity request failed:', error);
    throw error;
  }
  return true;
}

async function loadSavedOpportunitiesForCurrentUser() {
  if (PORTAL_DEMO_MODE && window.portalUser && ['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
    try {
      return JSON.parse(localStorage.getItem(`youth-portal-saved-opportunities:${window.portalUser.id}`) || '[]').map(String);
    } catch (error) {
      console.error('Local demo saved opportunities could not be loaded:', error);
      throw new Error('Saved opportunities could not be loaded from this browser.');
    }
  }
  if (!supabaseClient || !window.portalUser || !['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
    throw new Error('Sign in with a youth account to load saved opportunities.');
  }
  try {
    const { data, error } = await supabaseClient
      .from('user_saved_opportunities')
      .select('opportunity_id')
      .eq('user_id', window.portalUser.id);
    if (error) throw error;
    return data.map(row => String(row.opportunity_id));
  } catch (error) {
    console.error('Saved opportunities could not be loaded:', error);
    throw error;
  }
}

async function syncGuestSavedOpportunities(userId) {
  if (PORTAL_DEMO_MODE) {
    try {
      const guestIds = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
      if (!Array.isArray(guestIds)) throw new Error('Guest bookmarks have an invalid format.');
      const key = `youth-portal-saved-opportunities:${userId}`;
      const userIds = JSON.parse(localStorage.getItem(key) || '[]');
      const merged = [...new Set([...userIds, ...guestIds].map(String))];
      localStorage.setItem(key, JSON.stringify(merged));
      localStorage.removeItem('guest_bookmarks');
      localStorage.removeItem('youth-portal-saved-opportunities');
      document.dispatchEvent(new CustomEvent('portal-saved-opportunities-synced'));
      return true;
    } catch (error) {
      console.error('Local demo bookmarks could not be synced:', error);
      return false;
    }
  }
  if (!supabaseClient || !userId) return false;

  const guestStorageKey = 'guest_bookmarks';
  const legacyGuestStorageKey = 'youth-portal-saved-opportunities';
  let guestIds;
  try {
    const stored = JSON.parse(
      localStorage.getItem(guestStorageKey) ||
      localStorage.getItem(legacyGuestStorageKey) ||
      '[]'
    );
    guestIds = Array.isArray(stored) ? [...new Set(stored.map(String))] : [];
  } catch (error) {
    console.error('Guest saved opportunities could not be read:', error);
    return false;
  }

  if (!guestIds.length) return true;

  try {
    const { error } = await supabaseClient
      .from('user_saved_opportunities')
      .upsert(
        guestIds.map(opportunityId => ({ user_id: userId, opportunity_id: opportunityId })),
        { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true }
      );
    if (error) throw error;
  } catch (error) {
    console.error('Guest saved opportunities could not be synced:', error);
    return false;
  }

  try {
    localStorage.removeItem(guestStorageKey);
    localStorage.removeItem(legacyGuestStorageKey);
  } catch (storageError) {
    console.error('Synced guest saved opportunities could not be cleared locally:', storageError);
  }
  document.dispatchEvent(new CustomEvent('portal-saved-opportunities-synced'));
  return true;
}

async function handleOpportunityPost(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById('post-feedback');
  const button = form.querySelector('button[type="submit"]');
  const profile = window.portalProfile;

  if (!supabaseClient || !window.portalUser || profile?.role !== 'community_provider' || profile.is_verified !== true) {
    feedback.className = 'auth-feedback text-danger';
    feedback.textContent = 'Only signed-in, verified community providers may publish opportunities.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Publishing…';
  feedback.className = 'auth-feedback';
  feedback.textContent = 'Publishing opportunity…';

  try {
    const requirements = document.getElementById('post-requirements').value
      .split('\n')
      .map(value => value.trim())
      .filter(Boolean);
    const applicationUrl = new URL(document.getElementById('post-apply-url').value.trim());
    if (applicationUrl.protocol !== 'https:') throw new Error('The official application URL must use HTTPS.');

    const { error } = await supabaseClient.from('opportunities').insert({
      owner_id: window.portalUser.id,
      title: document.getElementById('post-title').value.trim(),
      category: document.getElementById('post-category').value,
      closing_date: document.getElementById('post-closing-date').value,
      location: document.getElementById('post-location').value.trim(),
      stipend: document.getElementById('post-stipend').value.trim() || 'Not specified',
      description: document.getElementById('post-description').value.trim(),
      requirements,
      application_url: applicationUrl.href,
      organization_name: profile.organization_name
    });
    if (error) throw error;

    feedback.className = 'auth-feedback text-success';
    feedback.textContent = 'Opportunity published successfully.';
    form.reset();
  } catch (error) {
    console.error('Opportunity publication failed:', error);
    feedback.className = 'auth-feedback text-danger';
    feedback.textContent = getUserFacingError(error, 'Unable to publish this opportunity. Check your connection and try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Publish opportunity';
  }
}

async function handleContactSubmission(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedbackEl = document.getElementById('contact-feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);

  feedbackEl.className = 'mb-3';
  feedbackEl.textContent = '';
  submitButton.disabled = true;
  feedbackEl.textContent = 'Sending your message…';
  try {
    const endpoint = form.dataset.apiEndpoint || '/requests';
    const response = await fetch(`${window.PORTAL_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: String(formData.get('type')).trim(),
        name: String(formData.get('name')).trim(),
        email: String(formData.get('email')).trim(),
        subject: String(formData.get('subject')).trim(),
        listing_url: String(formData.get('listing_url') || '').trim() || null,
        message: String(formData.get('message')).trim()
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'The request could not be submitted.');

    form.reset();
    feedbackEl.className = 'mb-3 text-success';
    feedbackEl.textContent = 'Thanks — your message was submitted successfully.';
  } catch (error) {
    console.error('Contact form submission failed:', error);
    feedbackEl.className = 'mb-3 text-danger';
    feedbackEl.textContent = getUserFacingError(error, 'We could not submit your message. Check your connection and try again.');
  } finally {
    submitButton.disabled = false;
  }
}

document.addEventListener('click', async event => {
  if (!(event.target instanceof Element)) return;
  const signOutButton = event.target.closest('[data-sign-out]');
  if (!signOutButton) return;
  if (!PORTAL_DEMO_MODE && !supabaseClient) {
    console.error('Sign out unavailable: Supabase client is not initialized.');
    return;
  }

  signOutButton.disabled = true;
  try {
    if (PORTAL_DEMO_MODE) {
      localStorage.removeItem('current_user');
      window.location.replace('index.html');
      return;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Sign out failed:', error);
    const feedback = document.getElementById('auth-nav-feedback');
    if (feedback) feedback.textContent = 'Unable to sign out. Please try again.';
  } finally {
    if (document.contains(signOutButton)) signOutButton.disabled = false;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAuthState();
  initAuthForms();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmission);
  const postingForm = document.getElementById('opportunity-post-form');
  if (postingForm) postingForm.addEventListener('submit', handleOpportunityPost);

  const requestedContactType = new URLSearchParams(window.location.search).get('type');
  const contactType = document.getElementById('contact-type');
  if (contactType && ['general', 'report', 'suggest', 'feedback'].includes(requestedContactType)) {
    contactType.value = requestedContactType;
  }
});
