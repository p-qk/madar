const emptyProgress = () => ({completed: [], notes: '', chapterAnswers: {}, lessonCorrect: {}, milestones: {}, reviews: {}, reading: null});

function loadSession() {
  try { return JSON.parse(localStorage.getItem('madar-session') || 'null'); }
  catch { return null; }
}

let state = emptyProgress();
let session = loadSession();
let cloudReady = false;
let cloudBase = emptyProgress();
let lastCloudRow;
let cloudQueue = Promise.resolve();
const progressStatus = message => {
  $('#sync-status').textContent = message;
  const settingsStatus = $('#settings-sync');
  if (settingsStatus) settingsStatus.textContent = message;
};

async function api(path, {token, ...options} = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {apikey: KEY, 'Content-Type': 'application/json',
      ...(token ? {Authorization: 'Bearer ' + token} : {}), ...options.headers}
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || data?.msg || 'تعذر الاتصال');
    error.status = response.status;
    error.code = data?.error_code ?? data?.code;
    throw error;
  }
  return data;
}

function setSession(value) {
  session = value;
  try {
    if (value) localStorage.setItem('madar-session', JSON.stringify(value));
    else localStorage.removeItem('madar-session');
  } catch {}
}

async function accessToken() {
  if (!session) throw new Error('سجّل الدخول أولًا');
  if (session.expires_at <= Date.now()/1000 + 60) {
    const renewed = await api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: JSON.stringify({refresh_token: session.refresh_token})
    });
    setSession(renewed);
  }
  return session.access_token;
}

function queueCloud(action) {
  const job = cloudQueue.then(() => action());
  cloudQueue = job.catch(() => {});
  return job;
}

const rowPath = () => '/rest/v1/madar_progress?user_id=eq.' + encodeURIComponent(session.user.id);
function normalizeProgress(data) {
  const bookmark = data?.reading;
  return {
    completed: Array.isArray(data?.completed) ? data.completed : [],
    notes: typeof data?.notes === 'string' ? data.notes : '',
    chapterAnswers: {...data?.chapterAnswers},
    lessonCorrect: {...data?.lessonCorrect},
    milestones: {...data?.milestones},
    reviews: {...data?.reviews},
    reading: bookmark && typeof bookmark.lesson === 'string' &&
      typeof bookmark.anchor === 'string' && Number.isFinite(bookmark.fraction)
      ? {lesson:bookmark.lesson, anchor:bookmark.anchor, fraction:Math.max(0,Math.min(bookmark.fraction,1))} : null
  };
}

function mergeProgress(remote, local, base) {
  const merged = normalizeProgress(remote);
  merged.completed = [...new Set([...merged.completed,...local.completed])];
  if (local.notes !== base.notes) merged.notes = local.notes;
  for (const field of ['chapterAnswers','lessonCorrect','milestones','reviews']) {
    for (const [id,value] of Object.entries(local[field])) {
      if (JSON.stringify(value) === JSON.stringify(base[field][id])) continue;
      if (field === 'reviews' && merged.reviews[id]?.total === value.total &&
        merged.reviews[id].correct > value.correct) continue;
      merged[field][id] = value;
    }
  }
  if (JSON.stringify(local.reading) !== JSON.stringify(base.reading)) merged.reading = local.reading;
  return merged;
}

async function readProgress(token) {
  const rows = await api(rowPath() + '&select=data,updated_at', {token});
  return rows[0];
}

async function loadProgress(token) {
  const row = await readProgress(token ?? await accessToken());
  state = normalizeProgress(row?.data);
  cloudBase = normalizeProgress(row?.data);
  lastCloudRow = row;
  progressStatus('● تقدم حسابك جاهز');
}

function canEditProgress() {
  if (cloudReady) return true;
  toast(session ? 'حمّل تقدم حسابك قبل الحفظ' : 'سجّل الدخول لحفظ تقدمك');
  showAccessScreen();
  return false;
}

let scheduledSave;
let editVersion = 0;
let retrySave;
let retryDelay = 4000;

function save() {
  if (!cloudReady) return Promise.resolve(false);
  editVersion++;
  clearTimeout(scheduledSave);
  clearTimeout(retrySave);
  scheduledSave = retrySave = undefined;
  progressStatus('● بانتظار الحفظ في حسابك…');
  return queueCloud(writeProgress).catch(() => {
    if (cloudReady) {
      progressStatus('● لم يصل تأكيد الحفظ · ستتم إعادة المحاولة');
      if (navigator.onLine) {
        retrySave = setTimeout(save,retryDelay);
        retryDelay = Math.min(retryDelay*2,60000);
      }
    }
    return false;
  });
}

