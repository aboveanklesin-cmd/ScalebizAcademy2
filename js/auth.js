// ScaleBiz Academy — Auth & Modal Logic

// sb is initialised in js/supabase.js

  // ─── Modal helpers ───────────────────────────────────────────────
  function openModal(){
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow='hidden';
  }
  function closeModal(redirect){
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow='';
    if(redirect){ window.location.href='/dashboard'; return; }
    setTimeout(()=>goToStep(1),300);
  }
  function handleOverlayClick(e){
    if(e.target===document.getElementById('modalOverlay')) closeModal();
  }

  // ─── Step navigation ─────────────────────────────────────────────
  let currentStep = 1;
  function goToStep(n){
    document.querySelectorAll('.modal-step').forEach(s=>s.classList.remove('active'));
    document.getElementById('step'+n).classList.add('active');
    currentStep = n;
    updateDots(n);
  }
  function updateDots(n){
    for(let i=1;i<=3;i++){
      const d = document.getElementById('dot'+i);
      if(!d) continue;
      d.classList.remove('done','current');
      if(i<n) d.classList.add('done');
      else if(i===n) d.classList.add('current');
    }
    for(let i=1;i<=2;i++){
      const l = document.getElementById('line'+i);
      if(l) l.classList.toggle('done', i<n);
    }
    document.getElementById('stepIndicator').style.display = n===4 ? 'none' : 'flex';
  }

  // ─── OTP input helpers ───────────────────────────────────────────
  function otpNext(el, nextId){
    // Only allow digits
    el.value = el.value.replace(/[^0-9]/g,'');
    if(el.value.length===1 && nextId) document.getElementById(nextId).focus();
  }
  function otpBack(e, el, prevId){
    if(e.key==='Backspace' && !el.value && prevId) document.getElementById(prevId).focus();
  }

  // ─── STEP 1: Send OTP via Supabase ───────────────────────────────
  async function sendOTP(){
    const email = document.getElementById('emailInput').value.trim().toLowerCase();

    // Basic validation
    if(!email || !email.includes('@') || !email.includes('.')){
      showError('step1error', 'Please enter a valid email address.');
      return;
    }

    // Show loading state
    setLoading('sendOtpBtn', true, 'Sending...');
    clearError('step1error');

    try {
      const { error } = await sb.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined  // forces OTP code, not magic link
        }
      });

      if(error) throw error;

      // Success — move to OTP step
      document.getElementById('otpSubtext').textContent =
        `We sent a 6-digit code to ${email}. Check your inbox — it arrives in under a minute.`;
      goToStep(2);
      setTimeout(()=>document.getElementById('otp1').focus(), 100);

    } catch(err) {
      showError('step1error', 'Could not send OTP. Please try again. (' + err.message + ')');
    } finally {
      setLoading('sendOtpBtn', false, 'Send OTP →');
    }
  }

  // ─── Resend OTP ──────────────────────────────────────────────────
  async function resendOTP(){
    ['otp1','otp2','otp3','otp4','otp5','otp6'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.value='';
    });
    clearError('step2error');
    const email = document.getElementById('emailInput').value.trim().toLowerCase();
    try {
      await sb.auth.signInWithOtp({ email });
      showSuccess('step2error', 'A new code is on its way. Check your inbox.');
    } catch(err) {
      showError('step2error', 'Could not resend. Please wait a moment and try again.');
    }
    document.getElementById('otp1').focus();
  }

  // ─── STEP 2: Verify OTP via Supabase ─────────────────────────────
  async function verifyOTP(){
    const email = document.getElementById('emailInput').value.trim().toLowerCase();
    const code  = ['otp1','otp2','otp3','otp4','otp5','otp6']
                    .map(id => document.getElementById(id).value).join('');

    if(code.length < 6){
      showError('step2error', 'Please enter the full 6-digit code.');
      return;
    }

    setLoading('verifyOtpBtn', true, 'Verifying...');
    clearError('step2error');

    try {
      const { data, error } = await sb.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      });

      if(error) throw error;

      // Check if student profile already exists
      const { data: existing } = await sb
        .from('students')
        .select('id, first_name')
        .eq('auth_id', data.user.id)
        .single();

      if(existing){
        // Returning student — skip registration, go to success
        document.getElementById('successName').textContent = existing.first_name;
        goToStep(4);
      } else {
        // New student — go to registration
        goToStep(3);
      }

    } catch(err) {
      showError('step2error', 'Incorrect code. Please check your email and try again.');
      // Clear boxes for retry
      ['otp1','otp2','otp3','otp4','otp5','otp6'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.value='';
      });
      document.getElementById('otp1').focus();
    } finally {
      setLoading('verifyOtpBtn', false, 'Verify & continue →');
    }
  }

  // ─── Track selection ─────────────────────────────────────────────
  let selectedTrack = null;
  function selectTrack(id){
    ['tp1','tp2','tp3'].forEach(t=>document.getElementById(t).classList.remove('selected'));
    document.getElementById(id).classList.add('selected');
    const map = { tp1:'performance', tp2:'influencer', tp3:'both' };
    selectedTrack = map[id];
  }

  // ─── STEP 3: Save registration to Supabase ────────────────────────
  async function completeRegistration(){
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const role  = document.getElementById('role').value;

    if(!fname){ showError('step3error','Please enter your first name.'); return; }
    if(!lname){ showError('step3error','Please enter your last name.'); return; }
    if(!role) { showError('step3error','Please select your role.'); return; }
    if(!selectedTrack){ showError('step3error','Please choose a track.'); return; }

    setLoading('registerBtn', true, 'Setting up your profile...');
    clearError('step3error');

    try {
      // Get current logged-in user
      const { data: { user } } = await sb.auth.getUser();
      if(!user) throw new Error('Session expired. Please log in again.');

      // Generate a username from name
      const base = (fname + lname).toLowerCase().replace(/[^a-z0-9]/g,'');
      const username = base + Math.floor(Math.random()*999);

      // Insert into students table
      const { error } = await sb.from('students').insert({
        auth_id:      user.id,
        first_name:   fname,
        last_name:    lname,
        email:        user.email,
        role:         role,
        track:        selectedTrack,
        username:     username,
        current_level: 1
      });

      if(error) throw error;

      // Rookie Marketer badge is awarded after attending the first FREE class
      // (handled in admin.html when marking attendance for the intro module)

      document.getElementById('successName').textContent = fname;
      goToStep(4);

    } catch(err) {
      showError('step3error', 'Something went wrong: ' + err.message);
    } finally {
      setLoading('registerBtn', false, 'Start my journey →');
    }
  }

  // ─── UI helpers ──────────────────────────────────────────────────
  function setLoading(btnId, loading, text){
    const btn = document.getElementById(btnId);
    if(!btn) return;
    btn.disabled = loading;
    btn.textContent = text;
    btn.style.opacity = loading ? '0.6' : '1';
  }
  function showError(elId, msg){
    const el = document.getElementById(elId);
    if(!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = 'var(--coral)';
    el.style.background = '#FF5C3A11';
    el.style.borderColor = '#FF5C3A44';
  }
  function showSuccess(elId, msg){
    const el = document.getElementById(elId);
    if(!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = '#085041';
    el.style.background = '#E1F5EE';
    el.style.borderColor = '#B2DFD0';
  }
  function clearError(elId){
    const el = document.getElementById(elId);
    if(!el) return;
    el.style.display = 'none';
    el.textContent = '';
  }

  // ─── On page load: check if already logged in ────────────────────
  window.addEventListener('load', async ()=>{
    const { data: { session } } = await sb.auth.getSession();
    if(session){
      // Already logged in — update nav CTA
      const cta = document.querySelector('.nav-cta');
      if(cta){
        cta.textContent = 'My Dashboard →';
        cta.onclick = ()=> window.location.href = '/dashboard';
      }
    }
  });

  // ── FIX 9: Track CTA buttons check login state ──────────────────
  async function handleTrackCTA() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      window.location.href = '/dashboard';
    } else {
      openModal();
    }
  }
