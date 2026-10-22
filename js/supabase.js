const SUPABASE_URL = 'https://gznwogkctpxffmfowntp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jD_L6Kc2wWNecORjKzgkbw_-OXRdxO7';
window.PORTAL_API_BASE_URL = window.PORTAL_API_BASE_URL || 'http://localhost:5000/api';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

window.supabaseClient = supabaseClient;
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

function safeAuthRedirect(role, verified) {
  const next = new URLSearchParams(window.location.search).get('next');
  const allowed = new Set(['index.html', 'opportunities.html', 'resources.html', 'contact.html', 'admin-post.html']);
  if (next && allowed.has(next)) {
    if (next !== 'admin-post.html' || (role === 'community_provider' && verified)) return next;
  }
  return role === 'community_provider' && verified ? 'admin-post.html' : 'index.html';
}

function renderAuthNavigation(user, profile) {
  const list = document.querySelector('#portal-navigation ul');
  if (!list) return;

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

  if (profile?.role === 'community_provider' && profile.is_verified) {
    const postLink = document.createElement('a');
    postLink.href = 'admin-post.html';
    postLink.className = 'nav-auth-link nav-provider-link';
    postLink.textContent = 'Post New Opportunity';
    addItem(postLink);
  } else if (profile?.role === 'community_provider') {
    const pending = document.createElement('span');
    pending.className = 'nav-provider-pending';
    pending.textContent = 'Verification pending';
    addItem(pending);
  }

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

  if (user && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email, role, organization_name, is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Unable to load account profile:', error);
    } else {
      window.portalProfile = data;
    }
  }

  renderAuthNavigation(window.portalUser, window.portalProfile);
  updateProviderPostingAccess();
  document.dispatchEvent(new CustomEvent('portal-auth-state-change', {
    detail: { user: window.portalUser, profile: window.portalProfile }
  }));
}

function updateProviderPostingAccess() {
  const section = document.getElementById('admin-post-section');
  if (!section) return;

  const message = document.getElementById('provider-access-message');
  const profile = window.portalProfile;
  if (!window.portalUser) {
    if (message) {
      message.className = 'auth-feedback text-danger';
      message.innerHTML = 'Sign in with a verified provider account to post opportunities. <a href="auth.html?mode=signin&next=admin-post.html">Sign in</a>';
    }
    section.hidden = true;
    return;
  }

  if (profile?.role !== 'community_provider') {
    if (message) {
      message.className = 'auth-feedback text-danger';
      message.textContent = 'This page is available to community opportunity providers. Sign in with a provider account to continue.';
    }
    section.hidden = true;
    return;
  }

  if (!profile.is_verified) {
    if (message) {
      message.className = 'auth-feedback';
      message.textContent = 'Your provider account is awaiting verification. You will be able to post after an administrator verifies your organization.';
    }
    section.hidden = true;
    return;
  }

  if (message) {
    message.className = 'auth-feedback text-success';
    message.textContent = 'Your provider account is verified. You can publish opportunities for your organization.';
  }
  const organization = document.getElementById('provider-organization');
  if (organization) organization.textContent = profile.organization_name || '';
  section.hidden = false;
}

function initAuthState() {
  if (!supabaseClient) {
    renderAuthNavigation(null, null);
    resolvePortalAuthReady();
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(async () => {
      await refreshPortalAuth(session?.user || null);
      resolvePortalAuthReady();
    }, 0);
  });
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
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: String(formData.get('email')).trim(),
        password: String(formData.get('password'))
      });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, is_verified')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (profile?.role === 'community_provider' && !profile.is_verified) {
        showAuthFeedback('Signed in. Your provider account is awaiting verification before you can post.', 'text-success');
        window.setTimeout(() => { window.location.href = 'index.html'; }, 1400);
      } else {
        showAuthFeedback('Signed in successfully. Redirecting…', 'text-success');
        window.setTimeout(() => {
          window.location.href = safeAuthRedirect(profile?.role, profile?.is_verified);
        }, 700);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      showAuthFeedback(error.message || 'Unable to sign in. Check your details and try again.', 'text-danger');
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
      const organizationName = role === 'community_provider' ? profileDetails.organization_name : null;
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
      showAuthFeedback(error.message || 'Unable to create your account. Please try again.', 'text-danger');
    } finally {
      button.disabled = false;
      button.textContent = 'Create Account';
    }
  });
}

async function saveOpportunityForCurrentUser(opportunityId, isSaved) {
  if (!supabaseClient || !window.portalUser || !['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
    throw new Error('Sign in with a youth account to sync saved opportunities.');
  }

  if (isSaved) {
    const { error } = await supabaseClient
      .from('user_saved_opportunities')
      .upsert({
        user_id: window.portalUser.id,
        opportunity_id: String(opportunityId)
      }, { onConflict: 'user_id,opportunity_id' });
    if (error) throw error;
  } else {
    const { error } = await supabaseClient
      .from('user_saved_opportunities')
      .delete()
      .eq('user_id', window.portalUser.id)
      .eq('opportunity_id', String(opportunityId));
    if (error) throw error;
  }
  return true;
}

async function loadSavedOpportunitiesForCurrentUser() {
  if (!supabaseClient || !window.portalUser || !['high_school_student', 'youth_user'].includes(window.portalProfile?.role)) {
    throw new Error('Sign in with a youth account to load saved opportunities.');
  }
  const { data, error } = await supabaseClient
    .from('user_saved_opportunities')
    .select('opportunity_id')
    .eq('user_id', window.portalUser.id);
  if (error) throw error;
  return data.map(row => String(row.opportunity_id));
}

async function handleOpportunityPost(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById('post-feedback');
  const button = form.querySelector('button[type="submit"]');
  const profile = window.portalProfile;

  if (!supabaseClient || !window.portalUser || profile?.role !== 'community_provider' || !profile.is_verified) {
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
    feedback.textContent = error.message || 'Unable to publish this opportunity. Please try again.';
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
    feedbackEl.textContent = error.message || 'We could not submit your message. Please try again later.';
  } finally {
    submitButton.disabled = false;
  }
}

document.addEventListener('click', async event => {
  if (!(event.target instanceof Element)) return;
  const signOutButton = event.target.closest('[data-sign-out]');
  if (!signOutButton) return;
  if (!supabaseClient) {
    console.error('Sign out unavailable: Supabase client is not initialized.');
    return;
  }

  signOutButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Sign out failed:', error);
    signOutButton.disabled = false;
    const feedback = document.getElementById('auth-nav-feedback');
    if (feedback) feedback.textContent = 'Unable to sign out. Please try again.';
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
