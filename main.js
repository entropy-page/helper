const WORKER_URL = 'https://helper-page.stryk-github.workers.dev/';
  let running = false;

  // All cookie field IDs in one place so nothing is missed
  const COOKIE_FIELDS = ['u-cookie', 'p-cookie'];

  function wipeCookieFields() {
    COOKIE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  // Wipe on tab/window close or navigate away
  window.addEventListener('beforeunload', wipeCookieFields);

  // Wipe when page is hidden (covers mobile app-switching, screen-off)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') wipeCookieFields();
  });

  function switchTab(id) {
    document.querySelectorAll('.tab').forEach((t, i) => {
      t.classList.toggle('active', ['universe', 'place', 'log'][i] === id);
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
  }

  function log(msg, type = 'info') {
    const box = document.getElementById('log');
    const ts = new Date().toTimeString().slice(0, 8);
    const line = document.createElement('div');
    line.className = 'log-line';
    const tsSpan = document.createElement('span');
    tsSpan.className = 'log-ts';
    tsSpan.textContent = '[' + ts + ']';
    const msgSpan = document.createElement('span');
    msgSpan.className = 'log-' + type;
    msgSpan.textContent = msg;
    line.appendChild(tsSpan);
    line.appendChild(msgSpan);
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function clearLog() {
    document.getElementById('log').innerHTML = '';
  }

  function setStatus(prefix, text, state) {
    document.getElementById(prefix + '-status').textContent = text;
    document.getElementById(prefix + '-dot').className = 'dot' + (state ? ' ' + state : '');
  }

  function setProgress(prefix, val, total) {
    document.getElementById(prefix + '-bar').style.width =
      (total ? Math.round((val / total) * 100) : 0) + '%';
  }

  function stop() {
    running = false;
    log('Stop requested.', 'info');
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function callWorker(payload) {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resp.status === 429) {
      const retryAfter = resp.headers.get('Retry-After') || '60';
      return { ok: false, message: 'Rate limited. Try again in ' + retryAfter + 's.' };
    }
    if (resp.status === 403) {
      return { ok: false, message: 'Request blocked by worker (origin not allowed).' };
    }

    return resp.json();
  }

  async function runUniverses() {
    const cookieEl = document.getElementById('u-cookie');
    const cookie   = cookieEl.value.trim();
    const template = parseInt(document.getElementById('u-template').value) || 95206881;
    const count    = parseInt(document.getElementById('u-count').value)    || 1;
    const delay    = parseFloat(document.getElementById('u-delay').value)  || 1;

    if (!cookie) { alert('Please paste your .ROBLOSECURITY cookie.'); return; }

    // Wipe from DOM immediately, before any async work
    cookieEl.value = '';

    running = true;
    switchTab('log');
    document.getElementById('u-btn').disabled = true;
    setProgress('u', 0, count);

    let ok = 0, err = 0;
    for (let i = 1; i <= count; i++) {
      if (!running) { log('Stopped by user.', 'info'); break; }
      setStatus('u', 'Creating universe ' + i + ' of ' + count + '...', 'running');
      try {
        const res = await callWorker({ action: 'createUniverse', cookie, templateId: template });
        log('[Universe ' + i + '/' + count + '] ' + res.message, res.ok ? 'ok' : 'err');
        res.ok ? ok++ : err++;
      } catch (e) {
        log('[Universe ' + i + '/' + count + '] Request failed.', 'err');
        err++;
      }
      setProgress('u', i, count);
      if (i < count && running) await sleep(delay * 1000);
    }

    setStatus('u', 'Done. ' + ok + ' succeeded, ' + err + ' failed.', ok > 0 ? 'done' : 'error');
    log('Finished: ' + ok + ' universes created, ' + err + ' failed.', 'info');
    document.getElementById('u-btn').disabled = false;
    running = false;
  }

  async function runPlaces() {
    const cookieEl   = document.getElementById('p-cookie');
    const cookie     = cookieEl.value.trim();
    const universeId = document.getElementById('p-universe').value.trim();
    const template   = parseInt(document.getElementById('p-template').value) || 95206881;
    const count      = parseInt(document.getElementById('p-count').value)    || 1;
    const delay      = parseFloat(document.getElementById('p-delay').value)  || 1;

    if (!cookie) { alert('Please paste your .ROBLOSECURITY cookie.'); return; }
    if (!universeId || isNaN(universeId)) { alert('Please enter a valid Universe ID.'); return; }

    // Wipe from DOM immediately, before any async work
    cookieEl.value = '';

    running = true;
    switchTab('log');
    document.getElementById('p-btn').disabled = true;
    setProgress('p', 0, count);

    let ok = 0, err = 0;
    for (let i = 1; i <= count; i++) {
      if (!running) { log('Stopped by user.', 'info'); break; }
      setStatus('p', 'Creating place ' + i + ' of ' + count + '...', 'running');
      try {
        const res = await callWorker({ action: 'createPlace', cookie, universeId, templateId: template });
        log('[Place ' + i + '/' + count + '] ' + res.message, res.ok ? 'ok' : 'err');
        res.ok ? ok++ : err++;
      } catch (e) {
        log('[Place ' + i + '/' + count + '] Request failed.', 'err');
        err++;
      }
      setProgress('p', i, count);
      if (i < count && running) await sleep(delay * 1000);
    }

    setStatus('p', 'Done. ' + ok + ' succeeded, ' + err + ' failed.', ok > 0 ? 'done' : 'error');
    log('Finished: ' + ok + ' places created, ' + err + ' failed.', 'info');
    document.getElementById('p-btn').disabled = false;
    running = false;
  }