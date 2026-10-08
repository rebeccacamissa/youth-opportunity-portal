// Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://gznwogkctpxffmfowntp.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_jD_L6Kc2wWNecORjKzgkbw_-OXRdxO7';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ==========================================================================
   1. MULTI-STEP USER SIGN-UP & ONBOARDING LOGIC (auth.html)
   ========================================================================== */

let signupDataStep1 = {};

/**
 * Handle Step 1 Form Submission
 */
function handleStep1(event) {
  event.preventDefault();

  signupDataStep1 = {
    fullName: document.getElementById('full-name').value.trim(),
    age: parseInt(document.getElementById('age').value, 10),
    country: document.getElementById('country').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    qualification: document.getElementById('highest-qualification').value,
    interest: document.getElementById('user-interest').value // 'matriculant', 'jobseeker', or 'student'
  };

  // Hide Step 1 Form
  document.getElementById('signup-step-1').style.display = 'none';

  // Show Step 2 Container & Conditional Sub-Section
  document.getElementById('signup-step-2').style.display = 'block';
  document.getElementById('matriculant-fields').style.display = 'none';
  document.getElementById('jobseeker-fields').style.display = 'none';
  document.getElementById('student-fields').style.display = 'none';

  // Conditional Routing based on User Interest
  if (signupDataStep1.interest === 'matriculant') {
    document.getElementById('matriculant-fields').style.display = 'block';
  } else if (signupDataStep1.interest === 'jobseeker') {
    document.getElementById('jobseeker-fields').style.display = 'block';
  } else if (signupDataStep1.interest === 'student') {
    document.getElementById('student-fields').style.display = 'block';
  }
}

/**
 * Handle Step 2 Submission & Supabase Registration
 */
async function handleStep2(event) {
  event.preventDefault();
  const feedbackEl = document.getElementById('auth-feedback');
  feedbackEl.textContent = 'Creating account...';

  const interest = signupDataStep1.interest;
  let profileData = { ...signupDataStep1 };
  delete profileData.password; // Do not store plaintext password in profile table

  // Collect conditional fields
  if (interest === 'matriculant') {
    profileData.reportLink = document.getElementById('report-link').value.trim();
    profileData.skills = document.getElementById('matric-skills').value.split(',').map(s => s.trim());
    profileData.activities = document.getElementById('extracurriculars').value.trim();
  } else if (interest === 'jobseeker') {
    profileData.cvUrl = document.getElementById('jobseeker-cv').value.trim();
    profileData.targetIndustry = document.getElementById('target-industry').value;
    profileData.experienceLevel = document.getElementById('jobseeker-exp').value;
  } else if (interest === 'student') {
    profileData.currentQualification = document.getElementById('current-qualification').value.trim();
    profileData.experience = document.getElementById('student-experience').value.trim();
    profileData.cvUrl = document.getElementById('student-cv').value.trim();
  }

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: signupDataStep1.email,
      password: signupDataStep1.password
    });

    if (authError) throw authError;

    // 2. Insert Extended Profile Data into Supabase 'profiles' table
    if (authData.user) {
      profileData.id = authData.user.id;
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([profileData]);

      if (profileError) throw profileError;

      feedbackEl.className = 'text-success';
      feedbackEl.textContent = 'Account created successfully! Redirecting...';
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }
  } catch (err) {
    feedbackEl.className = 'text-danger';
    feedbackEl.textContent = `Error: ${err.message}`;
  }
}

/* ==========================================================================
   2. ADMIN PARTNER PORTAL LOGIC (admin-post.html)
   ========================================================================== */

/**
 * Admin Sign-Up with Email Domain Check
 */
