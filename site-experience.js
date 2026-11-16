const preferencesKey = 'madar-display-v1';
const defaultDisplay = {motion:'system', text:'normal', reading:'comfortable'};
let displayPreferences = {...defaultDisplay};
try {
  const saved = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
  if (saved && ['system','on','off'].includes(saved.motion)) displayPreferences.motion = saved.motion;
  if (saved && ['normal','large','largest'].includes(saved.text)) displayPreferences.text = saved.text;
  if (saved && ['comfortable','wide'].includes(saved.reading)) displayPreferences.reading = saved.reading;
} catch {}

const deviceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function applyDisplayPreferences() {
  const root = document.documentElement;
  root.classList.toggle('motion-paused',displayPreferences.motion === 'off' ||
    (displayPreferences.motion === 'system' && deviceMotion.matches));
  root.classList.toggle('motion-enabled',displayPreferences.motion === 'on');
  root.dataset.readerText = displayPreferences.text;
  root.dataset.readerWidth = displayPreferences.reading;
  document.dispatchEvent(new Event('madar-display'));
}
applyDisplayPreferences();
if (deviceMotion.addEventListener) deviceMotion.addEventListener('change',applyDisplayPreferences);
else deviceMotion.addListener(applyDisplayPreferences);

function saveDisplayPreferences() {
  applyDisplayPreferences();
  try {localStorage.setItem(preferencesKey,JSON.stringify(displayPreferences));} catch {}
}

function madarSettings() {
  return `<div class="settings-page">
    <section class="settings-card" aria-labelledby="settings-account-title">
      <header class="settings-heading">
        ${madarGlyph('account','settings-icon')}
        <div><h2 id="settings-account-title">الحساب</h2>
          <p><bdi dir="ltr">${esc(session.user.email)}</bdi></p>
        </div>
      </header>
      <div class="settings-sync">
        <div><h3>حفظ التقدم</h3><p id="settings-sync" role="status">${esc($('#sync-status').textContent)}</p></div>
        <button type="button" id="cloud-retry" class="ghost">مزامنة الآن</button>
      </div>
      <details class="settings-password">
        <summary>تغيير كلمة المرور</summary>
        <form id="settings-password-form" method="post">
          <input type="email" name="username" autocomplete="username" value="${esc(session.user.email)}" hidden>
          <label for="settings-current-password">كلمة المرور الحالية</label>
          <input class="input" id="settings-current-password" name="current" type="password" dir="ltr" autocomplete="current-password" required>
          <label for="settings-new-password">كلمة المرور الجديدة</label>
          <input class="input" id="settings-new-password" name="password" type="password" dir="ltr" autocomplete="new-password" required>
          <label for="settings-confirm-password">أعد كتابة كلمة المرور الجديدة</label>
          <input class="input" id="settings-confirm-password" name="confirmation" type="password" dir="ltr" autocomplete="new-password" required>
          <button class="button" type="submit">احفظ كلمة المرور</button>
          <p id="settings-password-status" role="status"></p>
        </form>
      </details>
      <div class="settings-footer">
        <button type="button" class="ghost settings-signout" id="logout">تسجيل الخروج</button>
        <p id="account-message" role="status"></p>
      </div>
    </section>
    <section class="settings-card" aria-labelledby="settings-display-title">
      <header class="settings-heading">
        ${madarGlyph('settings','settings-icon')}
        <div><h2 id="settings-display-title">القراءة والحركة</h2><p>تُحفظ هذه التفضيلات على هذا الجهاز.</p></div>
      </header>
      <div class="settings-controls">
        <label for="settings-text"><strong>حجم نص الدرس</strong></label>
        <select id="settings-text" data-setting="text"><option value="normal">عادي</option><option value="large">كبير</option><option value="largest">أكبر</option></select>
        <label for="settings-reading"><strong>عرض صفحة القراءة</strong><small>للشاشات الكبيرة</small></label>
        <select id="settings-reading" data-setting="reading"><option value="comfortable">عرض مريح</option><option value="wide">عرض واسع</option></select>
        <label for="settings-motion"><strong>الحركة</strong></label>
        <select id="settings-motion" data-setting="motion"><option value="system">حسب إعداد الجهاز</option><option value="on">تشغيل الرسوم التعليمية</option><option value="off">تقليل الحركة</option></select>
      </div>
      <figure class="settings-sample">
        <figcaption>معاينة حجم النص</figcaption>
        <p>يختار <bdi>Router</bdi> المسار التالي من عنوان <bdi>IP</bdi> للوجهة.</p>
      </figure>
      <div class="settings-footer">
        <button type="button" id="settings-reset" class="ghost">استعادة الافتراضي</button>
      </div>
    </section>
  </div>`;
}

