const API = 'https://tjmkjanqxrkbraswujks.supabase.co';
const KEY = 'sb_publishable_w-J0jhFjyDzcKbFmJnFShQ_OhK1F8J6';
const $ = selector => document.querySelector(selector);
const app = $('#app');
let madarCourseReady = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'),3000);
}

function render() {
  showAccessScreen();
}

function packetPulse(path, {duration=3,start=0,end=.92,reverse=false,style='',repeat='indefinite'}={}) {
  const round = value => Number(value.toFixed(4));
  const times = [0,round(start),round(end),1];
  const points = reverse ? [1,1,0,0] : [0,0,1,1];
  const fadeTimes = [...(start ? [0,round(start)] : [0]),round(start+(end-start)*.09),
    round(start+(end-start)*.88),round(end),1];
  if (times[1] === 0) {
    times.shift();
    points.shift();
  }
  return `<g class="packet-pulse ${style}" aria-hidden="true" opacity="0">
    <circle class="pulse-halo" r="9"/><circle class="pulse-core" r="4.3"/>
    <animateMotion dur="${duration}s" repeatCount="${repeat}" calcMode="linear" path="${path}"
      keyTimes="${times.join(';')}" keyPoints="${points.join(';')}"/>
    <animate attributeName="opacity" dur="${duration}s" repeatCount="${repeat}"
      keyTimes="${fadeTimes.join(';')}" values="${start ? '0;' : ''}0;1;1;0;0"/>
  </g>`;
}
