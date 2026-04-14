// Tax Peace Now Chatbot - Conditional wizard with branching logic
const QUESTIONS = {
  // Step 1: Main tax problem identifier
  tax_problem: {
    id: 'tax_problem',
    type: 'pills',
    title: 'What best describes your current tax situation?',
    sub: 'Select the option that fits best.',
    options: [
      'I owe money to the IRS or state',
      'I have unfiled tax returns',
      'I received a notice from the IRS or am being audited',
      'I need help filing or organizing my taxes',
      'I\'m not sure — I just know I need help'
    ],
    required: true
  },

  // === Back Taxes Branch ===
  back_taxes_amount: {
    id: 'back_taxes_amount',
    type: 'select',
    title: 'Approximately how much do you owe?',
    sub: 'Select your best estimate.',
    options: ['$0 - $10,000', '$10,001 - $20,000', '$20,001 - $30,000', '$30,001 - $40,000', '$40,001 - $50,000', '$50,000 - $75,000', '$75,000 - $100,000', '$100,001 - $199,999', '$200,000 - $300,000', '$300,000 - $400,000', '$400,000 - $500,000'],
    required: true
  },
  back_taxes_actions: {
    id: 'back_taxes_actions',
    type: 'multi',
    title: 'Have you received any of the following?',
    sub: 'Select all that apply.',
    options: ['Wage garnishment or bank levy', 'Tax lien', 'IRS notice or letter', 'None yet'],
    required: true
  },
  back_taxes_payment_plan: {
    id: 'back_taxes_payment_plan',
    type: 'pills',
    title: 'Are you currently on a payment plan?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },

  // === Notice/Letter Branch ===
  notice_type: {
    id: 'notice_type',
    type: 'pills',
    title: 'What type of notice did you receive?',
    sub: 'Select the closest match.',
    options: ['Balance due or collections', 'Audit notice', 'CP2000 or other', 'Not sure'],
    required: true
  },
  notice_deadline: {
    id: 'notice_deadline',
    type: 'date',
    title: 'What is the deadline listed on the notice?',
    sub: 'Enter the date if known.',
    required: false
  },
  notice_amount: {
    id: 'notice_amount',
    type: 'pills',
    title: 'Does the notice mention a specific dollar amount owed?',
    sub: '',
    options: ['Yes', 'No', 'Not sure'],
    required: true
  },

  // === Unfiled Returns Branch ===
  unfiled_years: {
    id: 'unfiled_years',
    type: 'pills',
    title: 'How many years are unfiled?',
    sub: '',
    options: ['1 year', '2–3 years', '4–5 years', '6+ years'],
    required: true
  },
  unfiled_refund: {
    id: 'unfiled_refund',
    type: 'pills',
    title: 'Are you expecting a refund for any of those years?',
    sub: '',
    options: ['Yes', 'No', 'Not sure'],
    required: true
  },
  unfiled_self_employed: {
    id: 'unfiled_self_employed',
    type: 'pills',
    title: 'Are you self-employed?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },

  // === This Year's Return Branch ===
  filing_status: {
    id: 'filing_status',
    type: 'pills',
    title: 'Are you filing as:',
    sub: '',
    options: ['Individual', 'Married filing jointly', 'Self-employed', 'Business owner'],
    required: true
  },
  filed_last_year: {
    id: 'filed_last_year',
    type: 'pills',
    title: 'Did you file last year?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },
  expect_owe_refund: {
    id: 'expect_owe_refund',
    type: 'pills',
    title: 'Do you expect to owe or receive a refund?',
    sub: '',
    options: ['Owe', 'Refund', 'Not sure'],
    required: true
  },

  // === Business Taxes Branch ===
  business_structure: {
    id: 'business_structure',
    type: 'pills',
    title: 'What is your business structure?',
    sub: '',
    options: ['Sole Proprietor', 'LLC', 'Corporation', 'Not sure'],
    required: true
  },
  payroll_taxes_behind: {
    id: 'payroll_taxes_behind',
    type: 'pills',
    title: 'Are you behind on payroll taxes?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },
  business_operating: {
    id: 'business_operating',
    type: 'pills',
    title: 'Is the business currently operating?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },

  // === Audit Branch ===
  audit_related: {
    id: 'audit_related',
    type: 'pills',
    title: 'What is the audit related to?',
    sub: '',
    options: ['Individual return', 'Business return', 'Payroll', 'Not sure'],
    required: true
  },
  audit_deadline: {
    id: 'audit_deadline',
    type: 'pills',
    title: 'Do you have a deadline to respond?',
    sub: '',
    options: ['Yes', 'No', 'Not sure'],
    required: true
  },
  audit_responded: {
    id: 'audit_responded',
    type: 'pills',
    title: 'Have you already responded to the auditor/IRS?',
    sub: '',
    options: ['Yes', 'No'],
    required: true
  },

  // === Not Sure Branch ===
  not_sure_clarify: {
    id: 'not_sure_clarify',
    type: 'pills',
    title: 'Which of these sounds closest to your situation?',
    sub: '',
    options: ['I owe money', 'I haven\'t filed or need help filing', 'I got a notice or audit letter', 'I just need to contact the IRS'],
    required: true
  },

  // === Universal Questions ===
  state: {
    id: 'state',
    type: 'select',
    title: 'What state do you live in?',
    sub: '',
    options: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia'],
    required: true
  },
  tax_jurisdiction: {
    id: 'tax_jurisdiction',
    type: 'pills',
    title: 'Is this IRS taxes, state taxes, or both?',
    sub: '',
    options: ['IRS', 'State', 'Both', 'Not sure'],
    required: true
  },
  contact: {
    id: 'contact',
    type: 'contact',
    title: 'Last step! Where can we reach you?',
    sub: 'We\'ll be in touch shortly to discuss your options.',
    required: true
  }
};

// Define the flow paths based on tax_problem answer
const FLOWS = {
  'I owe money to the IRS or state': ['back_taxes_amount', 'back_taxes_actions'],
  'I have unfiled tax returns': ['unfiled_years', 'unfiled_self_employed'],
  'I received a notice from the IRS or am being audited': ['notice_type', 'notice_deadline'],
  'I need help filing or organizing my taxes': ['filing_status', 'expect_owe_refund'],
  'I\'m not sure — I just know I need help': ['not_sure_clarify']
};

const UNIVERSAL_STEPS = ['state', 'contact'];

// DOM elements
const stepLabel = document.getElementById('stepLabel');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const controls = document.getElementById('controls');
const chatMessages = document.getElementById('chatMessages');
const progressBar = document.getElementById('progressBar');

const params = new URLSearchParams(location.search);

// === UTM capture & persistence ===
// Captures UTMs on first touch, persists across the session so they survive
// internal navigation and are attached to the final lead submission.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];
function captureUtms() {
  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem('tpn_utms') || '{}');
  } catch (_) {}

  let updated = false;
  UTM_KEYS.forEach(k => {
    const v = params.get(k);
    if (v && !stored[k]) {
      stored[k] = v;
      updated = true;
    }
  });

  // Landing page + referrer on first touch
  if (!stored.landing_page) {
    stored.landing_page = window.location.pathname;
    stored.referrer = document.referrer || '';
    stored.first_touch_ts = new Date().toISOString();
    updated = true;
  }

  if (updated) {
    try { sessionStorage.setItem('tpn_utms', JSON.stringify(stored)); } catch (_) {}
  }
  return stored;
}
const utmData = captureUtms();

// Meta tracking - capture fbclid and cookies for better attribution
const fbclid = params.get('fbclid') || '';
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : '';
};
const fbc = getCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
const fbp = getCookie('_fbp') || '';

// GA4 client_id — extracted from the _ga cookie (format: GA1.1.<client_id>.<ts>)
// Used server-side so the MP event attributes to the same user as the browser.
function getGaClientId() {
  const ga = getCookie('_ga');
  if (!ga) return '';
  const parts = ga.split('.');
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : '';
}
// GA4 session_id — from the stream-specific cookie _ga_<stream_id>, format GS1.1.<session_id>.<...>
function getGaSessionId() {
  const m = document.cookie.match(/_ga_[A-Z0-9]+=GS\d\.\d\.(\d+)/);
  return m ? m[1] : '';
}

// === Google Apps Script integration ===
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfDJy9Lfk5sZQsA6ccMJOf2XTvcNAeoMHdb7JhKqHtKQ6cYMUkLnuKKZMVyehTS4Hd/exec';
const NOTIFY_EMAILS = 'cameron@axesagency.com';

// State
let currentPath = [];
let stepIndex = 0;
const data = {};

function buildPath() {
  // Start with tax_problem
  currentPath = ['tax_problem'];

  // If we have a tax_problem answer, add the conditional steps
  if (data.tax_problem && FLOWS[data.tax_problem]) {
    currentPath = currentPath.concat(FLOWS[data.tax_problem]);
  }

  // Add universal steps
  currentPath = currentPath.concat(UNIVERSAL_STEPS);

  return currentPath;
}

function getCurrentStep() {
  buildPath();
  return QUESTIONS[currentPath[stepIndex]];
}

function getTotalSteps() {
  buildPath();
  // Most flows have 5 steps, show that as minimum for consistent UX
  return Math.max(currentPath.length, 5);
}

function setProgress() {
  const total = getTotalSteps();
  stepLabel.textContent = `Step ${stepIndex + 1} of ${total}`;
  const pct = Math.round(stepIndex / (total - 1) * 100);
  progressBar.style.width = Math.max(2, pct) + '%';
}

function clearPreviousConversation() {
  const messages = chatMessages.querySelectorAll('.message:not(.typing-indicator)');
  messages.forEach(msg => {
    msg.classList.add('swipe-up-exit');
  });
  setTimeout(() => {
    messages.forEach(msg => msg.remove());
  }, 350);
}

function addBotMessage(title, sub, isNewConversation = false) {
  if (isNewConversation && stepIndex > 0) {
    clearPreviousConversation();
    setTimeout(() => {
      showBotMessage(title, sub);
    }, 400);
  } else {
    showBotMessage(title, sub);
  }
}

function showBotMessage(title, sub) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot-message';
  messageDiv.innerHTML = `
    <div class="message-bubble">
      <div class="message-title">${title}</div>
      ${sub ? `<div class="message-subtitle">${sub}</div>` : ''}
    </div>
  `;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  messageDiv.innerHTML = `
    <div class="message-bubble">
      <div class="user-message-text">${text}</div>
    </div>
  `;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

let isFirstRender = true;

function render() {
  const s = getCurrentStep();
  if (!s) return;

  setProgress();

  const answerSection = document.querySelector('.answer-section');

  // Update question message
  if (stepIndex === 0 && isFirstRender) {
    // First render - add class for slow animation
    answerSection.classList.add('first-enter');
    showBotMessage(s.title, s.sub);

    // Delay controls for first time
    setTimeout(() => {
      controls.innerHTML = '';
      buildControlsForStep(s);
    }, 400);

    isFirstRender = false;
  } else {
    // Subsequent renders - remove first-enter class, update instantly
    answerSection.classList.remove('first-enter');
    addBotMessage(s.title, s.sub, true);
    controls.innerHTML = '';
    buildControlsForStep(s);
  }

  backBtn.disabled = stepIndex === 0;
  nextBtn.textContent = stepIndex === getTotalSteps() - 1 ? 'Get My Options' : 'Next';
}

function buildControlsForStep(s) {
  const answerSection = document.querySelector('.answer-section');
  const fixedInputArea = document.querySelector('.fixed-input-area');

  // Reset classes
  fixedInputArea.classList.remove('debt-question');
  answerSection.classList.remove('scrollable');

  if (s.type === 'pills') {
    const el = document.createElement('div');
    el.className = 'options';

    // Make scrollable if more than 5 options
    if ((s.options || []).length > 5) {
      el.classList.add('scrollable');
      answerSection.classList.add('scrollable');
      fixedInputArea.classList.add('debt-question');
    }

    (s.options || []).forEach(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'option';
      item.innerHTML = `<span class="mark">✓</span><span class="label">${opt}</span>`;

      if (data[s.id] === opt) item.classList.add('active');

      item.addEventListener('click', () => {
        el.querySelectorAll('.option').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        advance(opt);
      });

      el.appendChild(item);
    });

    controls.appendChild(el);
  } else if (s.type === 'multi') {
    const el = document.createElement('div');
    el.className = 'options';

    const selected = data[s.id] || [];

    (s.options || []).forEach(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'option';
      item.innerHTML = `<span class="mark">✓</span><span class="label">${opt}</span>`;

      if (selected.includes(opt)) item.classList.add('active');

      item.addEventListener('click', () => {
        item.classList.toggle('active');
      });

      el.appendChild(item);
    });

    controls.appendChild(el);

    // For multi-select, use the Next button
    nextBtn.onclick = () => {
      const selectedOpts = Array.from(el.querySelectorAll('.option.active'))
        .map(btn => btn.querySelector('.label').textContent);
      if (selectedOpts.length === 0) {
        addBotMessage('Please select at least one option', '');
        return;
      }
      advance(selectedOpts);
    };
  } else if (s.type === 'select') {
    const wrap = document.createElement('div');
    wrap.style.padding = '0';

    const sel = document.createElement('select');
    sel.className = 'select';
    const placeholderText = s.id === 'state' ? 'Select your state' : 'Select an option';
    sel.innerHTML = `<option value="" disabled selected>${placeholderText}</option>` +
      s.options.map(o => `<option value="${o}">${o}</option>`).join('');
    if (data[s.id]) sel.value = data[s.id];

    sel.addEventListener('change', () => {
      advance(sel.value);
    });

    wrap.appendChild(sel);
    controls.appendChild(wrap);
  } else if (s.type === 'date') {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'input';
    input.value = data[s.id] || '';

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'option';
    skipBtn.innerHTML = `<span class="label">I don't know / Skip</span>`;
    skipBtn.addEventListener('click', () => {
      advance('Not specified');
    });

    wrap.appendChild(input);
    wrap.appendChild(skipBtn);
    controls.appendChild(wrap);

    nextBtn.onclick = () => {
      advance(input.value || 'Not specified');
    };
  } else if (s.type === 'contact') {
    answerSection.classList.remove('scrollable');
    buildContactStep();
  }
}

