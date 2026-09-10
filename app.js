(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const viewLabels = {
    overview: 'Overview',
    duplicates: 'Duplicate review',
    conflicts: 'Conflict review',
    calendars: 'Connected calendars',
    access: 'People & access',
    activity: 'Activity'
  };

  const duplicateData = {
    acme: {
      title: 'Acme quarterly review',
      meta: 'Thursday, September 10 · 10:00–11:00 AM · 96% match',
      sources: [
        { source: 'Google', mark: 'G', cls: 'google', title: 'Acme quarterly review', detail: '10:00–11:00 AM · Maya, Jordan, John Smith', selected: true },
        { source: 'Outlook', mark: 'O', cls: 'outlook', title: 'Acme Q3 business review', detail: '10:00–11:00 AM · Maya Chen, John Smith' },
        { source: 'Salesforce', mark: 'SF', cls: 'salesforce', title: 'Acme Corp quarterly review', detail: '$420K opportunity · Negotiation stage' }
      ]
    },
    board: {
      title: 'Board packet review',
      meta: 'Thursday, September 10 · 1:00–1:30 PM · 91% match',
      sources: [
        { source: 'Google', mark: 'G', cls: 'google', title: 'Board packet review', detail: '1:00–1:30 PM · 4 documents attached', selected: true },
        { source: 'Outlook', mark: 'O', cls: 'outlook', title: 'Review board materials', detail: '1:00–1:30 PM · Maya and Jordan' }
      ]
    },
    planning: {
      title: 'FY27 planning kickoff',
      meta: 'Monday, September 14 · 9:00–10:30 AM · 84% match',
      sources: [
        { source: 'Google', mark: 'G', cls: 'google', title: 'FY27 planning kickoff', detail: '9:00–10:30 AM · 12 attendees', selected: true },
        { source: 'Apple', mark: 'A', cls: 'apple', title: 'Annual planning', detail: '9:00–10:30 AM · Personal calendar copy' }
      ]
    }
  };

  let currentDuplicate = 'acme';
  let duplicateCount = 3;
  let conflictCount = 2;
  let healthScore = 82;
  let toastTimer;
  let activeModal = null;
  let tourIndex = 0;
  let captionsOnly = false;
  let selectedVoice = null;
  let tourRunning = false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('capture') === '1') document.body.classList.add('capture-mode');

  function icon(id) {
    return `<svg aria-hidden="true"><use href="/assets/icons.svg#${id}"></use></svg>`;
  }

  function setView(view, options = {}) {
    const target = viewLabels[view] ? view : 'overview';
    $$('[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === target);
      if (button.dataset.view === target) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $$('[data-view-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.viewPanel === target));
    const breadcrumb = $('#breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = viewLabels[target];

    if (!options.skipHistory) {
      const next = new URL(window.location.href);
      next.searchParams.set('view', target);
      history.replaceState({}, '', next);
    }

    if (window.innerWidth <= 800) closeSidebar();
    window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
  }

  function openSidebar() {
    $('#sidebar')?.classList.add('open');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    $('#sidebar')?.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  }

  function showToast(message) {
    const toast = $('#toast');
    const text = $('#toastText');
    if (!toast || !text) return;
    text.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3300);
  }

  function updateMetrics() {
    $$('[data-count="duplicates"]').forEach((el) => { el.textContent = String(duplicateCount); });
    $$('[data-count="conflicts"]').forEach((el) => { el.textContent = String(conflictCount); });
    const score = $('#healthScore');
    const progress = $('#healthProgress');
    if (score) score.textContent = String(healthScore);
    if (progress) progress.style.strokeDashoffset = String(176 - (176 * healthScore / 100));
  }

  function renderDuplicate(key) {
    const data = duplicateData[key];
    if (!data) return;
    currentDuplicate = key;
    $$('.issue-item').forEach((item) => item.classList.toggle('active', item.dataset.duplicate === key));
    $('#detailTitle').textContent = data.title;
    $('#detailMeta').textContent = data.meta;
    $('#sourceRecords').innerHTML = data.sources.map((record, index) => `
      <label class="source-record${record.selected || index === 0 ? ' selected' : ''}">
        <input class="record-radio" type="radio" name="canonical-source" value="${index}" ${record.selected || index === 0 ? 'checked' : ''}>
        <span class="provider-icon ${record.cls}">${record.mark}</span>
        <span class="source-copy"><strong>${record.title}</strong><span>${record.source} · ${record.detail}</span></span>
        <span class="canonical-choice">${record.selected || index === 0 ? 'Primary' : 'Use this'}</span>
      </label>
    `).join('');

    $$('.record-radio', $('#sourceRecords')).forEach((radio) => {
      radio.addEventListener('change', () => {
        $$('.source-record', $('#sourceRecords')).forEach((row, rowIndex) => {
          const active = rowIndex === Number(radio.value);
          row.classList.toggle('selected', active);
          $('.canonical-choice', row).textContent = active ? 'Primary' : 'Use this';
        });
      });
    });
  }

  function removeDuplicate(key, merged = true) {
    const item = $(`[data-duplicate="${key}"]`);
    if (!item || item.classList.contains('resolved')) return;
    item.classList.add('resolved');
    item.setAttribute('disabled', 'true');
    duplicateCount = Math.max(0, duplicateCount - 1);
    healthScore = Math.min(96, healthScore + (merged ? 3 : 1));
    updateMetrics();

    const next = $$('.issue-item:not(.resolved)')[0];
    if (next) renderDuplicate(next.dataset.duplicate);
    else {
      $('#duplicateDetail').innerHTML = `
        <div class="empty-state">
          <span>${icon('check')}</span>
          <h2>Duplicate queue cleared</h2>
          <p>No likely duplicate events remain in this sample workspace.</p>
        </div>`;
    }
    showToast(merged ? 'Events fused into one canonical meeting.' : 'Marked as separate events.');
  }

  function openModal(name) {
    const modal = $(`#${name}Modal`);
    if (!modal) return;
    closeModal();
    activeModal = modal;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    window.setTimeout(() => $('.modal-close', modal)?.focus(), 20);
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    activeModal = null;
  }

  function initVoices() {
    if (!('speechSynthesis' in window)) {
      const select = $('#voiceSelect');
      if (select) {
        select.innerHTML = '<option>Captions only</option>';
        select.disabled = true;
      }
      captionsOnly = true;
      return;
    }

    const voices = speechSynthesis.getVoices().filter((voice) => /^en(-|_)/i.test(voice.lang));
    if (!voices.length) return;

    const voiceScore = (voice) => {
      const name = voice.name.toLowerCase();
      let score = voice.lang.toLowerCase() === 'en-us' ? 50 : 20;
      if (/natural|neural|premium|enhanced/.test(name)) score += 120;
      if (/ava|aria|jenny|samantha|allison|serena|daniel|guy|ryan/.test(name)) score += 70;
      if (/google us english|microsoft/.test(name)) score += 35;
      if (voice.localService) score += 8;
      return score;
    };

    voices.sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
    selectedVoice = voices[0];
    const select = $('#voiceSelect');
    if (!select) return;
    select.innerHTML = voices.map((voice, index) => `<option value="${index}">${voice.name} (${voice.lang})${index === 0 ? ' · recommended' : ''}</option>`).join('');
    select.addEventListener('change', () => { selectedVoice = voices[Number(select.value)] || voices[0]; });
  }

  const tourSteps = [
    {
      view: 'overview',
      target: '#tourSummary',
      copy: "Good morning. CalendarFuse has already checked Maya's four calendars and found three duplicate groups, two conflicts, and one delayed connection. The health score gives Jordan a clear place to start."
    },
    {
      view: 'overview',
      target: '#tourCalendar',
      copy: "The day view keeps every source visible without creating more copies. Colors show where each meeting came from, while private appointments stay private for the assistant."
    },
    {
      view: 'duplicates',
      target: '#tourDedupe',
      copy: "Here, three versions of the Acme review are recognized as one meeting. Jordan chooses the primary record once, and CalendarFuse keeps the source links attached without starting a sync loop."
    },
    {
      view: 'conflicts',
      target: '#tourConflict',
      copy: "Conflicts are explained in plain language. CalendarFuse can suggest a move or a travel buffer, but the assistant stays in control of the final calendar change."
    },
    {
      view: 'calendars',
      target: '#tourProviders',
      copy: "Connection health is visible in one place. Google and Microsoft are the first production integrations, with Apple Calendar and Salesforce following through secure provider authorization."
    },
    {
      view: 'access',
      target: '#tourAccess',
      copy: "Finally, Maya decides exactly what Jordan can see and change. Every automated or assistant action is recorded, so calendar ownership never becomes ambiguous."
    }
  ];

  function speak(text) {
    if (captionsOnly || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.96;
    utterance.pitch = 1.01;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
  }

  function clearTourHighlight() {
    $$('.tour-highlight').forEach((el) => el.classList.remove('tour-highlight'));
  }

  function showTourStep(index, replay = false) {
    if (!tourRunning) return;
    tourIndex = Math.max(0, Math.min(index, tourSteps.length - 1));
    const step = tourSteps[tourIndex];
    clearTourHighlight();
    setView(step.view, { skipHistory: true, instant: true });

    $('#tourStepLabel').textContent = `Step ${tourIndex + 1} of ${tourSteps.length}`;
    $('#tourCaption').textContent = step.copy;
    $('#tourProgress').style.width = `${((tourIndex + 1) / tourSteps.length) * 100}%`;
    $('#tourNext').innerHTML = tourIndex === tourSteps.length - 1
      ? `Finish ${icon('check')}`
      : `Next ${icon('chevron-right')}`;

    window.setTimeout(() => {
      const target = $(step.target);
      if (target) {
        target.classList.add('tour-highlight');
        target.scrollIntoView({ block: 'center', behavior: replay ? 'auto' : 'smooth' });
      }
      speak(step.copy);
    }, 220);
  }

  function openTourWelcome() {
    closeModal();
    $('#tourWelcome')?.classList.add('open');
    document.body.classList.add('tour-open');
  }

  function startTour(withCaptionsOnly = false) {
    captionsOnly = withCaptionsOnly;
    $('#tourWelcome')?.classList.remove('open');
    $('#tourControls')?.classList.add('open');
    document.body.classList.add('tour-open');
    tourRunning = true;
    showTourStep(0);
  }

  function stopTour(message) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearTourHighlight();
    $('#tourWelcome')?.classList.remove('open');
    $('#tourControls')?.classList.remove('open');
    document.body.classList.remove('tour-open');
    tourRunning = false;
    if (message) showToast(message);
  }

  // Navigation and view links.
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-view-link]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.viewLink)));

  $('#mobileMenu')?.addEventListener('click', () => {
    if ($('#sidebar')?.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  $('#dismissBanner')?.addEventListener('click', () => {
    $('#demoBanner')?.remove();
    try { sessionStorage.setItem('calendarfuse-demo-banner', 'dismissed'); } catch (_) { /* Storage may be blocked in embedded previews. */ }
  });
  try {
    if (sessionStorage.getItem('calendarfuse-demo-banner') === 'dismissed') $('#demoBanner')?.remove();
  } catch (_) { /* Storage may be blocked in embedded previews. */ }

  // Dashboard controls.
  $$('.timeline-tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('.timeline-tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    if (tab.textContent.trim() !== 'Day') showToast(`${tab.textContent.trim()} layout is included in the production workspace.`);
  }));

  $$('.event').forEach((event) => event.addEventListener('click', () => {
    showToast(`${$('.event-title', event)?.textContent || 'Meeting'} selected. Event editing is simulated in this demo.`);
  }));

  $$('.issue-item').forEach((item) => item.addEventListener('click', () => renderDuplicate(item.dataset.duplicate)));
  $('#mergeButton')?.addEventListener('click', () => removeDuplicate(currentDuplicate, true));
  $('#notDuplicate')?.addEventListener('click', () => removeDuplicate(currentDuplicate, false));
  $('.resolve-all')?.addEventListener('click', () => {
    $$('.issue-item:not(.resolved)').forEach((item) => item.classList.add('resolved'));
    duplicateCount = 0;
    healthScore = Math.min(96, healthScore + 8);
    updateMetrics();
    $('#duplicateDetail').innerHTML = `<div class="empty-state"><span>${icon('check')}</span><h2>High-confidence groups resolved</h2><p>The original source links remain available in the activity log.</p></div>`;
    showToast('Three high-confidence duplicate groups resolved.');
  });

  $$('.conflict-resolve').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('.conflict-card');
    if (!card || card.classList.contains('resolved')) return;
    card.classList.add('resolved');
    conflictCount = Math.max(0, conflictCount - 1);
    healthScore = Math.min(96, healthScore + 3);
    updateMetrics();
    const action = button.dataset.action;
    const messages = {
      move: 'Product review moved to 12:45 PM. Both source calendars were updated.',
      buffer: 'Meeting shortened and a 15-minute buffer added.',
      travel: 'A 30-minute travel buffer was added.',
      ignore: 'Conflict kept as-is and noted in the activity log.'
    };
    showToast(messages[action] || 'Conflict updated.');
  }));

  $$('.toggle').forEach((toggle) => toggle.addEventListener('click', () => {
    toggle.classList.toggle('on');
    toggle.setAttribute('aria-pressed', toggle.classList.contains('on') ? 'true' : 'false');
  }));

  // Modal handling.
  $$('[data-modal]').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.modal)));
  $$('.modal-close').forEach((button) => button.addEventListener('click', closeModal));
  $$('.modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); }));

  $$('.demo-connect').forEach((button) => button.addEventListener('click', () => {
    const provider = button.closest('.connect-row')?.querySelector('strong')?.textContent || 'Provider';
    button.textContent = 'Ready for OAuth';
    button.disabled = true;
    showToast(`${provider} requires production OAuth credentials. No account data was requested.`);
  }));

  $('.run-scan')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Scanning 2,481 events…';
    window.setTimeout(() => {
      button.textContent = 'Scan complete';
      healthScore = Math.max(healthScore, 82);
      updateMetrics();
      window.setTimeout(() => {
        closeModal();
        button.disabled = false;
        button.textContent = 'Run scan';
        showToast('Calendar health scan complete. Five issues need review.');
      }, 650);
    }, 1250);
  });

  $('.save-settings')?.addEventListener('click', () => {
    closeModal();
    showToast('Scheduling rules saved to the sample workspace.');
  });

  // Tour and voice controls.
  $('#tourButton')?.addEventListener('click', openTourWelcome);
  $('#startTour')?.addEventListener('click', () => startTour(false));
  $('#skipVoice')?.addEventListener('click', () => startTour(true));
  $('#tourReplay')?.addEventListener('click', () => showTourStep(tourIndex, true));
  $('#tourStop')?.addEventListener('click', () => stopTour('Guided tour ended.'));
  $('#tourNext')?.addEventListener('click', () => {
    if (tourIndex >= tourSteps.length - 1) {
      stopTour('Tour complete. Explore the sample workspace at your own pace.');
      setView('overview');
    } else {
      showTourStep(tourIndex + 1);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (activeModal) closeModal();
    else if (tourRunning || $('#tourWelcome')?.classList.contains('open')) stopTour();
    else closeSidebar();
  });

  // Initial state.
  renderDuplicate('acme');
  updateMetrics();
  const initialView = params.get('view') || 'overview';
  setView(initialView, { skipHistory: true, instant: true });
  initVoices();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', initVoices);
  if (params.get('tour') === '1' && params.get('capture') !== '1') window.setTimeout(openTourWelcome, 500);
})();
