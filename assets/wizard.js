// Tax Peace Now Chatbot - Peaceful vibes wizard with Google Sheets integration
const STEPS = [
  { 
    id:'debt_amount',  
    type:'pills',   
    title:'How much do you owe the IRS?', 
    sub:'Select the amount closest to your situation.', 
    options:[
      '$0 - $10,000',
      '$10,001 - $20,000', 
      '$20,001 - $30,000',
      '$30,001 - $40,000', 
      '$40,001 - $50,000', 
      '$50,000 - $75,000',
      '$75,000 - $100,000', 
      '$100,001 - $199,999',
      '$200,000 - $300,000', 
      '$300,000 - $400,000',
      '$400,000 - $500,000', 
      '$500,000 and over'
    ], 
    required:true 
  },
  { 
    id:'tax_type', 
    type:'pills',   
    title:'Which type of taxes?', 
    sub:'Select all that apply to your situation.', 
    options:['Federal (IRS)', 'State', 'Both', 'Not sure'], 
    required:true 
  },
  { 
    id:'unfiled_years', 
    type:'pills',   
    title:'Do you have unfiled tax returns?', 
    sub:'Select the option that best describes your filing status.', 
    options:['Yes, some years', 'No, all filed', 'Not sure', 'Prefer not to say'], 
    required:true 
  },
  { 
    id:'employment_status', 
    type:'pills',   
    title:'Current employment status?', 
    sub:'This helps us determine the best resolution options.', 
    options:['Regular job (W-2)', 'Self-employed', 'Unemployed', 'Retired'], 
    required:true 
  },
  { 
    id:'collection_actions', 
    type:'pills',   
    title:'Any IRS collection actions?', 
    sub:'Select what the IRS has done or threatened to do.', 
    options:['Wage garnishment', 'Bank levy', 'Tax lien filed', 'Nothing yet'], 
    required:true 
  },
  { 
    id:'contact', 
    type:'contact', 
    title:'Almost done! Let\'s connect you with a tax specialist.', 
    sub:'Enter your contact information and we\'ll call within 24 hours.', 
    required:true 
  }
];

const stepLabel = document.getElementById('stepLabel');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const controls = document.getElementById('controls');
const chatMessages = document.getElementById('chatMessages');
const progressBar = document.getElementById('progressBar');

const params = new URLSearchParams(location.search);
const utm = params.toString() ? ('?' + params.toString()) : '';

// === Google Apps Script integration ===
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfDJy9Lfk5sZQsA6ccMJOf2XTvcNAeoMHdb7JhKqHtKQ6cYMUkLnuKKZMVyehTS4Hd/exec'; 
const NOTIFY_EMAILS = 'cameron@axesagency.com';

let step = 0;
const data = {};

function setProgress(i) {
  stepLabel.textContent = `Step ${Math.min(i + 1, STEPS.length)} of ${STEPS.length}`;
  const pct = Math.round((i) / (STEPS.length - 1) * 100);
  progressBar.style.width = Math.max(2, pct) + '%';
}

function clearPreviousConversation() {
  // Clear all existing messages except typing indicator
  const messages = chatMessages.querySelectorAll('.message:not(.typing-indicator)');
  messages.forEach(msg => {
    msg.classList.add('swipe-up-exit');
  });
  
  // Remove messages after animation
  setTimeout(() => {
    messages.forEach(msg => msg.remove());
  }, 350);
}

