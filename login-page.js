const loginRoot = $('#login-screen');
const learningShell = $('.shell');
let restoringLogin = false;
let loginNotice = '';
let submittingEntry = false;
let loginMotionControl;
let entryFlow = null;
let shownEntryFlow;

const entryPacketPath = 'M 90 205 H 156 Q 182 205 200 185 L 239 145 Q 253 130 280 130 Q 307 130 321 145 L 360 185 Q 378 205 404 205 H 470';
const entryIcons = {
  brand: '<path d="m12 2 10 10-10 10L2 12Z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><circle cx="12" cy="2" r="1.4" fill="#f6c784" stroke="none"/><circle cx="12" cy="22" r="1.4" fill="#f6c784" stroke="none"/>',
  arrow: '<path d="M20 12H4m6 6-6-6 6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 11 7-11 7z"/>'
};

function entryIcon(icon) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${entryIcons[icon]}</svg>`;
}

function entryDiagram() {
  return `<svg class="entry-network" viewBox="0 0 560 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="entry-node-fill" x2="0%" y2="100%">
        <stop stop-color="#20304c"/><stop offset="1" stop-color="#0b1729"/>
      </linearGradient>
      <radialGradient id="entry-halo">
        <stop stop-color="#8194d7" stop-opacity=".19"/><stop offset="1" stop-color="#8194d7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="280" cy="139" rx="239" ry="132" fill="url(#entry-halo)"/>
    <g class="entry-schematic" fill="none">
      <ellipse cx="280" cy="139" rx="214" ry="87"/>
      <ellipse cx="280" cy="139" rx="168" ry="66"/>
      <path d="M22 125H87l29-27h50m228-23h55l35 37h54M22 245h39m441 0h36M280 24v48"/>
      <circle cx="116" cy="98" r="3"/><circle cx="449" cy="75" r="3"/><circle cx="280" cy="24" r="3"/>
    </g>
    <path class="entry-track-frame" d="${entryPacketPath}"/>
    <path class="entry-track" d="${entryPacketPath}"/>
    ${packetPulse(entryPacketPath,{duration:2.9,style:'entry-packet entry-request-packet'})}
    ${packetPulse(entryPacketPath,{duration:2.9,reverse:true,style:'entry-packet entry-reply-packet'})}
    <g class="entry-flow-arrows" fill="none" transform="translate(151 205)"><path d="m-3-5 5 5-5 5"/></g>
    <g class="entry-flow-arrows" fill="none" transform="translate(409 205)"><path d="m-3-5 5 5-5 5"/></g>
    <g transform="translate(90 205)">
      <g class="entry-station entry-station--client">
        <rect class="entry-station-light" x="-41" y="-41" width="82" height="82" rx="22"/>
        <rect class="entry-station-body" x="-32" y="-32" width="64" height="64" rx="17"/>
        <path class="entry-station-icon" d="M-17 10h34m-30-4V-10a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2V6Z"/>
      </g>
      <text class="entry-station-name" y="57">Client</text>
    </g>
    <g transform="translate(280 130)">
      <g class="entry-station entry-station--router">
        <rect class="entry-station-light" x="-41" y="-41" width="82" height="82" rx="22"/>
        <rect class="entry-station-body" x="-32" y="-32" width="64" height="64" rx="17"/>
        <path class="entry-station-icon" d="M-15-6h30m-25-5-5 5 5 5M15 6h-30m25-5 5 5-5 5"/>
      </g>
      <text class="entry-station-name" y="57">Router</text>
    </g>
    <g transform="translate(470 205)">
      <g class="entry-station entry-station--server">
        <rect class="entry-station-light" x="-41" y="-41" width="82" height="82" rx="22"/>
        <rect class="entry-station-body" x="-32" y="-32" width="64" height="64" rx="17"/>
        <path class="entry-station-icon" d="M-15-13h30v11h-30zm0 15h30v11h-30zm6-10h1m-1 15h1"/>
      </g>
      <text class="entry-station-name" y="57">Server</text>
    </g>
  </svg>`;
}

function entryForm() {
  const mode = entryFlow?.mode;
  if (!mode) return `<form id="entry-form" method="post">
    <label for="entry-email">البريد الإلكتروني</label>
    <input id="entry-email" type="email" name="email" dir="ltr" autocomplete="username" required placeholder="name@example.com" autocapitalize="none" spellcheck="false">
    <label for="entry-password">كلمة المرور</label>
    <div class="entry-password">
      <input id="entry-password" type="password" name="password" dir="ltr" autocomplete="current-password" required>
      <button type="button" id="password-visibility" aria-label="إظهار كلمة المرور" aria-pressed="false">إظهار</button>
    </div>
    <p id="login-status" role="status">${esc(restoringLogin ? 'جارٍ التحقق من جلستك…' : loginNotice)}</p>
    <button id="login-submit" class="entry-submit" ${restoringLogin ? 'disabled' : ''}><span>دخول إلى مَدار</span>${entryIcon('arrow')}</button>
  </form>`;

  const enrollment = entryFlow.enrollment;
  const qr = enrollment?.qr;
  const details = enrollment ? `<div class="entry-factor">
    <p>امسح الرمز بتطبيق المصادقة، أو أدخل مفتاح الإعداد يدويًا من جهازك.</p>
    ${qr? `<img src="${esc(qr)}" width="180" height="180" alt="رمز QR لتطبيق المصادقة">` : ''}
    <details><summary>عرض مفتاح الإعداد</summary><code dir="ltr">${esc(enrollment.secret)}</code></details>
  </div>` : '';
  const help = mode==='setup'?'اربط حسابك بتطبيق المصادقة على هاتفك لفتح الدروس.'
    : mode==='switch'?'جلسة دراستك على جهاز آخر. انقلها إلى هذا الجهاز لمواصلة الدراسة.'
    : mode==='resume'?'تم التحقق من حسابك. يمكنك إعادة محاولة فتح الدروس.'
    : 'أدخل الرمز المتغيّر الذي يظهر في تطبيق المصادقة.';
  const label = mode==='setup'?'ربط تطبيق المصادقة':mode==='switch'?'نقل جلسة الدراسة إلى هنا'
    : mode==='resume'?'افتح الدروس':'تحقّق وافتح الدروس';
  return `<form id="entry-form" method="post">
    <p>${help}</p>${details}
    ${mode==='code'?`<label for="entry-code">رمز المصادقة</label>
      <input id="entry-code" type="text" name="code" dir="ltr" inputmode="numeric"
        autocomplete="one-time-code" pattern="[0-9٠-٩۰-۹]{6}" maxlength="6" required>`:''}
    <p id="login-status" role="status">${esc(loginNotice)}</p>
    <button id="login-submit" class="entry-submit"><span>${label}</span>${entryIcon('arrow')}</button>
    <button type="button" id="entry-cancel" class="entry-control">الرجوع إلى تسجيل الدخول</button>
  </form>`;
}

async function prepareEntryFactor(token) {
  const user = await api('/auth/v1/user',{token});
  const factor = user.factors?.find(item=>item.status==='verified' && item.factor_type==='totp');
  entryFlow = factor ? {mode:'code',factorId:factor.id} : {mode:'setup'};
}

async function enrollEntryFactor() {
  const factor = await api('/auth/v1/factors',{
    token:await accessToken(),method:'POST',body:JSON.stringify({factor_type:'totp',issuer:'Madar'})
  });
  const qrCode = factor.totp?.qr_code?.trim() || '';
  const qr = /<svg(?=[\s>])/.test(qrCode)?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrCode)
    : qrCode.startsWith('data:image/svg+xml')?qrCode:'';
  entryFlow = {mode:'code',factorId:factor.id,enrollment:{qr,secret:factor.totp.secret}};
}

async function verifyEntryFactor(code) {
  const token = await accessToken();
  const path = '/auth/v1/factors/'+encodeURIComponent(entryFlow.factorId);
  const options = {token,method:'POST'};
  const challenge = await api(path+'/challenge',{...options,body:'{}'});
  const verified = await api(path+'/verify',{
    ...options,body:JSON.stringify({challenge_id:challenge.id,code})
  });
  if (!verified.access_token || sessionAssurance(verified.access_token)!=='aal2') {
    throw new Error('The verification did not upgrade the session.');
  }
  const user = verified.user ?? session.user;
  setSession({...verified,user,expires_at:verified.expires_at ?? Math.floor(Date.now()/1000)+verified.expires_in});
  entryFlow = {mode:'resume'};
  await openAuthenticatedCourse();
}

function showAccessScreen() {
  learningShell.hidden = !cloudReady;
  loginRoot.hidden = cloudReady;
  if (cloudReady) {
    loginMotionControl = undefined;
    loginRoot.replaceChildren();
    document.title = 'مَدار | الشهر الأول';
    return true;
  }
  app.replaceChildren();
  document.title = 'مَدار | تسجيل الدخول';
  if ($('#entry-form') && shownEntryFlow===entryFlow) {
    if (submittingEntry) return false;
    const status = $('#login-status');
    status.textContent = restoringLogin ? 'جارٍ التحقق من جلستك…' : loginNotice;
    $('#login-submit').disabled = restoringLogin;
    return false;
  }
  shownEntryFlow = entryFlow;
  loginRoot.innerHTML = `<div class="entry-grid">
    <section class="entry-form-card" aria-labelledby="entry-title">
      <div class="entry-brand"><span class="entry-brand-mark">${entryIcon('brand')}</span> مَدار</div>
      <h1 id="entry-title">${entryFlow?.mode==='switch'?'جلسة الدراسة':entryFlow?'التحقق بخطوتين':'تسجيل الدخول'}</h1>
      ${entryForm()}
      <p class="entry-account-hint">${entryIcon('lock')} الدخول بحساب الطالب الذي وفّرته إدارة المنصة.</p>
    </section>
    <section class="entry-preview" aria-labelledby="entry-preview-title" data-direction="request">
      <div class="entry-preview-heading">
        <h2 id="entry-preview-title">كيف تتحرّك الحزمة؟</h2>
        <button type="button" class="entry-control entry-motion" id="entry-motion"></button>
      </div>
      <div class="entry-plot">
        ${entryDiagram()}
      </div>
      <div class="entry-transport">
        <div class="entry-choices" role="group" aria-label="اتجاه الحزمة">
          <button type="button" class="entry-choice" data-entry-direction="request" aria-pressed="true">الطلب</button>
          <button type="button" class="entry-choice" data-entry-direction="reply" aria-pressed="false">الرد</button>
        </div>
        <p id="entry-path" aria-live="polite"><bdi>Client</bdi> يرسل طلبًا إلى <bdi>Server</bdi> عبر <bdi>Router</bdi>.</p>
      </div>
    </section>
  </div>`;
  $('#password-visibility')?.addEventListener('click',event => {
    const button = event.currentTarget;
    const field = $('#entry-password');
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'إخفاء' : 'إظهار';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  });
  $('#entry-cancel')?.addEventListener('click',()=>{void logOutOfMadar();});

  const preview = $('.entry-preview');
  const motion = $('#entry-motion');
  const updatePreviewControl = () => {
    const paused = preview.classList.contains('entry-paused') || document.documentElement.classList.contains('motion-paused');
    motion.innerHTML = entryIcon(paused ? 'play' : 'pause');
    const label = paused ? 'تشغيل حركة الحزمة' : 'إيقاف حركة الحزمة';
    motion.title = label;
    motion.setAttribute('aria-label',label);
  };
  motion.onclick = () => {
    if (document.documentElement.classList.contains('motion-paused')) {
      displayPreferences.motion = 'on';
      saveDisplayPreferences();
      preview.classList.remove('entry-paused');
    } else preview.classList.toggle('entry-paused');
    updatePreviewControl();
  };
  updatePreviewControl();
  loginMotionControl = updatePreviewControl;
  const directionButtons = preview.querySelectorAll('[data-entry-direction]');
  directionButtons.forEach(button => {
    button.onclick = () => {
      const direction = button.dataset.entryDirection;
      if (preview.dataset.direction === direction) return;
      preview.dataset.direction = direction;
      directionButtons.forEach(choice => {
        choice.setAttribute('aria-pressed', String(choice === button));
      });
      $('#entry-path').innerHTML = direction === 'reply'
        ? '<bdi>Server</bdi> يرسل الرد إلى <bdi>Client</bdi> عبر <bdi>Router</bdi> في هذا المثال.'
        : '<bdi>Client</bdi> يرسل طلبًا إلى <bdi>Server</bdi> عبر <bdi>Router</bdi>.';
    };
  });
  $('#entry-form').onsubmit = submitEntry;
  return false;
}

document.addEventListener('madar-display',() => {
  if ($('#entry-motion')) loginMotionControl?.();
});

function entryFailureMessage(error, restoring = false) {
  if (readingMessages[error.code]) return readingMessages[error.code];
  if (error.status===429) return 'محاولات متكررة. انتظر قليلًا ثم أعد المحاولة.';
  if (error.status===400 || error.status===401) return restoring
    ? 'انتهت الجلسة. سجّل الدخول من جديد.'
    : 'تعذر الدخول. تحقق من البريد وكلمة المرور وتأكيد حساب الطالب.';
  return 'تعذر الاتصال أو فتح الدروس. حاول مجددًا.';
}

async function submitEntry(event) {
  event.preventDefault();
  const button = $('#login-submit');
  if (button.disabled) return;
  submittingEntry = true;
  const fields = new FormData(event.currentTarget);
  const status = $('#login-status');
  const label = button.querySelector('span');
  const actionLabel = label.textContent;
  const mode = entryFlow?.mode;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = 'جارٍ التحقق…';
  status.textContent = 'جارٍ التحقق من حسابك…';
  try {
    await queueCloud(async () => {
      if (mode==='switch') return openAuthenticatedCourse(true);
      if (mode==='resume') return openAuthenticatedCourse();
      if (mode==='setup') return enrollEntryFactor();
      if (mode==='code') {
        const code = fields.get('code').replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)%16));
        return verifyEntryFactor(code);
      }
      const authenticated = await api('/auth/v1/token?grant_type=password', {
        method:'POST',
        body:JSON.stringify({email:fields.get('email').trim(),password:fields.get('password')})
      });
      setSession(authenticated);
      await openAuthenticatedCourse();
    });
    loginNotice = '';
  } catch (error) {
    if (!mode || error.code==='no_access' || error.status===401) clearCloudSession();
    loginNotice = mode==='code' && entryFlow?.mode==='code' && error.status===400
      ? 'تعذّر تأكيد الرمز. استخدم الرمز الحالي من تطبيق المصادقة.'
      : entryFailureMessage(error);
  } finally {
    submittingEntry = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    label.textContent = actionLabel;
    render();
  }
}
