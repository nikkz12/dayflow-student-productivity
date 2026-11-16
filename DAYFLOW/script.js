const STORAGE_KEY = "dayflow_tasks_v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentFilter = "all";
let timerSeconds = 25 * 60;
let timerInterval = null;
let selectedMinutes = 25;
let sessions = Number(localStorage.getItem("dayflow_sessions") || 0);

const $ = (id) => document.getElementById(id);
const today = new Date();
const dateKey = (d) => {
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0,10);
};
const todayKey = dateKey(today);
$("today-label").textContent = today.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); render(); }
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function taskMarkup(task){
  return `<div class="task-row ${task.done?"done":""}">
    <input class="task-check" type="checkbox" data-toggle="${task.id}" ${task.done?"checked":""} aria-label="Complete task">
    <div class="task-main"><div class="task-name">${escapeHTML(task.title)}</div><div class="task-meta">${escapeHTML(task.category)} · Due ${new Date(task.due+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</div></div>
    <span class="priority ${task.priority}">${task.priority}</span>
    <button class="delete-btn" data-delete="${task.id}" aria-label="Delete task">×</button>
  </div>`;
}
function render(){
  const pending=tasks.filter(t=>!t.done), done=tasks.filter(t=>t.done);
  $("stat-completed").textContent=done.length;
  $("stat-pending").textContent=pending.length;
  $("stat-streak").textContent=calculateStreak()+" days";
  $("stat-sessions").textContent=sessions;
  const todays=tasks.filter(t=>t.due===todayKey && !t.done);
  $("today-tasks").innerHTML=todays.length?todays.slice(0,5).map(taskMarkup).join(""):'<div class="empty-state">No tasks due today. Enjoy the breathing room or add a task.</div>';
  const visible=tasks.filter(t=>currentFilter==="all" || (currentFilter==="pending"?!t.done:t.done)).sort((a,b)=>a.due.localeCompare(b.due));
  $("all-tasks").innerHTML=visible.length?visible.map(taskMarkup).join(""):'<div class="empty-state">Nothing here yet. Add a task to get started.</div>';
  const upcoming=[...tasks].sort((a,b)=>a.due.localeCompare(b.due));
  $("calendar-list").innerHTML=upcoming.length?upcoming.map(t=>`<div class="calendar-item"><div class="calendar-date"><strong>${new Date(t.due+"T00:00:00").getDate()}</strong><small>${new Date(t.due+"T00:00:00").toLocaleDateString(undefined,{month:"short"})}</small></div><div class="calendar-info"><strong>${escapeHTML(t.title)} ${t.done?"✓":""}</strong><p>${escapeHTML(t.category)} · ${t.priority} priority · ${t.done?"Completed":"Pending"}</p></div></div>`).join(""):'<div class="empty-state">Your schedule is clear. Add a task to see it here.</div>';
  $("report-total").textContent=tasks.length;
  $("report-done").textContent=done.length;
  const rate=tasks.length?Math.round(done.length/tasks.length*100):0;
  $("report-rate").textContent=rate+"%";
  $("progress-fill").style.width=rate+"%";
  $("progress-caption").textContent=tasks.length?`${done.length} of ${tasks.length} tasks completed (${rate}%).`:"Complete a task to start building your progress.";
  $("focus-count").textContent=sessions;
}
function calculateStreak(){
  const completedDates=[...new Set(tasks.filter(t=>t.done&&t.completedAt).map(t=>t.completedAt))].sort().reverse();
  if(!completedDates.length)return 0;
  let cursor=new Date(todayKey+"T00:00:00");
  if(!completedDates.includes(todayKey))cursor.setDate(cursor.getDate()-1);
  let count=0;
  while(completedDates.includes(dateKey(cursor))){count++;cursor.setDate(cursor.getDate()-1);}
  return count;
}
function openDialog(){ $("task-date").value=todayKey; $("task-dialog").showModal(); $("task-title").focus(); }
$("header-add").addEventListener("click",openDialog);
$("task-add").addEventListener("click",openDialog);
$("close-dialog").addEventListener("click",()=>$("task-dialog").close());
$("task-form").addEventListener("submit",e=>{
  e.preventDefault();
  const title=$("task-title").value.trim(); if(!title)return;
  tasks.push({id:Date.now().toString(),title,due:$("task-date").value,priority:$("task-priority").value,category:$("task-category").value,done:false,completedAt:null});
  save(); $("task-dialog").close(); $("task-form").reset(); showToast("Task added to your plan.");
});
document.addEventListener("click",e=>{
  const toggle=e.target.closest("[data-toggle]");
  if(toggle){const t=tasks.find(x=>x.id===toggle.dataset.toggle);if(t){t.done=toggle.checked;t.completedAt=t.done?todayKey:null;save();showToast(t.done?"Task completed. Nice work!":"Task marked as pending.");}}
  const del=e.target.closest("[data-delete]");
  if(del){tasks=tasks.filter(t=>t.id!==del.dataset.delete);save();showToast("Task deleted.");}
  const go=e.target.closest("[data-go]");if(go)switchView(go.dataset.go);
});
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  currentFilter=btn.dataset.filter;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===btn));render();
}));
function switchView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===view+"-view"));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:"Your productivity space.",tasks:"All your tasks, in one place.",calendar:"See what's coming up.",focus:"Make space for deep work.",reports:"Your progress at a glance."};
  $("page-title").textContent=titles[view]||"DAYFLOW";
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));

function updateTimer(){const m=Math.floor(timerSeconds/60),s=timerSeconds%60;$("timer-display").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}$("timer-start").textContent="Start focus";}
$("timer-start").addEventListener("click",()=>{
  if(timerInterval){stopTimer();return;}
  $("timer-start").textContent="Pause";
  timerInterval=setInterval(()=>{
    timerSeconds--;updateTimer();
    if(timerSeconds<=0){stopTimer();if(selectedMinutes===25){sessions++;localStorage.setItem("dayflow_sessions",sessions);render();showToast("Focus session complete. Take a break!");}else showToast("Break complete. Ready to focus?");}
  },1000);
});
$("timer-reset").addEventListener("click",()=>{stopTimer();timerSeconds=selectedMinutes*60;updateTimer();});
document.querySelectorAll(".timer-tab").forEach(btn=>btn.addEventListener("click",()=>{
  stopTimer();document.querySelectorAll(".timer-tab").forEach(b=>b.classList.toggle("active",b===btn));
  selectedMinutes=Number(btn.dataset.minutes);timerSeconds=selectedMinutes*60;
  $("timer-mode").textContent=selectedMinutes===25?"TIME TO FOCUS":"TAKE A BREATHER";
  $("timer-start").textContent=selectedMinutes===25?"Start focus":"Start break";updateTimer();
}));
render();