function bindMadarSettings() {
  const fields = [...app.querySelectorAll('[data-setting]')];
  fields.forEach(field => {
    field.value = displayPreferences[field.dataset.setting];
    field.onchange = () => {displayPreferences[field.dataset.setting] = field.value;saveDisplayPreferences();};
  });
  $('#settings-reset').onclick = () => {
    displayPreferences = {...defaultDisplay};
    saveDisplayPreferences();
    fields.forEach(field=>{field.value = displayPreferences[field.dataset.setting];});
  };

  const sync = $('#cloud-retry');
  const logout = $('#logout');
  const message = $('#account-message');
  sync.onclick = async () => {
    sync.disabled = logout.disabled = true;
    message.textContent = '';
    try {
      await syncAccountProgress();
      message.textContent = 'تقدم حسابك محدّث.';
    } catch {
      message.textContent = 'تعذرت المزامنة. افحص الاتصال ثم أعد المحاولة.';
    } finally {
      sync.disabled = logout.disabled = false;
    }
  };
  logout.onclick = async () => {
    sync.disabled = logout.disabled = true;
    message.textContent = '';
    try {
      if (!await logOutOfMadar()) message.textContent = 'تعذّر حفظ آخر تعديل. أعد المزامنة قبل تسجيل الخروج.';
    } finally {
      sync.disabled = logout.disabled = false;
    }
  };
  const form = $('#settings-password-form');
  const submit = form.querySelector('button');
  const passwordStatus = $('#settings-password-status');
  form.onsubmit = async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const {current,password,confirmation} = Object.fromEntries(new FormData(form));
    if (password !== confirmation || current === password) {
      passwordStatus.textContent = password!==confirmation
        ? 'تأكد من تطابق الكلمتين الجديدتين.' : 'اختر كلمة مرور مختلفة عن الحالية.';
      return;
    }
    submit.disabled = true;
    passwordStatus.textContent = 'جارٍ التحقق وتغيير كلمة المرور…';
    try {
      await updateAccountPassword(current,password);
      form.reset();
      passwordStatus.textContent = 'تم تغيير كلمة المرور.';
    } catch (error) {
      if (['invalid_credentials','current_password_invalid'].includes(error.code)) {
        passwordStatus.textContent = 'كلمة المرور الحالية غير صحيحة. أعد إدخالها.';
      } else if (error.code === 'weak_password') {
        passwordStatus.textContent = 'اختر كلمة مرور أقوى وأطول.';
      } else {
        passwordStatus.textContent = 'تعذّر تأكيد التغيير. تحقق من الاتصال، ثم أعد المحاولة.';
      }
    } finally {
      submit.disabled = false;
    }
  };
}

let experienceRoute;
let routeAnimation;
function finishRouteExperience(page, key) {
  const current = ['module','lesson','guide'].includes(page) ? (page==='guide'?'labs':'roadmap') : page;
  document.querySelectorAll('#nav a').forEach(link => {
    const active = link.hash === '#' + current;
    link.classList.toggle('active',active);
    if (active) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const heading = $('#page-title');
  document.title = heading.textContent + ' | مَدار';
  if (experienceRoute === key) return;
  const previous = experienceRoute;
  experienceRoute = key;
  if (previous !== undefined) heading.focus({preventScroll:true});
  routeAnimation?.cancel();
  if (deviceMotion.matches || document.documentElement.classList.contains('motion-paused')) return;
  const entrance = page === 'lesson' ? app.querySelector('.reader-cover') || app : app;
  routeAnimation = entrance.animate?.(
    [{opacity:0.55, transform:'translateY(8px)'},{opacity:1, transform:'translateY(0)'}],
    {duration:300,easing:'cubic-bezier(.2,.72,.25,1)'});
}

function resetRouteExperience() {
  experienceRoute = undefined;
  routeAnimation?.cancel();
}
