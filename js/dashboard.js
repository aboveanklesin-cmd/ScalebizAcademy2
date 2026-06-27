// ScaleBiz Academy — Dashboard Logic
// sb is initialised in js/supabase.js

const MODULES = [
  { id:'mod1', name:'KPIs & Marketing Funnels',      level:2, track:'performance', emoji:'📡' },
  { id:'mod2', name:'Meta Ads — Targeting & Creative', level:3, track:'performance', emoji:'📱' },
  { id:'mod3', name:'Google Ads & Attribution',       level:3, track:'performance', emoji:'🎯' },
  { id:'mod4', name:'ROAS Optimisation & Budgeting',  level:4, track:'influencer',  emoji:'💰' },
  { id:'mod5', name:'Influencer Tiers & Briefs',      level:4, track:'influencer',  emoji:'🤝' },
  { id:'mod6', name:'Viral Campaign Strategy',        level:5, track:'influencer',  emoji:'🔥' },
];

const LEVELS = [
  { id:1, name:'Rookie Marketer',  emoji:'🌱', requires:'free'        },
  { id:2, name:'Signal Spotter',   emoji:'📡', requires:'performance' },
  { id:3, name:'Campaign Builder', emoji:'⚙️', requires:'performance' },
  { id:4, name:'Growth Operator',  emoji:'🔥', requires:'influencer'  },
  { id:5, name:'Viral Architect',  emoji:'🧠', requires:'influencer'  },
  { id:6, name:'Digital Spidy',    emoji:'🕷️', requires:'both'        },
];

