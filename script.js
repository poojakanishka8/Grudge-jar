(function(){
  const STORAGE_KEY = 'grudge-jar-entries-v1';
  const SOUND_KEY = 'grudge-jar-sound-v1';
  const CAPACITY = 24; // balls at which jar reads "full"

  const noteEl = document.getElementById('note');
  const tossBtn = document.getElementById('tossBtn');
  const emptyBtn = document.getElementById('emptyBtn');
  const countLine = document.getElementById('countLine');
  const jarCaption = document.getElementById('jarCaption');
  const ballLayer = document.getElementById('ballLayer');
  const fillLevel = document.getElementById('fillLevel');
  const jarSvg = document.getElementById('jarSvg');
  const toast = document.getElementById('toast');
  const soundToggle = document.getElementById('soundToggle');

  let entries = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch(e) { entries = []; }

  let soundOn = true;
  try {
    const rawSound = localStorage.getItem(SOUND_KEY);
    soundOn = rawSound === null ? true : rawSound === '1';
  } catch(e) { soundOn = true; }

  /* ---------------- Sound engine ----------------
     Everything is synthesized with the Web Audio API,
     so there are no audio files to load or ship.       */
  let audioCtx = null;
  function getCtx(){
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // shared noise buffer, generated once, reused for crumple/flutter sounds
  let noiseBuffer = null;
  function getNoiseBuffer(ctx){
    if (noiseBuffer) return noiseBuffer;
    const bufferSize = ctx.sampleRate * 1.0;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function playCrumple(){
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const dur = 0.32;

      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.5);
      filter.frequency.exponentialRampToValueAtTime(1400, now + dur);
      filter.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      // several quick crackle pulses to sound like crumpling paper
      const pulses = 6;
      for (let i = 0; i < pulses; i++){
        const t = now + (i / pulses) * dur;
        const peak = 0.22 * (1 - i / pulses) + 0.05;
        gain.gain.linearRampToValueAtTime(peak, t + 0.01);
        gain.gain.linearRampToValueAtTime(0.02, t + (dur / pulses) * 0.8);
      }
      gain.gain.linearRampToValueAtTime(0.0001, now + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + dur + 0.05);
    } catch(e) {}
  }

  function playWhoosh(delaySec){
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime + (delaySec || 0);
      const dur = 0.45;

      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + dur * 0.6);
      filter.frequency.exponentialRampToValueAtTime(700, now + dur);
      filter.Q.value = 1.1;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + dur * 0.35);
      gain.gain.linearRampToValueAtTime(0.0001, now + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + dur + 0.05);
    } catch(e) {}
  }

  function playThud(delaySec){
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime + (delaySec || 0);

      // low thump (glass jar body)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

      // tiny high glassy tick on top
      const tick = ctx.createOscillator();
      tick.type = 'triangle';
      tick.frequency.setValueAtTime(1400, now);
      const tickGain = ctx.createGain();
      tickGain.gain.setValueAtTime(0.05, now);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      tick.connect(tickGain);
      tickGain.connect(ctx.destination);
      tick.start(now);
      tick.stop(now + 0.07);
    } catch(e) {}
  }

  function playFlutter(delaySec){
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime + (delaySec || 0);
      const dur = 0.18;

      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2200 + Math.random() * 1200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.04, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, now + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + dur + 0.02);
    } catch(e) {}
  }

  function playChime(){
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        const start = now + i * 0.09;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch(e) {}
  }

  function updateSoundToggleUI(){
    soundToggle.textContent = soundOn ? '🔊' : '🔇';
    soundToggle.classList.toggle('muted', !soundOn);
  }
  updateSoundToggleUI();

  soundToggle.addEventListener('click', function(){
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch(e){}
    updateSoundToggleUI();
    if (soundOn) {
      getCtx();
      playFlutter(0);
    }
  });

  /* ---------------- Persistence ---------------- */
  function save(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch(e){}
  }

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toast.classList.remove('show'), 2200);
  }

  /* ---------------- Rendering ---------------- */
  function updateUI(){
    const n = entries.length;
    tossBtn.disabled = noteEl.value.trim().length === 0;
    emptyBtn.disabled = n === 0;
    countLine.textContent = n === 0 ? 'jar is empty' : (n === 1 ? '1 grudge jarred' : n + ' grudges jarred');
    jarCaption.textContent = n === 0 ? '0 grudges jarred' : (n === 1 ? '1 grudge jarred' : n + ' grudges jarred');

    const pct = Math.min(n / CAPACITY, 1);
    const maxHeight = 250;
    const h = pct * maxHeight;
    fillLevel.setAttribute('y', 400 - h);
    fillLevel.setAttribute('height', h);
  }

  function renderBalls(){
    ballLayer.innerHTML = '';
    const n = entries.length;
    const cols = 6;
    for (let i = 0; i < n && i < 60; i++){
      const row = Math.floor(i / cols);
      const col = i % cols;
      const jitterX = (Math.sin(i * 12.9898) * 10);
      const jitterY = (Math.cos(i * 78.233) * 4);
      const size = 20 + (Math.sin(i * 4.21) * 3);
      const x = 92 + col * 20 + jitterX;
      const y = 392 - row * 16 + jitterY;
      const b = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
      b.setAttribute('cx', x);
      b.setAttribute('cy', y);
      b.setAttribute('rx', size/2);
      b.setAttribute('ry', size/2 * 0.92);
      b.setAttribute('fill', '#ece2c8');
      b.setAttribute('opacity', '0.96');
      b.setAttribute('stroke', '#b8ab89');
      b.setAttribute('stroke-width', '0.6');
      ballLayer.appendChild(b);
    }
  }

  updateUI();
  renderBalls();

  noteEl.addEventListener('input', updateUI);

  tossBtn.addEventListener('click', function(){
    const text = noteEl.value.trim();
    if (!text) return;
    animateToss(text);
  });

  emptyBtn.addEventListener('click', function(){
    if (entries.length === 0) return;
    animateEmpty();
  });

  /* ---------------- Toss animation ---------------- */
  function animateToss(text){
    tossBtn.disabled = true;
    noteEl.disabled = true;
    getCtx();
    playCrumple();

    const textRect = noteEl.getBoundingClientRect();
    const jarRect = jarSvg.getBoundingClientRect();

    const ball = document.createElement('div');
    ball.className = 'flying-ball';
    const startSize = 46;
    ball.style.width = startSize + 'px';
    ball.style.height = startSize + 'px';
    ball.style.left = (textRect.left + textRect.width/2 - startSize/2) + 'px';
    ball.style.top = (textRect.top + textRect.height/2 - startSize/2) + 'px';
    ball.style.transform = 'scale(1) rotate(0deg)';
    document.body.appendChild(ball);

    // crumple: shrink + darken slightly
    requestAnimationFrame(()=>{
      ball.style.transition = 'width 0.28s ease, height 0.28s ease, left 0.28s ease, top 0.28s ease, transform 0.28s ease, background 0.28s ease';
      const crumpleSize = 22;
      ball.style.width = crumpleSize + 'px';
      ball.style.height = crumpleSize + 'px';
      ball.style.left = (textRect.left + textRect.width/2 - crumpleSize/2) + 'px';
      ball.style.top = (textRect.top + textRect.height/2 - crumpleSize/2) + 'px';
      ball.style.transform = 'rotate(160deg)';
      ball.style.background = '#d8cba9';
    });

    // arc toss into jar
    const targetX = jarRect.left + jarRect.width * 0.5 - 11;
    const targetY = jarRect.top + jarRect.height * 0.72 - 11;
    const startX = textRect.left + textRect.width/2 - 11;
    const startY = textRect.top + textRect.height/2 - 11;
    const peakX = (startX + targetX) / 2 + (Math.random()*40 - 20);
    const peakY = Math.min(startY, targetY) - 140;

    let t0 = null;
    const duration = 620;

    setTimeout(()=>{
      playWhoosh(0);
      function frame(ts){
        if (!t0) t0 = ts;
        const elapsed = ts - t0;
        const p = Math.min(elapsed / duration, 1);
        // quadratic bezier
        const x = (1-p)*(1-p)*startX + 2*(1-p)*p*peakX + p*p*targetX;
        const y = (1-p)*(1-p)*startY + 2*(1-p)*p*peakY + p*p*targetY;
        const scale = 1 - p*0.15;
        const rot = 160 + p * 380;
        ball.style.transition = 'none';
        ball.style.left = x + 'px';
        ball.style.top = y + 'px';
        ball.style.transform = `scale(${scale}) rotate(${rot}deg)`;
        ball.style.opacity = p > 0.92 ? String(1 - (p-0.92)/0.08) : '1';
        if (p < 1) {
          requestAnimationFrame(frame);
        } else {
          ball.remove();
          playThud(0);
          entries.push({ text: text, ts: Date.now() });
          save();
          renderBalls();
          updateUI();
          noteEl.value = '';
          noteEl.disabled = false;
          updateUI();
          showToast('Tossed. Let it go.');
        }
      }
      requestAnimationFrame(frame);
    }, 300);
  }

  /* ---------------- Empty-the-jar ritual ---------------- */
  function animateEmpty(){
    emptyBtn.disabled = true;
    getCtx();
    const jarRect = jarSvg.getBoundingClientRect();
    const n = entries.length;
    const shown = entries.slice(-12);

    shown.forEach((entry, i)=>{
      setTimeout(()=>{
        playFlutter(0);
        const scrap = document.createElement('div');
        scrap.className = 'scrap';
        const size = 16 + Math.random()*10;
        scrap.style.width = size + 'px';
        scrap.style.height = size + 'px';
        const startX = jarRect.left + jarRect.width*0.5 + (Math.random()*30-15);
        const startY = jarRect.top + jarRect.height*0.6;
        scrap.style.left = startX + 'px';
        scrap.style.top = startY + 'px';
        scrap.style.opacity = '0.95';
        document.body.appendChild(scrap);

        const dx = (Math.random()*260 - 130);
        const dy = 220 + Math.random()*120;
        const rot = Math.random()*720 - 360;

        requestAnimationFrame(()=>{
          scrap.style.transition = 'transform 0.9s cubic-bezier(.3,.6,.4,1), opacity 0.9s ease';
          scrap.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
          scrap.style.opacity = '0';
        });

        setTimeout(()=> scrap.remove(), 950);
      }, i * 55);
    });

    setTimeout(()=>{
      entries = [];
      save();
      renderBalls();
      updateUI();
      emptyBtn.disabled = true;
      playChime();
      showToast(n === 1 ? 'Jar emptied. One less thing.' : 'Jar emptied. Fresh start.');
    }, shown.length * 55 + 500);
  }
})();
