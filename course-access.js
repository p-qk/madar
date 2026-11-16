async function openProtectedCourse(token) {
  const release = globalThis.madarRelease;
  if (!release) {
    if (madarCourseReady) return;
    throw new Error('The local course has not loaded.');
  }

  const url = API + '/storage/v1/object/authenticated/madar-course/releases/' + release.object;
  const response = await fetch(url,{
    cache:'no-store',
    headers:{apikey:KEY,Authorization:'Bearer '+token}
  });
  if (!response.ok) {
    const error = new Error('The protected course could not be downloaded.');
    error.status = response.status;
    error.code = [400,401,403,404].includes(response.status) ? 'course_access' : 'course_unavailable';
    throw error;
  }
  if (madarCourseReady) {
    await response.body?.cancel();
    return;
  }

  const bytes = await response.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const encoded = btoa(String.fromCharCode(...digest));
  if (encoded !== release.sha256) throw new Error('The course checksum does not match this release.');

  const script = document.createElement('script');
  script.text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  document.head.append(script);
  script.remove();
  if (!madarCourseReady) throw new Error('The course could not be started.');
}

async function openAuthenticatedCourse() {
  const token = await accessToken();
  await openProtectedCourse(token);
  await loadProgress(token);
  cloudReady = true;
}