function buildContactStep() {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr 1fr';
  wrap.style.gap = '8px';
  wrap.className = 'grid2';

  const mkField = (id, node) => {
    node.dataset.id = id;
    node.classList.add('input');
    return node;
  };

  const mkInput = (id, type, ph, val) => mkField(id, Object.assign(document.createElement('input'), {
    type,
    placeholder: ph,
    value: val || ''
  }));

  const firstName = mkInput('firstName', 'text', 'First name', data.firstName);
  const lastName = mkInput('lastName', 'text', 'Last name', data.lastName);
  const phone = mkInput('phone', 'tel', 'Phone number', data.phone);
  const email = mkInput('email', 'email', 'Email address', data.email);

  // Phone formatting
  const digits = s => (s || '').replace(/\D/g, '');
  const formatPhone = d => {
    const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10);
    if (d.length <= 3) return a;
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };

  function maskPhone() {
    const d = digits(phone.value).slice(0, 10);
    phone.value = formatPhone(d);
  }

  phone.addEventListener('input', maskPhone);
  phone.addEventListener('blur', maskPhone);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function setError(el, msg) {
    el.classList.add('error');
    const existing = el.parentNode?.querySelector('.error-text');
    if (existing) existing.remove();
    const e = document.createElement('div');
    e.className = 'error-text';
    e.textContent = msg;
    el.parentNode?.appendChild(e);
  }

  function clearError(el) {
    el.classList.remove('error');
    const n = el.parentNode?.querySelector('.error-text');
    if (n) n.remove();
  }

  // Consent checkbox
  const consent = document.createElement('label');
  consent.style.display = 'flex';
  consent.style.alignItems = 'flex-start';
  consent.style.gap = '8px';
  consent.style.fontSize = '13px';
  consent.style.gridColumn = '1 / -1';
  consent.style.lineHeight = '1.4';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!data.terms;
  cb.dataset.id = 'terms';
  cb.style.marginTop = '3px';

  consent.appendChild(cb);
  consent.appendChild(document.createTextNode('I agree to be contacted about my tax situation and accept the Privacy Policy.'));

  const cell = (node, full = false) => {
    const c = document.createElement('div');
    if (full) c.style.gridColumn = '1 / -1';
    c.appendChild(node);
    return c;
  };

  wrap.appendChild(cell(firstName));
  wrap.appendChild(cell(lastName));
  wrap.appendChild(cell(phone));
  wrap.appendChild(cell(email));
  wrap.appendChild(cell(consent, true));
  controls.appendChild(wrap);

  nextBtn.onclick = function () {
    [firstName, lastName, phone, email].forEach(clearError);
    let ok = true;

    if (!firstName.value.trim()) {
      setError(firstName, 'First name is required');
      ok = false;
    }
    if (!lastName.value.trim()) {
      setError(lastName, 'Last name is required');
      ok = false;
    }

    const d = digits(phone.value);
    if (d.length < 10) {
      setError(phone, 'Please enter a valid 10-digit phone number');
      ok = false;
    } else {
      phone.value = formatPhone(d);
    }

    if (!email.value.trim() || !emailRe.test(email.value)) {
      setError(email, 'Please enter a valid email address');
      ok = false;
    }

    if (!cb.checked) {
      const existing = consent.querySelector('.error-text');
      if (!existing) {
        const e = document.createElement('div');
        e.className = 'error-text';
        e.textContent = 'Please check the box to continue.';
        consent.appendChild(e);
      }
      ok = false;
    } else {
      const e = consent.querySelector('.error-text');
      if (e) e.remove();
    }

    if (!ok) return;

    data.firstName = firstName.value.trim();
    data.lastName = lastName.value.trim();
    data.name = `${data.firstName} ${data.lastName}`;
    data.phone = formatPhone(digits(phone.value));
    data.email = email.value.trim();
    data.terms = cb.checked;

    submit();
  };

  backBtn.onclick = back;
}