// ── Payment pending banner ────────────────────────────────────────
function showPaymentPendingBanner(courseKey) {
  const banner = document.createElement('div');
  banner.id = 'paymentBanner';
  banner.style.cssText = `background:#0F0E17;color:#C8F135;font-family:'Space Mono',monospace;font-size:0.75rem;padding:0.75rem 5%;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1.5px solid #3C3489;`;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span>✅</span>
      <span><strong style="color:#C8F135;">Payment received!</strong> &nbsp;You will receive a confirmation email with your class schedule and Zoom link once enrolled. Your levels will unlock shortly. Refresh after a few hours.</span>
    </div>
    <button onclick="document.getElementById('paymentBanner').remove()" style="background:none;border:1px solid #3C3489;color:#7F77DD;border-radius:20px;padding:3px 12px;cursor:pointer;font-family:'Space Mono',monospace;font-size:0.65rem;">Dismiss</button>`;
  const nav = document.querySelector('nav');
  if (nav) nav.insertAdjacentElement('afterend', banner);
}

// ── Razorpay Payment Links ────────────────────────────────────────
const PAYMENT_LINKS = {
  performance: 'https://rzp.io/rzp/VfHWmQUK',
  influencer:  'https://rzp.io/rzp/By4xdE1',
  both:        'https://rzp.io/rzp/kXgDYDK8',
};

async function startPayment(courseKey, studentId, name, email) {
  await sb.from('students').update({
    razorpay_order_id: 'pending_' + courseKey + '_' + Date.now()
  }).eq('id', studentId);
  // Show info message briefly before redirect
  const btn = event.target;
  const origText = btn.textContent;
  btn.textContent = 'Redirecting to payment...';
  btn.disabled = true;

  // Store what they're buying so we can show message on return
  sessionStorage.setItem('sb_pending_course', courseKey);

  window.location.href = PAYMENT_LINKS[courseKey];
}

// ── Main init ─────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/'; return; }

  document.getElementById('navEmail').textContent = session.user.email;

  // Detect return from Razorpay
  const urlParams = new URLSearchParams(window.location.search);
  const pendingCourse = sessionStorage.getItem('sb_pending_course');
  if (urlParams.has('razorpay_payment_id') || urlParams.has('razorpay_payment_link_id') || pendingCourse) {
    sessionStorage.removeItem('sb_pending_course');
    showPaymentPendingBanner(pendingCourse);
    window.history.replaceState({}, '', '/dashboard');
  }

  // Fetch student
  const { data: student, error } = await sb
    .from('students').select('*').eq('auth_id', session.user.id).single();
  if (error || !student) { window.location.href = '/'; return; }

  // Fetch badges, progress, attendance
  const { data: badges     } = await sb.from('badges').select('*').eq('student_id', student.id);
  const { data: progress   } = await sb.from('progress').select('*').eq('student_id', student.id);
  const { data: attendance } = await sb.from('attendance').select('*').eq('student_id', student.id);

  const earned     = (badges     || []).map(b => b.badge_name);
  const passed     = (progress   || []).filter(p => p.status === 'passed');
  const attended   = (attendance || []).map(a => a.module_id);
  const purchased  = student.payment_status || 'free';

  const hasPerf = ['perf_only','both'].includes(purchased);
  const hasInf  = ['inf_only','both'].includes(purchased);

  // Current level based on earned badges
  let currentLevel = 1;
  if      (earned.includes('Digital Spidy'))    currentLevel = 6;
  else if (earned.includes('Viral Architect'))  currentLevel = 5;
  else if (earned.includes('Growth Operator'))  currentLevel = 4;
  else if (earned.includes('Campaign Builder')) currentLevel = 3;
  else if (earned.includes('Signal Spotter'))   currentLevel = 2;

  // Auto-award Digital Spidy if all 5 levels done
  if (currentLevel < 6) {
    const allDone = ['Signal Spotter','Campaign Builder','Growth Operator','Viral Architect'].every(n => earned.includes(n));
    if (allDone && (hasPerf && hasInf)) {
      await sb.from('badges').upsert({ student_id: student.id, badge_name:'Digital Spidy', score:100 }, { onConflict:'student_id,badge_name' });
      earned.push('Digital Spidy');
      currentLevel = 6;
    }
  }

  const levelData  = LEVELS[currentLevel - 1];

  // ── Welcome banner ──────────────────────────────────────────────
  document.getElementById('wbName').textContent  = student.first_name + ' ' + student.last_name;
  document.getElementById('wbSub').textContent   = 'Track: ' + (purchased === 'both' ? 'Both tracks' : purchased === 'perf_only' ? 'Performance Marketing' : purchased === 'inf_only' ? 'Influencer Marketing' : 'No course yet');
  document.getElementById('wbLevel').textContent = levelData.emoji + ' ' + levelData.name;

  // ── Stats ───────────────────────────────────────────────────────
  const spidyPct = Math.round(((currentLevel - 1) / 5) * 100);
  document.getElementById('statBadges').textContent   = earned.length;
  document.getElementById('statLevel').textContent    = currentLevel + '/6';
  document.getElementById('statCourses').textContent  = purchased === 'both' ? 'Both' : purchased === 'perf_only' ? 'Perf.' : purchased === 'inf_only' ? 'Inf.' : 'None';
  document.getElementById('statSpidy').textContent    = spidyPct + '%';

  // ── Badge journey ───────────────────────────────────────────────
  const journeyCard = document.getElementById('journeyCard');
  journeyCard.innerHTML = '';

  LEVELS.forEach((lvl, idx) => {
    const isEarned  = earned.includes(lvl.name) || lvl.id === 1;
    const hasAccess = lvl.requires === 'free'
      || (lvl.requires === 'performance' && hasPerf)
      || (lvl.requires === 'influencer'  && hasInf)
      || (lvl.requires === 'both'        && hasPerf && hasInf);

    // Find if next module for this level has been attended
    const lvlModules   = MODULES.filter(m => m.level === lvl.id);
    const anyAttended  = lvlModules.some(m => attended.includes(m.id));
    const testPassed   = passed.some(p => p.challenge_name.includes(lvl.name));

    const iconClass  = isEarned ? 'done' : hasAccess && anyAttended ? 'current' : hasAccess ? 'current' : 'locked';
    let statusText   = 'locked';
    let statusClass  = 'locked';

    if (isEarned)                          { statusText = 'complete';         statusClass = 'done';    }
    else if (!hasAccess && lvl.requires === 'performance') { statusText = 'buy perf. course'; statusClass = 'locked'; }
    else if (!hasAccess && lvl.requires === 'influencer')  { statusText = 'buy inf. course';  statusClass = 'locked'; }
    else if (!hasAccess && lvl.requires === 'both')        { statusText = 'buy both courses'; statusClass = 'locked'; }
    else if (hasAccess && anyAttended && !testPassed)      { statusText = 'test ready ✨';    statusClass = 'test';   }
    else if (hasAccess && !anyAttended)                    { statusText = 'attend class';      statusClass = 'attend'; }

    const scoreData = (progress || []).find(p => p.challenge_name.includes(lvl.name) && p.status === 'passed');

    const item = document.createElement('div');
    item.className = 'journey-item';
    item.innerHTML = `
      <div class="ji-icon ${iconClass}">${lvl.emoji}</div>
      <div style="flex:1;">
        <div class="ji-name">${lvl.name}</div>
        <div class="ji-sub">level 0${lvl.id}${scoreData ? ' · scored ' + scoreData.score + '%' : ''}</div>
      </div>
      <div class="ji-status ${statusClass}">${statusText}</div>`;
    journeyCard.appendChild(item);

    if (idx < LEVELS.length - 1) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:rgba(0,0,0,0.06);';
      journeyCard.appendChild(sep);
    }
  });

  // Progress bar
  const pct = Math.round(((currentLevel - 1) / 5) * 100);
  const pw  = document.createElement('div');
  pw.className = 'progress-wrap';
  pw.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-label"><span>${currentLevel} / 6 levels</span><span>${pct}%</span></div>`;
  journeyCard.appendChild(pw);

  // ── Module progress card ─────────────────────────────────────────
  const modCard = document.getElementById('moduleCard');
  modCard.innerHTML = '';

  const visibleMods = MODULES.filter(m => {
    if (m.track === 'performance' && !hasPerf) return false;
    if (m.track === 'influencer'  && !hasInf)  return false;
    return true;
  });

  if (visibleMods.length === 0) {
    modCard.innerHTML = '<div style="font-size:0.82rem;color:var(--muted);text-align:center;padding:1rem 0;">Purchase a course to see your modules here.</div>';
  } else {
    visibleMods.forEach(mod => {
      const isAttended = attended.includes(mod.id);
      const modPassed  = passed.some(p => p.challenge_name.includes(mod.name));
      const statusText  = modPassed ? '✓ test passed' : isAttended ? 'test ready ✨' : 'attend class';
      const statusClass = modPassed ? 'done'    : isAttended ? 'ready'         : 'locked';

      const div = document.createElement('div');
      div.className = 'mod-item';
      div.innerHTML = `
        <div class="mod-emoji">${mod.emoji}</div>
        <div class="mod-body">
          <div class="mod-name">${mod.name}</div>
          <div class="mod-track">${mod.track === 'performance' ? 'Performance Marketing' : 'Influencer Marketing'}</div>
        </div>
        <div class="mod-status ${statusClass}">${statusText}</div>`;
      modCard.appendChild(div);
    });
  }

  // ── Active test section ──────────────────────────────────────────
  const activeSection = document.getElementById('activeSection');
  const activeCard    = document.getElementById('activeCard');

  // Find the next test the student can take (attended but not yet passed)
  const nextTest = findNextTest(attended, passed, hasPerf, hasInf, earned);
  if (nextTest) {
    activeSection.style.display = 'block';
    activeCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="font-size:2rem;flex-shrink:0;">${nextTest.emoji}</div>
        <div style="flex:1;">
          <div class="active-title">${nextTest.title}</div>
          <div class="active-sub">15 questions · 20 minutes · score 70%+ to earn your badge</div>
        </div>
        <a href="/test?level=${nextTest.level}" class="active-btn">Take test →</a>
      </div>`;
  }

  // ── Purchase section ─────────────────────────────────────────────
  const purchaseSection = document.getElementById('purchaseSection');
  const purchaseCards   = document.getElementById('purchaseCards');
  purchaseCards.innerHTML = '';

  if (purchased === 'both') {
    purchaseSection.style.display = 'none';
  } else {
    const COURSES = {
      performance: { name:'Performance Marketing', price:'₹1,000', unlocks:'Unlocks Levels 2 & 3', key:'performance' },
      influencer:  { name:'Influencer Marketing',  price:'₹1,200', unlocks:'Unlocks Levels 4 & 5', key:'influencer'  },
      both:        { name:'Both Tracks 🏆',         price:'₹1,500', unlocks:'All levels · Save ₹700', key:'both', featured:true },
    };
    const toShow = [];
    if (!hasPerf) toShow.push('performance');
    if (!hasInf)  toShow.push('influencer');
    toShow.push('both');

    toShow.forEach(key => {
      const c   = COURSES[key];
      const div = document.createElement('div');
      div.className = 'purchase-card' + (c.featured ? ' featured' : '');
      div.innerHTML = `
        <div>
          <div class="pc-name">${c.name}</div>
          <div class="pc-unlocks">${c.unlocks}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
          <div class="pc-price">${c.price}</div>
          <button class="pc-btn" onclick="startPayment('${c.key}','${student.id}','${student.first_name} ${student.last_name}','${session.user.email}')">Buy now →</button>
        </div>`;
      purchaseCards.appendChild(div);
    });
  }

  // ── Spidy progress ───────────────────────────────────────────────
  document.getElementById('spidyFill').style.width  = spidyPct + '%';
  document.getElementById('spidyLabel').textContent = (currentLevel - 1) + ' / 5 levels complete';

  if (currentLevel === 6) {
    document.getElementById('spidyTease').innerHTML = `
      <div class="st-spider">🕷️</div>
      <div class="st-title" style="color:var(--lime);">You are a Digital Spidy!</div>
      <div class="st-sub">Top 3%. Both tracks mastered. All levels complete. You weave the whole web.</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
        <button onclick="shareSpidy('${student.first_name}')" class="active-btn">Share on LinkedIn →</button>
      </div>`;
  }

  // ── Badges grid ──────────────────────────────────────────────────
  const ALL_BADGES = [
    {name:'Rookie Marketer',emoji:'🌱'},{name:'Signal Spotter',emoji:'📡'},
    {name:'Campaign Builder',emoji:'⚙️'},{name:'Growth Operator',emoji:'🔥'},
    {name:'Viral Architect',emoji:'🧠'},{name:'Digital Spidy',emoji:'🕷️'},
    {name:'KPI Decoder',emoji:'📊'},{name:'ROAS Cracker',emoji:'💰'},
    {name:'Meta Ads Master',emoji:'📱'},{name:'Collab Closer',emoji:'🤝'},
    {name:'Viral Strategist',emoji:'🌊'},{name:'Attribution Master',emoji:'📈'},
  ];
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = '';
  ALL_BADGES.forEach(b => {
    const isEarned = earned.includes(b.name);
    const div = document.createElement('div');
    div.className = 'badge-item' + (isEarned ? '' : ' locked');
    div.innerHTML = `<div class="badge-emoji">${b.emoji}</div><div class="badge-name">${b.name}</div><div class="badge-score">${isEarned ? '✓ earned' : 'locked'}</div>`;
    grid.appendChild(div);
  });

  // Show dashboard
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('dashMain').style.display      = 'block';
}

// ── Find next available test ──────────────────────────────────────
function findNextTest(attended, passed, hasPerf, hasInf, earned) {
  const tests = [
    { level:2, title:'Signal Spotter Test',   emoji:'📡', moduleId:'mod1', badge:'Signal Spotter',   requires:'performance' },
    { level:3, title:'Campaign Builder Test',  emoji:'⚙️', moduleId:'mod2', badge:'Campaign Builder', requires:'performance' },
    { level:4, title:'Growth Operator Test',   emoji:'🔥', moduleId:'mod4', badge:'Growth Operator',  requires:'influencer'  },
    { level:5, title:'Viral Architect Test',   emoji:'🧠', moduleId:'mod6', badge:'Viral Architect',  requires:'influencer'  },
  ];

  for (const t of tests) {
    const hasAccess    = (t.requires === 'performance' && hasPerf) || (t.requires === 'influencer' && hasInf);
    const isAttended   = attended.includes(t.moduleId);
    const alreadyEarned = earned.includes(t.badge);
    if (hasAccess && isAttended && !alreadyEarned) return t;
  }
  return null;
}

// ── LinkedIn share ────────────────────────────────────────────────
function shareSpidy(firstName) {
  const text = encodeURIComponent(`I just became a Digital Spidy on ScaleBiz Academy — the top 3% badge for mastering Performance + Influencer Marketing.\n\nLive classes + scored tests. Not just a certificate.\n\nscalebizacademy.com\n\n#DigitalSpidy #ScaleBizAcademy #PerformanceMarketing`);
  window.open(`https://www.linkedin.com/shareArticle?mini=true&url=https://scalebizacademy.com&summary=${text}`, '_blank');
}

// ── Logout ────────────────────────────────────────────────────────
async function logout() {
  await sb.auth.signOut();
  window.location.href = '/';
}

init();
