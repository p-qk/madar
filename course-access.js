let activeResource;
let resourceRequest;
let listeningForSession;

const readingMessages = {
  no_access:'اشتراك هذا الحساب غير مفعّل. تواصل مع إدارة مَدار لتفعيل الوصول إلى الدروس.',
  mfa_required:'يلزم تأكيد الرمز من تطبيق المصادقة.',
  active_elsewhere:'جلسة الدراسة نشطة على جهاز آخر.',
  too_many_requests:'انتظر دقيقة قبل فتح درس آخر.',
  not_found:'تعذّر فتح هذا المحتوى. حدّث الصفحة ثم أعد المحاولة.'
};

function sessionAssurance(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(payload)).aal;
  } catch { return null; }
}

async function readerRequest(action, resource = null, token, signal) {
  const result = await api('/rest/v1/rpc/madar_read_course',{
    token: token ?? await queueCloud(accessToken),
    method:'POST',cache:'no-store',signal,
    body:JSON.stringify({p_release:globalThis.madarRelease.version,p_action:action,p_resource:resource})
  });
  if (result?.status!=='ok') {
    const error = new Error(readingMessages[result?.status] || 'تعذر التحقق من الوصول إلى مَدار.');
    error.code = result?.status;
    throw error;
  }
  return result;
}

async function installReaderScript(scriptText) {
  if (madarCourseReady) return;
  const bytes = new TextEncoder().encode(scriptText);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  if (btoa(String.fromCharCode(...digest))!==globalThis.madarRelease.sha256) {
    throw new Error('The reader checksum does not match this release.');
  }
  const script = document.createElement('script');
  script.text = scriptText;
  document.head.append(script);
  script.remove();
  if (!madarCourseReady) throw new Error('The reading interface could not be started.');
}

async function openAuthenticatedCourse(takeover = false) {
  const token = await accessToken();
  if (globalThis.madarRelease?.reader) {
    if (sessionAssurance(token)!=='aal2') {
      await prepareEntryFactor(token);
      return;
    }
    try {
      const result = await readerRequest(takeover?'takeover':'enter',null,token);
      await installReaderScript(result.payload.script);
    } catch (error) {
      if (error.code!=='active_elsewhere') throw error;
      entryFlow = {mode:'switch'};
      return;
    }
  }
  if (!madarCourseReady) throw new Error('The local course has not loaded.');
  await loadProgress(token);
  entryFlow = null;
  cloudReady = true;
  listenForReaderSession();
}

function interruptReading(error) {
  if (error.status!==401 && !['active_elsewhere','no_access','mfa_required'].includes(error.code)) return false;
  if (error.code==='active_elsewhere') flushProgress();
  stopReader();
  cloudReady = false;
  entryFlow = error.code==='active_elsewhere' ? {mode:'switch'} : null;
  loginNotice = error.status===401?'انتهت الجلسة. سجّل الدخول من جديد.':error.message;
  if (!entryFlow) clearCloudSession();
  render();
  return true;
}

function loadReadingRoute(resource, route) {
  if (resource===activeResource && !resourceRequest) return true;
  if (!resource && !activeResource && !resourceRequest) return true;
  if (resourceRequest?.route===route) return false;
  resourceRequest?.controller.abort();
  resourceRequest = undefined;
  clearReadingResource();
  activeResource = undefined;
  if (!resource) return true;

  const controller = new AbortController();
  const pending = {controller,route};
  resourceRequest = pending;
  app.innerHTML = '<section class="panel" role="status">جارٍ فتح محتوى الدرس…</section>';
  readerRequest('read',resource,undefined,controller.signal).then(result=>{
    if (resourceRequest!==pending || !cloudReady) return;
    installReadingResource(result.payload,result.watermark);
    resourceRequest = undefined;
    activeResource = resource;
    render();
  }).catch(error=>{
    if (resourceRequest!==pending || !cloudReady) return;
    resourceRequest = undefined;
    if (interruptReading(error)) return;
    const message = readingMessages[error.code] || 'تعذّر جلب المحتوى. تحقّق من الاتصال ثم أعد المحاولة.';
    app.innerHTML = `<section class="panel" role="status"><p>${esc(message)}</p>
      <button class="button" type="button" id="reader-retry">إعادة المحاولة</button></section>`;
    $('#reader-retry').onclick = ()=>render();
  });
  return false;
}

function listenForReaderSession() {
  if (!globalThis.madarRelease?.reader || listeningForSession) return;
  async function check() {
    if (!cloudReady || listeningForSession!==cleanup || document.visibilityState==='hidden') return;
    try { await readerRequest('ping'); }
    catch (error) { if (cloudReady && listeningForSession===cleanup) interruptReading(error); }
  }
  const interval = setInterval(check,15000);
  document.addEventListener('visibilitychange',check);
  function cleanup() {
    clearInterval(interval);
    document.removeEventListener('visibilitychange',check);
  }
  listeningForSession = cleanup;
}

function stopReader() {
  listeningForSession?.();
  listeningForSession = undefined;
  resourceRequest?.controller.abort();
  resourceRequest = undefined;
  activeResource = undefined;
  if (globalThis.madarRelease?.reader && madarCourseReady) clearReadingResource();
}