function back() {
  if (stepIndex === 0) return;
  stepIndex--;
  render();
}

function advance(value) {
  const s = getCurrentStep();
  if (s.required && (!value || value.length === 0)) {
    addBotMessage('Please select an option', 'Choose an answer to continue.');
    return;
  }

  // Filter out people just looking for IRS contact info
  if (s.id === 'not_sure_clarify' && value === 'I just need to contact the IRS') {
    addUserMessage(value);
    setTimeout(() => {
      showIrsContactInfo();
    }, 400);
    return;
  }

  // Add user message
  const displayValue = Array.isArray(value) ? value.join(', ') : value;
  addUserMessage(displayValue);

  data[s.id] = value;

  // Track step completion (GA4 micro-conversion)
  trackEvent('form_step_complete', {
    step_number: stepIndex + 1,
    step_id: s.id,
    step_title: s.title,
    user_response: displayValue,
    tax_problem: data.tax_problem || '',
    debt_amount: data.back_taxes_amount || '',
    service_type: data.tax_problem || ''
  });

  // Milestone events — easier to mark as Key Events in GA4
  if (s.id === 'tax_problem') {
    trackEvent('funnel_qualified', { tax_problem: value });
  }
  if (s.id === 'state') {
    trackEvent('funnel_state_selected', { state: value });
  }

  // If this was the tax_problem question, rebuild the path
  if (s.id === 'tax_problem') {
    buildPath();
  }

  stepIndex++;

  if (stepIndex < getTotalSteps()) {
    setTimeout(() => {
      render();
    }, 800);
  } else {
    setTimeout(() => {
      addBotMessage('Perfect!', 'Processing your information...', true);
      setTimeout(submit, 1000);
    }, 800);
  }
}