async function handleAdminSignUp(event) {
  event.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const companyName = document.getElementById('admin-company').value.trim();
  const sector = document.getElementById('admin-sector').value;
  const location = document.getElementById('admin-location').value.trim();
  const website = document.getElementById('admin-website').value.trim();
  const feedbackEl = document.getElementById('admin-auth-feedback');

  // Enforce domain check (Must NOT be standard free domains like gmail, yahoo, outlook)
  const forbiddenDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const emailDomain = email.split('@')[1]?.toLowerCase();

  if (!emailDomain || forbiddenDomains.includes(emailDomain)) {
    feedbackEl.className = 'text-danger';
    feedbackEl.textContent = 'Error: Admin registration requires an official company email address (e.g., @company.com). Free email domains are not allowed.';
    return;
  }

  try {
    feedbackEl.textContent = 'Registering admin partner...';
    
    // Register Admin via Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { role: 'admin', companyName } }
    });

    if (authError) throw authError;

    // Save Admin Organization Profile
    if (authData.user) {
      const { error: orgError } = await supabaseClient.from('organizations').insert([{
        id: authData.user.id,
        companyName,
        sector,
        location,
        email,
        website
      }]);

      if (orgError) throw orgError;

      feedbackEl.className = 'text-success';
      feedbackEl.textContent = 'Admin partner registered! You can now post new opportunities below.';
      document.getElementById('admin-post-section').style.display = 'block';
      document.getElementById('admin-signup-form').style.display = 'none';
    }
  } catch (err) {
    feedbackEl.className = 'text-danger';
    feedbackEl.textContent = `Error: ${err.message}`;
  }
}

/**
 * Insert Opportunity into Supabase Table
 */
async function handlePostOpportunity(event) {
  event.preventDefault();
  const feedbackEl = document.getElementById('post-feedback');

  const newOpportunity = {
    title: document.getElementById('post-title').value.trim(),
    category: document.getElementById('post-category').value,
    closingDate: document.getElementById('post-closing-date').value,
    organization: document.getElementById('admin-company')?.value || 'Partner Organization',
    location: document.getElementById('post-location').value.trim(),
    stipend: document.getElementById('post-stipend').value.trim(),
    description: document.getElementById('post-description').value.trim(),
    requirements: document.getElementById('post-requirements').value.split('\n').map(r => r.trim()).filter(Boolean),
    applyUrl: document.getElementById('post-apply-url').value.trim()
  };

  try {
    feedbackEl.textContent = 'Publishing listing...';

    const { data, error } = await supabaseClient
      .from('opportunities')
      .insert([newOpportunity]);

    if (error) throw error;

    feedbackEl.className = 'text-success';
    feedbackEl.textContent = 'Opportunity posted successfully!';
    document.getElementById('opportunity-post-form').reset();
  } catch (err) {
    feedbackEl.className = 'text-danger';
    feedbackEl.textContent = `Error posting listing: ${err.message}`;
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

  if (!supabaseClient) {
    feedbackEl.classList.add('text-danger');
    feedbackEl.textContent = 'The contact service is unavailable. Please try again later.';
    return;
  }

  submitButton.disabled = true;
  feedbackEl.textContent = 'Sending your message...';

  try {
    const { error } = await supabaseClient.from('contact_submissions').insert({
      submission_type: String(formData.get('type')).trim(),
      name: String(formData.get('name')).trim(),
      email: String(formData.get('email')).trim(),
      subject: String(formData.get('subject')).trim(),
      listing_url: String(formData.get('listing_url') || '').trim() || null,
      message: String(formData.get('message')).trim()
    });

    if (error) throw error;

    form.reset();
    feedbackEl.className = 'mb-3 text-success';
    feedbackEl.textContent = 'Thanks — your message was submitted successfully.';
  } catch (error) {
    console.error('Contact form submission failed:', error);
    feedbackEl.className = 'mb-3 text-danger';
    feedbackEl.textContent = 'We could not submit your message. Please try again later.';
  } finally {
    submitButton.disabled = false;
  }
}

// Attach event listeners when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const step1Form = document.getElementById('signup-step-1-form');
  const step2Form = document.getElementById('signup-step-2-form');
  const adminSignupForm = document.getElementById('admin-signup-form');
  const postForm = document.getElementById('opportunity-post-form');
  const contactForm = document.getElementById('contact-form');
  const contactType = document.getElementById('contact-type');

  if (step1Form) step1Form.addEventListener('submit', handleStep1);
  if (step2Form) step2Form.addEventListener('submit', handleStep2);
  if (adminSignupForm) adminSignupForm.addEventListener('submit', handleAdminSignUp);
  if (postForm) postForm.addEventListener('submit', handlePostOpportunity);
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmission);

  const requestedContactType = new URLSearchParams(window.location.search).get('type');
  if (contactType && ['general', 'report', 'suggest', 'feedback'].includes(requestedContactType)) {
    contactType.value = requestedContactType;
  }
});