async function writeProgress() {
  const version = editVersion;
  const local = normalizeProgress(state);
  const base = cloudBase;
  if (JSON.stringify(local) === JSON.stringify(base)) {
    retryDelay = 4000;
    progressStatus('● تقدم حسابك جاهز');
    return true;
  }
  const token = await accessToken();
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = attempt === 0 ? lastCloudRow : await readProgress(token);
    const merged = mergeProgress(row?.data,local,base);
    const timestamp = new Date(Math.max(Date.now(), row ? Date.parse(row.updated_at) + 1 : 0)).toISOString();
    const payload = {data: merged, updated_at: timestamp};
    try {
      const rows = row
        ? await api(rowPath() + '&updated_at=eq.' + encodeURIComponent(row.updated_at), {
            token, method: 'PATCH', headers: {Prefer: 'return=representation'}, body: JSON.stringify(payload),
            keepalive: JSON.stringify(payload).length < 12000
          })
        : await api('/rest/v1/madar_progress', {
            token, method: 'POST', headers: {Prefer: 'return=representation'},
            body: JSON.stringify({user_id: session.user.id, ...payload}), keepalive: JSON.stringify(payload).length < 12000
          });
      if (!rows?.length) continue;
      lastCloudRow = rows[0];
      retryDelay = 4000;
      cloudBase = normalizeProgress(rows[0].data);
      state = mergeProgress(cloudBase,normalizeProgress(state),local);
      if (version === editVersion) {
        progressStatus('● محفوظ في حسابك');
      }
      return true;
    } catch (error) {
      if (row || error.status !== 409) throw error;
    }
  }
  throw new Error('تعذر حفظ التعديل المتزامن');
}

function saveText(delay = 350) {
  editVersion++;
  progressStatus('● بانتظار الحفظ في حسابك…');
  if (scheduledSave === undefined) scheduledSave = setTimeout(save,delay);
}

function flushProgress() {
  if (cloudReady && scheduledSave !== undefined) void save();
}

async function syncAccountProgress() {
  if (!await save()) throw new Error('تعذر حفظ التقدم');
  await queueCloud(loadProgress);
}

function clearCloudSession() {
  stopReader();
  entryFlow = null;
  clearTimeout(scheduledSave);
  clearTimeout(retrySave);
  scheduledSave = retrySave = undefined;
  setSession(null);
  cloudReady = false;
  state = emptyProgress();
  cloudBase = emptyProgress();
  lastCloudRow = undefined;
  retryDelay = 4000;
  progressStatus('● سجّل الدخول لحفظ تقدمك');
}

function showSignedOut() {
  if (globalThis.madarRelease && madarCourseReady) {
    location.reload();
    return;
  }
  render();
  $('#entry-email')?.focus();
}

async function logOutOfMadar() {
  if (cloudReady && !await save()) return false;
  await queueCloud(async () => {
    if (session) {
      try {
        const token = await accessToken();
        if (globalThis.madarRelease?.reader) await readerRequest('leave',null,token).catch(()=>{});
        await api('/auth/v1/logout?scope=local',{token,method:'POST'});
      } catch {}
    }
    clearCloudSession();
    showSignedOut();
  });
  return true;
}

function updateAccountPassword(currentPassword, password) {
  return queueCloud(async () => {
    const account = session?.user;
    if (!account?.email) throw new Error('يلزم تسجيل الدخول');
    // An authenticated password grant checks the current password even when the hosted
    // Auth configuration does not require it for profile updates.
    const recent = await api('/auth/v1/token?grant_type=password',{
      method:'POST',body:JSON.stringify({email:account.email,password:currentPassword})
    });
    const reader = globalThis.madarRelease?.reader;
    let keepRecent = false;
    try {
      if (recent.user?.id!==account.id) throw new Error('تغيّر الحساب أثناء التحقق');
      const user = await api('/auth/v1/user',{
        token:reader?await accessToken():recent.access_token,
        method:'PUT',body:JSON.stringify({password,current_password:currentPassword})
      });
      setSession({...(reader?session:recent),user});
      keepRecent = !reader;
    } finally {
      if (!keepRecent) await api('/auth/v1/logout?scope=local',{token:recent.access_token,method:'POST'}).catch(()=>{});
    }
  });
}

function startCloudProgress() {
  if (session) {
    restoringLogin = true;
    queueCloud(openAuthenticatedCourse).catch(error => {
      loginNotice = entryFailureMessage(error,true);
      clearCloudSession();
    }).finally(() => {
      restoringLogin = false;
      render();
    });
  } else progressStatus('● سجّل الدخول لحفظ تقدمك');
  render();
  window.addEventListener('online', () => { if (cloudReady) save(); });
  window.addEventListener('storage', event => {
    if (event.key !== 'madar-session' || event.newValue !== null || !session) return;
    void queueCloud(() => {
      if (loadSession()) return;
      clearCloudSession();
      showSignedOut();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushProgress();
  });
}