async function postToGoogle(payload) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.indexOf('script.google.com') === -1) {
    console.warn('GAS_WEB_APP_URL not set; skipping network post.');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const url = GAS_WEB_APP_URL + `?ua=${encodeURIComponent(navigator.userAgent)}&ref=${encodeURIComponent(document.referrer)}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, notify: NOTIFY_EMAILS }),
      signal: controller.signal
    });
  } catch (e) {
    console.warn('Post to GAS failed (continuing to TY):', e);
  } finally {
    clearTimeout(timer);
  }
}

async function submit() {
  // Map chatbot fields to database fields
  const mappedData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    state: data.state,
    tax_problem: data.tax_problem,
    tax_jurisdiction: data.tax_jurisdiction,
    // Map conditional fields to standardized names
    debt_amount: data.back_taxes_amount || data.notice_amount || '',
    collection_actions: Array.isArray(data.back_taxes_actions) ? data.back_taxes_actions.join(', ') : (data.back_taxes_actions || ''),
    unfiled_years: data.unfiled_years || '',
    employment_status: data.filing_status || data.business_structure || '',
    contactTime: 'Any time', // Default since we don't ask this in current flow
    ts: new Date().toISOString(),
    source: 'Tax Peace Now Chatbot',
    page_url: window.location.href,
    fbclid: fbclid,
    fbc: fbc,
    fbp: fbp,
    // UTM attribution (first-touch, persisted via sessionStorage)
    utm_source: utmData.utm_source || '',
    utm_medium: utmData.utm_medium || '',
    utm_campaign: utmData.utm_campaign || '',
    utm_content: utmData.utm_content || '',
    utm_term: utmData.utm_term || '',
    gclid: utmData.gclid || '',
    landing_page: utmData.landing_page || '',
    referrer: utmData.referrer || '',
    first_touch_ts: utmData.first_touch_ts || '',
    // GA4 identifiers for server-side Measurement Protocol attribution
    ga_client_id: getGaClientId(),
    ga_session_id: getGaSessionId()
  };

  const payload = mappedData;

  const eventId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if this is a test submission (via URL parameter ?test=true)
  const isTest = window.location.search.includes('test=true');

  // Check if user came from Facebook (has fbclid parameter or fbc cookie)
  const isFromFacebook = !!(fbclid || fbc);

  // Track form submission with Meta pixel (with Advanced Matching)
  // Only track if: NOT a test AND came from Facebook
  if (typeof fbq !== 'undefined' && !isTest && isFromFacebook) {
    fbq('track', 'CompleteRegistration', {
      content_name: 'Tax Peace Assessment',
      status: 'complete'
    }, {
      event_id: eventId,
      em: data.email?.toLowerCase(),
      ph: data.phone?.replace(/\D/g, ''),
      fn: data.firstName?.toLowerCase(),
      ln: data.lastName?.toLowerCase()
    });
  }

  // Track form submission with Google Ads
  // Skip tracking for test submissions
  if (typeof gtag !== 'undefined' && !isTest) {
    gtag('event', 'conversion', {
      send_to: 'AW-17497432656',
      event_category: 'form_submission',
      event_label: 'tax_peace_lead',
      tax_problem: data.tax_problem,
      state: data.state,
      tax_jurisdiction: data.tax_jurisdiction
    });

    // GA4 standard lead event — mark as Key Event in GA4 admin
    trackEvent('generate_lead', {
      currency: 'USD',
      value: 1,
      tax_problem: data.tax_problem || '',
      debt_amount: data.back_taxes_amount || '',
      state: data.state || '',
      tax_jurisdiction: data.tax_jurisdiction || '',
      lead_id: eventId
    });
  }

  // Send to Cloudflare Worker
  try {
    await fetch('https://tax-peace-conversions.cameron-07f.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, event_id: eventId })
    });
  } catch (error) {
    console.warn('Cloudflare Worker submission failed:', error);
    postToGoogle(payload);
  }

  try {
    localStorage.setItem('tax_peace_lead', JSON.stringify(payload));
  } catch (_) {}

  const qp = new URLSearchParams({ name: data.firstName || 'Friend' });
  const utm = params && params.toString() ? '&' + params.toString() : '';
  location.href = 'thank-you.html?' + qp.toString() + utm;
}

// Show IRS contact info for people just looking to contact the IRS
function showIrsContactInfo() {
  clearPreviousConversation();

  setTimeout(() => {
    showBotMessage(
      'Here\'s how to contact the IRS directly:',
      '<strong>IRS Phone:</strong> <a href="tel:1-800-829-1040" style="color: var(--purp);">1-800-829-1040</a><br><strong>IRS Website:</strong> <a href="https://www.irs.gov" target="_blank" style="color: var(--purp);">irs.gov</a><br><br>If you have tax debt or need help resolving an IRS issue, we can help with that too.'
    );

    // Show option to continue if they actually need help
    controls.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'options';

    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.className = 'option';
    helpBtn.innerHTML = '<span class="mark">✓</span><span class="label">Actually, I do need help with a tax issue</span>';
    helpBtn.addEventListener('click', () => {
      addUserMessage('Actually, I do need help with a tax issue');
      stepIndex = 0;
      setTimeout(() => render(), 400);
    });

    wrap.appendChild(helpBtn);
    controls.appendChild(wrap);

    // Hide the Next button, show only Back
    nextBtn.style.display = 'none';
    backBtn.disabled = false;
    backBtn.onclick = () => {
      nextBtn.style.display = '';
      stepIndex = 1; // Go back to not_sure_clarify
      render();
    };
  }, 400);
}

// === GA4 micro-conversion tracking ===
function trackEvent(name, params) {
  if (typeof gtag === 'undefined') return;
  gtag('event', name, Object.assign({
    utm_source: utmData.utm_source || '',
    utm_medium: utmData.utm_medium || '',
    utm_campaign: utmData.utm_campaign || ''
  }, params || {}));
}

// Fire chatbot_start once when the wizard boots
let chatbotStartFired = false;
function fireChatbotStart() {
  if (chatbotStartFired) return;
  chatbotStartFired = true;
  trackEvent('chatbot_start', {
    page_location: window.location.href,
    page_referrer: document.referrer
  });
}

// Scroll depth milestones (25 / 50 / 75 / 100)
const scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
function onScroll() {
  const h = document.documentElement;
  const scrolled = (h.scrollTop + window.innerHeight) / h.scrollHeight * 100;
  Object.keys(scrollMilestones).forEach(pct => {
    if (!scrollMilestones[pct] && scrolled >= Number(pct)) {
      scrollMilestones[pct] = true;
      trackEvent('scroll_depth', { percent_scrolled: Number(pct) });
    }
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

// Phone click tracking (catches every tel: link on the page)
document.addEventListener('click', (e) => {
  const link = e.target.closest && e.target.closest('a[href^="tel:"]');
  if (link) {
    trackEvent('phone_click', {
      phone_number: link.getAttribute('href').replace('tel:', ''),
      link_text: (link.textContent || '').trim().slice(0, 80),
      location: window.location.pathname
    });
  }
});

// Initialize with a slight delay for the first question
setTimeout(() => {
  fireChatbotStart();
  render();
}, 800);