function addBotMessage(title, sub, isNewConversation = false) {
  // Clear previous conversation if starting new question
  if (isNewConversation && step > 0) {
    clearPreviousConversation();
    
    // Wait for clear animation before showing new message
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

function render() {
  const s = STEPS[step];
  setProgress(step);

  // Add bot message for this step
  if (step > 0) {
    addBotMessage(s.title, s.sub, true); // Mark as new conversation
  }

  // Update controls
  controls.innerHTML = '';
  buildControlsForStep(s);

  backBtn.disabled = step === 0;
  nextBtn.textContent = step === STEPS.length - 1 ? 'Get My Options' : 'Next';
}

function buildControlsForStep(s) {
  const answerSection = document.querySelector('.answer-section');
  const fixedInputArea = document.querySelector('.fixed-input-area');
  
  // Add debt-question class for first question only
  if (s.id === 'debt_amount') {
    fixedInputArea.classList.add('debt-question');
  } else {
    fixedInputArea.classList.remove('debt-question');
  }
  
  if (s.type === 'pills') {
    const el = document.createElement('div');
    el.className = 'options';
    
    // Add scrollable class for debt_amount question or if more than 4 options
    if (s.id === 'debt_amount' || (s.options || []).length > 4) {
      el.classList.add('scrollable');
      answerSection.classList.add('scrollable');
    } else {
      answerSection.classList.remove('scrollable');
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
  } else if (s.type === 'contact') {
    answerSection.classList.remove('scrollable');
    buildContactStep();
  }
}

function buildContactStep() {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr 1fr';
  wrap.style.gap = '10px';
  wrap.className = 'grid2';

  const mkField = (id, node) => { 
    node.dataset.id = id; 
    node.classList.add('input'); 
    return node; 
  }
  
  const mkInput = (id, type, ph, val) => mkField(id, Object.assign(document.createElement('input'), {
    type, 
    placeholder: ph, 
    value: val || ''
  }));
  
  const mkSelect = (id, opts, label) => {
    const sel = document.createElement('select'); 
    sel.className = 'select'; 
    sel.dataset.id = id;
    sel.innerHTML = `<option value="" disabled selected>${label}</option>` + 
                   opts.map(o => `<option>${o}</option>`).join('');
    if (data[id]) sel.value = data[id];
    return sel;
  };

  // Form fields
  const firstName = mkInput('firstName', 'text', 'First name', data.firstName);
  const lastName = mkInput('lastName', 'text', 'Last name', data.lastName);
  const phone = mkInput('phone', 'tel', 'Phone number', data.phone);
  const email = mkInput('email', 'email', 'Email address', data.email);
  const contactTime = mkSelect('contactTime', ['Morning (8am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'], 'Best time to call?');

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

  // Email validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  
  function setError(el, msg) {
    el.classList.add('error');
    const e = document.createElement('div'); 
    e.className = 'error-text'; 
    e.textContent = msg;
    el.parentNode && el.parentNode.appendChild(e);
  }
  
  function clearError(el) {
    el.classList.remove('error');
    if (el.parentNode) { 
      const n = el.parentNode.querySelector('.error-text'); 
      if (n) n.remove(); 
    }
  }

  // Consent checkbox
  const consent = document.createElement('label');
  consent.style.display = 'flex'; 
  consent.style.alignItems = 'center'; 
  consent.style.gap = '10px'; 
  consent.style.gridColumn = '1 / -1';
  
  const cb = document.createElement('input'); 
  cb.type = 'checkbox'; 
  cb.checked = !!data.terms; 
  cb.dataset.id = 'terms';
  
  consent.appendChild(cb);
  consent.appendChild(document.createTextNode('I agree to be contacted about tax resolution services and accept Tax Peace Now\'s Privacy Policy.'));

  // Layout
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
  wrap.appendChild(cell(contactTime, true));
  wrap.appendChild(cell(consent, true));
  controls.appendChild(wrap);

  // Form validation and submission
  nextBtn.onclick = function() {
    [firstName, lastName, phone, email, contactTime].forEach(clearError);
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
    
    if (!contactTime.value) { 
      setError(contactTime, 'Please select your preferred call time'); 
      ok = false; 
    }
    
    if (!cb.checked) {
      if (!consent.querySelector('.error-text')) { 
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

    if (!ok) {
      return;
    }

    // Save form data
    data.firstName = firstName.value.trim();
    data.lastName = lastName.value.trim();
    data.name = `${data.firstName} ${data.lastName}`;
    data.phone = formatPhone(digits(phone.value));
    data.email = email.value.trim();
    data.contactTime = contactTime.value;
    data.terms = cb.checked;
    
    submit();
  };

  backBtn.onclick = back;
}

function back() { 
  if (step === 0) return; 
  step--; 
  render(); 
}

function advance(value) {
  const s = STEPS[step];
  if (s.required && (!value || value.length === 0)) {
    addBotMessage('Please select an option', 'Choose an answer to continue.');
    return;
  }
  
  // Add user message
  addUserMessage(value);
  
  data[s.id] = value;
  step++;
  
  if (step < STEPS.length) {
    setTimeout(() => {
      render();
    }, 1200);
  } else {
    setTimeout(() => {
      addBotMessage('Perfect!', 'Connecting you with a tax specialist...', true);
      setTimeout(submit, 1000);
    }, 1200);
  }
}

// Submit to Google Sheets
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

function submit() {
  // Assemble payload
  const payload = { 
    ...data, 
    ts: new Date().toISOString(),
    source: 'Tax Peace Now Chatbot'
  };

  // Send to Google Apps Script
  postToGoogle(payload);

  // Store locally for debugging
  try { 
    localStorage.setItem('tax_resolution_lead', JSON.stringify(payload)); 
  } catch(_) {}

  // Redirect to thank you page
  const qp = new URLSearchParams({ name: data.firstName || 'Friend' });
  const utm = params && params.toString() ? '&' + params.toString() : '';
  location.href = 'thank-you.html?' + qp.toString() + utm;
}

// Initialize
render();