const STORAGE_KEY='coop_group_tracker_v1';
const SECTIONS_META_KEY='coop_group_tracker_sections_v2';
const ACTIVE_SECTION_KEY='coop_group_tracker_active_section_v2';

const defaultState={
  settings:{teacher:'زهراء آل سليم',school:'',subject:'',grade:'',section:'',term:'',currentPeriod:1},
  students:[],groups:[],worksheets:[],evaluations:{},quickLogs:{}
};

function uid(prefix='id'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function sectionStorageKey(id){return `${STORAGE_KEY}__${id}`}
function blankState(sectionName=''){const s=structuredClone(defaultState);s.settings.section=sectionName;return s}
function parseJSON(text,fallback=null){try{return JSON.parse(text)??fallback}catch{return fallback}}

function initSections(){
  let meta=parseJSON(localStorage.getItem(SECTIONS_META_KEY));
  if(meta?.sections?.length){
    if(!meta.activeId || !meta.sections.some(s=>s.id===meta.activeId))meta.activeId=meta.sections[0].id;
    localStorage.setItem(SECTIONS_META_KEY,JSON.stringify(meta));
    localStorage.setItem(ACTIVE_SECTION_KEY,meta.activeId);
    return meta;
  }

  const legacy=parseJSON(localStorage.getItem(STORAGE_KEY));
  const firstName=String(legacy?.settings?.section||'الشعبة الأولى').trim()||'الشعبة الأولى';
  const sections=[
    {id:'section_1',name:firstName},
    {id:'section_2',name:'الشعبة الثانية'},
    {id:'section_3',name:'الشعبة الثالثة'},
    {id:'section_4',name:'الشعبة الرابعة'}
  ];
  if(legacy)localStorage.setItem(sectionStorageKey('section_1'),JSON.stringify(legacy));
  else localStorage.setItem(sectionStorageKey('section_1'),JSON.stringify(blankState(firstName)));
  sections.slice(1).forEach(s=>localStorage.setItem(sectionStorageKey(s.id),JSON.stringify(blankState(s.name))));
  meta={version:2,activeId:'section_1',sections};
  localStorage.setItem(SECTIONS_META_KEY,JSON.stringify(meta));
  localStorage.setItem(ACTIVE_SECTION_KEY,meta.activeId);
  return meta;
}

let sectionsMeta=initSections();
let activeSectionId=localStorage.getItem(ACTIVE_SECTION_KEY)||sectionsMeta.activeId;
if(!sectionsMeta.sections.some(s=>s.id===activeSectionId))activeSectionId=sectionsMeta.sections[0].id;

function currentSection(){return sectionsMeta.sections.find(s=>s.id===activeSectionId)}
function loadState(){
  const name=currentSection()?.name||'';
  const saved=parseJSON(localStorage.getItem(sectionStorageKey(activeSectionId)));
  return saved?{...structuredClone(defaultState),...saved,settings:{...defaultState.settings,...saved.settings,section:name}}:blankState(name)
}
let state=loadState();
let currentView='dashboard';

function persistMeta(){
  sectionsMeta.activeId=activeSectionId;
  localStorage.setItem(SECTIONS_META_KEY,JSON.stringify(sectionsMeta));
  localStorage.setItem(ACTIVE_SECTION_KEY,activeSectionId);
}
function saveState(){
  state.settings.section=currentSection()?.name||state.settings.section||'';
  localStorage.setItem(sectionStorageKey(activeSectionId),JSON.stringify(state));
  renderAll();
}
function switchSection(id){
  if(!sectionsMeta.sections.some(s=>s.id===id))return;
  activeSectionId=id;
  persistMeta();
  state=loadState();
  closeModal();
  renderAll();
}
function addSection(){
  const name=prompt('اكتبي اسم الشعبة الجديدة');
  if(!name?.trim())return;
  const id='section_'+Date.now().toString(36);
  sectionsMeta.sections.push({id,name:name.trim()});
  localStorage.setItem(sectionStorageKey(id),JSON.stringify(blankState(name.trim())));
  activeSectionId=id;
  persistMeta();
  state=loadState();
  renderAll();
}
function deleteCurrentSection(){
  if(sectionsMeta.sections.length<=1)return alert('يجب أن تبقى شعبة واحدة على الأقل.');
  const sec=currentSection();
  if(!confirm(`حذف ${sec?.name||'هذه الشعبة'} وجميع بياناتها من هذا الجهاز؟`))return;
  localStorage.removeItem(sectionStorageKey(activeSectionId));
  sectionsMeta.sections=sectionsMeta.sections.filter(s=>s.id!==activeSectionId);
  activeSectionId=sectionsMeta.sections[0].id;
  persistMeta();
  state=loadState();
  renderAll();
}
function renderSectionSwitcher(){
  const toolbar=document.querySelector('.toolbar');
  if(!toolbar)return;
  let box=document.getElementById('sectionSwitcher');
  if(!box){
    box=document.createElement('div');
    box.id='sectionSwitcher';
    box.className='section-switcher';
    toolbar.prepend(box);
  }
  box.innerHTML=`<span class="section-label">الشعبة:</span>
    <select id="sectionSelect">${sectionsMeta.sections.map(s=>`<option value="${s.id}" ${s.id===activeSectionId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <button class="secondary small" type="button" onclick="addSection()">+ إضافة شعبة</button>`;
  document.getElementById('sectionSelect').onchange=e=>switchSection(e.target.value);
}
function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function fmt(n,d=1){return Number.isFinite(n)?Number(n).toFixed(d):'—'}
function studentById(id){return state.students.find(s=>s.id===id)}
function groupById(id){return state.groups.find(g=>g.id===id)}
function studentsInGroup(gid){return state.students.filter(s=>s.groupId===gid)}
function periodKey(studentId,period){return `${studentId}_p${period}`}
function ensureEval(studentId,period){const k=periodKey(studentId,period);if(!state.evaluations[k])state.evaluations[k]={interaction:3,response:3,cooperation:3,responsibility:3,completion:3,notes:''};return state.evaluations[k]}
function avg(arr){const a=arr.filter(x=>Number.isFinite(Number(x))).map(Number);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function evalAvg(ev){return avg([ev.interaction,ev.response,ev.cooperation,ev.responsibility,ev.completion])}
function level(v){if(v>=4.5)return'ممتاز';if(v>=3.5)return'جيد جدًا';if(v>=2.5)return'جيد';if(v>=1.5)return'يحتاج تحسين';return'ضعيف'}
function worksheetAvgForGroup(gid,period){const ws=state.worksheets.filter(w=>w.groupId===gid && Number(w.period)===Number(period));if(!ws.length)return 0;return avg(ws.map(w=>w.maxScore?((w.score/w.maxScore)*5):0))}
function totalStudentPeriod(studentId,period){const ev=ensureEval(studentId,period);const s=studentById(studentId);const wa=s?.groupId?worksheetAvgForGroup(s.groupId,period):0;return wa?avg([evalAvg(ev),wa]):evalAvg(ev)}
function quickKey(studentId,period){return `${studentId}_p${period}`}
function quickObj(studentId,period){const k=quickKey(studentId,period);if(!state.quickLogs[k])state.quickLogs[k]={interaction:0,response:0,cooperation:0};return state.quickLogs[k]}

function setView(v){currentView=v;document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelector(`#view-${v}`).classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));renderView(v)}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

document.getElementById('modalClose').onclick=closeModal;
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function openModal(title,html){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=html;document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}

function renderAll(){renderSectionSwitcher();document.getElementById('schoolLine').textContent=[state.settings.school,state.settings.subject,state.settings.grade,state.settings.section,`الفترة ${state.settings.currentPeriod}`].filter(Boolean).join(' • ')||'المرحلة الثانوية • متابعة 4 فترات';renderView(currentView)}
function renderView(v){({dashboard:renderDashboard,students:renderStudents,groups:renderGroups,worksheets:renderWorksheets,quick:renderQuick,reports:renderReports,settings:renderSettings}[v]||(()=>{}))()}

function renderDashboard(){
  const p=state.settings.currentPeriod;const avgs=state.students.map(s=>totalStudentPeriod(s.id,p));
  const el=document.getElementById('view-dashboard');
  el.innerHTML=`<div class="section-head"><div><h2>لوحة المتابعة</h2><div class="muted">الفترة الحالية: ${p}</div></div><button onclick="setView('quick')">فتح المتابعة السريعة</button></div>
  <div class="grid cards-4">
    <div class="card stat"><div class="value">${state.students.length}</div><div class="label">عدد الطالبات</div></div>
    <div class="card stat"><div class="value">${state.groups.length}</div><div class="label">عدد المجموعات</div></div>
    <div class="card stat"><div class="value">${state.worksheets.filter(w=>+w.period===+p).length}</div><div class="label">أوراق العمل في الفترة</div></div>
    <div class="card stat"><div class="value">${state.students.length?fmt(avg(avgs),2):'—'}</div><div class="label">متوسط الأداء / 5</div></div>
  </div>
  <div class="grid cards-2" style="margin-top:14px">
    <div class="card"><div class="section-head"><h3>متوسط المجموعات</h3></div>${groupSummaryHTML(p)}</div>
    <div class="card"><div class="section-head"><h3>تنبيهات</h3></div>${alertsHTML()}</div>
  </div>`;
}
function groupSummaryHTML(p){if(!state.groups.length)return'<div class="empty">أضيفي المجموعات أولًا.</div>';return state.groups.map(g=>{const ss=studentsInGroup(g.id);const a=ss.length?avg(ss.map(s=>totalStudentPeriod(s.id,p))):0;return `<div style="margin:12px 0"><div class="row" style="justify-content:space-between"><strong>${esc(g.name)}</strong><span>${ss.length?fmt(a,2):'—'} / 5</span></div><div class="progress"><span style="width:${Math.min(100,a/5*100)}%"></span></div></div>`}).join('')}
function alertsHTML(){if(!state.students.length)return'<div class="empty">لا توجد بيانات كافية.</div>';let arr=[];for(const s of state.students){const vals=[1,2,3,4].map(p=>totalStudentPeriod(s.id,p));if(vals[2]&&vals[1]&&vals[2]-vals[1]>=1)arr.push(`⭐ تحسن ملحوظ لدى ${esc(s.name)} في الفترة 3.`);if(vals[3]&&vals[2]&&vals[3]-vals[2]>=1)arr.push(`⭐ تحسن ملحوظ لدى ${esc(s.name)} في الفترة 4.`);if(vals.filter(Boolean).slice(-2).every(v=>v&&v<2.5) && vals.filter(Boolean).length>=2)arr.push(`⚠️ ${esc(s.name)} تحتاج تعزيز المشاركة والتفاعل.`)}return arr.length?arr.slice(0,8).map(x=>`<div class="notice" style="margin-bottom:8px">${x}</div>`).join(''):'<div class="empty">لا توجد تنبيهات حاليًا.</div>'}

function renderStudents(){
  const el=document.getElementById('view-students');
  el.innerHTML=`<div class="section-head"><div><h2>الطالبات</h2><div class="muted">إضافة فردية أو لصق قائمة أسماء</div></div><div class="row"><button onclick="showBulkStudents()">لصق أسماء</button><button class="secondary" onclick="showStudentForm()">إضافة طالبة</button></div></div>${studentsTable()}`;
}
function studentsTable(){if(!state.students.length)return'<div class="empty">لا توجد طالبات بعد.</div>';return `<div class="table-wrap"><table><thead><tr><th>الطالبة</th><th>المجموعة</th><th>الدور</th><th>متوسط الفترة الحالية</th><th>إجراءات</th></tr></thead><tbody>${state.students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(groupById(s.groupId)?.name||'—')}</td><td>${esc(s.role||'عضو')}</td><td>${fmt(totalStudentPeriod(s.id,state.settings.currentPeriod),2)}</td><td><div class="row"><button class="small" onclick="showStudentReport('${s.id}')">تقرير</button><button class="small secondary" onclick="showStudentForm('${s.id}')">تعديل</button><button class="small danger" onclick="deleteStudent('${s.id}')">حذف</button></div></td></tr>`).join('')}</tbody></table></div>`}
function showBulkStudents(){openModal('إضافة قائمة الطالبات',`<div class="stack"><div class="field"><label>الصقي الأسماء، كل اسم في سطر مستقل</label><textarea id="bulkNames" placeholder="فاطمة أحمد\nمريم علي\n... "></textarea></div><div class="field"><label>المجموعة الافتراضية</label><select id="bulkGroup"><option value="">بدون مجموعة</option>${state.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><button onclick="addBulkStudents()">إضافة الأسماء</button></div>`)}
function addBulkStudents(){const names=document.getElementById('bulkNames').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);const gid=document.getElementById('bulkGroup').value;names.forEach(name=>state.students.push({id:uid('stu'),name,groupId:gid,role:'عضو'}));closeModal();saveState()}
function showStudentForm(id=''){const s=id?studentById(id):{name:'',groupId:'',role:'عضو'};openModal(id?'تعديل طالبة':'إضافة طالبة',`<div class="stack"><div class="field"><label>اسم الطالبة</label><input id="sName" value="${esc(s.name)}"></div><div class="field"><label>المجموعة</label><select id="sGroup"><option value="">بدون مجموعة</option>${state.groups.map(g=>`<option value="${g.id}" ${s.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label>الدور</label><select id="sRole">${['قائدة المجموعة','الكاتبة','المتحدثة','الباحثة','منسقة الوقت','عضو'].map(r=>`<option ${s.role===r?'selected':''}>${r}</option>`).join('')}</select></div><button onclick="saveStudent('${id}')">حفظ</button></div>`)}
function saveStudent(id){const name=document.getElementById('sName').value.trim();if(!name)return alert('اكتبي اسم الطالبة');if(id){Object.assign(studentById(id),{name,groupId:document.getElementById('sGroup').value,role:document.getElementById('sRole').value})}else state.students.push({id:uid('stu'),name,groupId:document.getElementById('sGroup').value,role:document.getElementById('sRole').value});closeModal();saveState()}
function deleteStudent(id){if(confirm('حذف الطالبة وبياناتها؟')){state.students=state.students.filter(s=>s.id!==id);Object.keys(state.evaluations).filter(k=>k.startsWith(id+'_')).forEach(k=>delete state.evaluations[k]);Object.keys(state.quickLogs).filter(k=>k.startsWith(id+'_')).forEach(k=>delete state.quickLogs[k]);saveState()}}

function renderGroups(){const el=document.getElementById('view-groups');el.innerHTML=`<div class="section-head"><div><h2>المجموعات</h2><div class="muted">تنظيم الطالبات في مجموعات تعاونية</div></div><button onclick="showGroupForm()">إضافة مجموعة</button></div>${state.groups.length?`<div class="grid cards-3">${state.groups.map(g=>`<div class="card"><div class="section-head"><h3>${esc(g.name)}</h3><div class="row"><button class="small secondary" onclick="showGroupForm('${g.id}')">تعديل</button><button class="small danger" onclick="deleteGroup('${g.id}')">حذف</button></div></div><div class="muted">${studentsInGroup(g.id).length} طالبات</div><div style="margin-top:10px">${studentsInGroup(g.id).map(s=>`<span class="group-chip">${esc(s.name)} • ${esc(s.role||'عضو')}</span>`).join('')||'<div class="empty">لا توجد طالبات</div>'}</div><div style="margin-top:12px"><button class="small" onclick="showGroupReport('${g.id}')">تقرير المجموعة</button></div></div>`).join('')}</div>`:'<div class="empty">أضيفي أول مجموعة للبدء.</div>'}`}
function showGroupForm(id=''){const g=id?groupById(id):{name:''};openModal(id?'تعديل المجموعة':'إضافة مجموعة',`<div class="stack"><div class="field"><label>اسم المجموعة</label><input id="gName" value="${esc(g.name)}" placeholder="المجموعة الأولى"></div><button onclick="saveGroup('${id}')">حفظ</button></div>`)}
function saveGroup(id){const name=document.getElementById('gName').value.trim();if(!name)return alert('اكتبي اسم المجموعة');if(id)groupById(id).name=name;else state.groups.push({id:uid('grp'),name});closeModal();saveState()}
function deleteGroup(id){if(confirm('حذف المجموعة؟ ستبقى الطالبات بدون مجموعة.')){state.groups=state.groups.filter(g=>g.id!==id);state.students.forEach(s=>{if(s.groupId===id)s.groupId='' });saveState()}}

function renderWorksheets(){const p=state.settings.currentPeriod;const el=document.getElementById('view-worksheets');el.innerHTML=`<div class="section-head"><div><h2>أوراق العمل الجماعية</h2><div class="muted">الفترة ${p}</div></div><button onclick="showWorksheetForm()">إضافة ورقة عمل</button></div>${state.worksheets.length?`<div class="table-wrap"><table><thead><tr><th>النشاط</th><th>المجموعة</th><th>الفترة</th><th>التاريخ</th><th>الدرجة</th><th>النسبة</th><th>إجراءات</th></tr></thead><tbody>${state.worksheets.map(w=>`<tr><td>${esc(w.title)}</td><td>${esc(groupById(w.groupId)?.name||'—')}</td><td>${w.period}</td><td>${esc(w.date||'')}</td><td>${w.score} / ${w.maxScore}</td><td>${fmt(w.maxScore?w.score/w.maxScore*100:0,0)}%</td><td><div class="row"><button class="small secondary" onclick="showWorksheetForm('${w.id}')">تعديل</button><button class="small danger" onclick="deleteWorksheet('${w.id}')">حذف</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">لم تتم إضافة أوراق عمل.</div>'}`}
function showWorksheetForm(id=''){const w=id?state.worksheets.find(x=>x.id===id):{title:'',groupId:'',period:state.settings.currentPeriod,date:new Date().toISOString().slice(0,10),lesson:'',maxScore:10,score:0,notes:''};openModal(id?'تعديل ورقة العمل':'إضافة ورقة عمل',`<div class="grid cards-2"><div class="field"><label>اسم النشاط</label><input id="wTitle" value="${esc(w.title)}"></div><div class="field"><label>المجموعة</label><select id="wGroup">${state.groups.map(g=>`<option value="${g.id}" ${w.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label>الفترة</label><select id="wPeriod">${[1,2,3,4].map(p=>`<option ${+w.period===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="field"><label>التاريخ</label><input id="wDate" type="date" value="${esc(w.date||'')}"></div><div class="field"><label>الدرس</label><input id="wLesson" value="${esc(w.lesson||'')}"></div><div class="field"><label>الدرجة الكاملة</label><input id="wMax" type="number" min="1" step="0.5" value="${w.maxScore}"></div><div class="field"><label>درجة المجموعة</label><input id="wScore" type="number" min="0" step="0.5" value="${w.score}"></div><div class="field"><label>ملاحظات</label><textarea id="wNotes">${esc(w.notes||'')}</textarea></div></div><button style="margin-top:12px" onclick="saveWorksheet('${id}')">حفظ</button>`)}
function saveWorksheet(id){const obj={title:document.getElementById('wTitle').value.trim(),groupId:document.getElementById('wGroup').value,period:+document.getElementById('wPeriod').value,date:document.getElementById('wDate').value,lesson:document.getElementById('wLesson').value.trim(),maxScore:+document.getElementById('wMax').value,score:+document.getElementById('wScore').value,notes:document.getElementById('wNotes').value.trim()};if(!obj.title||!obj.groupId||!obj.maxScore)return alert('أكملي اسم النشاط والمجموعة والدرجة الكاملة');if(obj.score>obj.maxScore)return alert('درجة المجموعة لا يمكن أن تتجاوز الدرجة الكاملة');if(id)Object.assign(state.worksheets.find(x=>x.id===id),obj);else state.worksheets.push({id:uid('ws'),...obj});closeModal();saveState()}
function deleteWorksheet(id){if(confirm('حذف ورقة العمل؟')){state.worksheets=state.worksheets.filter(w=>w.id!==id);saveState()}}

function renderQuick(){const p=state.settings.currentPeriod;const el=document.getElementById('view-quick');el.innerHTML=`<div class="section-head"><div><h2>المتابعة السريعة</h2><div class="muted">كل ضغطة تسجل مشاركة أو استجابة أو تعاون في الفترة ${p}</div></div><div class="row">${[1,2,3,4].map(x=>`<button class="period-tab ${p===x?'active':''}" onclick="changePeriod(${x})">الفترة ${x}</button>`).join('')}</div></div>${state.groups.length?state.groups.map(g=>`<div class="card" style="margin-bottom:14px"><div class="section-head"><h3>${esc(g.name)}</h3><span class="badge">${studentsInGroup(g.id).length} طالبات</span></div><div class="grid cards-3">${studentsInGroup(g.id).map(s=>quickCard(s,p)).join('')||'<div class="empty">لا توجد طالبات في هذه المجموعة</div>'}</div></div>`).join(''):'<div class="empty">أضيفي المجموعات والطالبات أولًا.</div>'}`}
function quickCard(s,p){const q=quickObj(s.id,p);return `<div class="student-card"><div class="student-title"><div><h3>${esc(s.name)}</h3><div class="muted">${esc(s.role||'عضو')}</div></div><button class="small secondary" onclick="showEvaluation('${s.id}',${p})">تقييم مفصل</button></div><div class="quick-actions"><button onclick="incQuick('${s.id}',${p},'interaction')">+ مشاركة<span class="counter">${q.interaction}</span></button><button onclick="incQuick('${s.id}',${p},'response')">+ استجابة<span class="counter">${q.response}</span></button><button onclick="incQuick('${s.id}',${p},'cooperation')">+ تعاون<span class="counter">${q.cooperation}</span></button></div></div>`}
function incQuick(id,p,type){const q=quickObj(id,p);q[type]++;const ev=ensureEval(id,p);const total=q[type];const score=Math.min(5,Math.max(1,Math.ceil(total/2)));if(type==='interaction')ev.interaction=Math.max(ev.interaction,score);if(type==='response')ev.response=Math.max(ev.response,score);if(type==='cooperation')ev.cooperation=Math.max(ev.cooperation,score);saveState()}
function changePeriod(p){state.settings.currentPeriod=p;saveState()}
function showEvaluation(id,p){const s=studentById(id),ev=ensureEval(id,p);const fields=[['interaction','التفاعل والمشاركة'],['response','الاستجابة'],['cooperation','التعاون'],['responsibility','تحمل المسؤولية'],['completion','إنجاز المهمة']];openModal(`تقييم ${s.name} - الفترة ${p}`,`<div class="stack">${fields.map(([k,l])=>`<div class="field"><label>${l}</label><select id="ev_${k}">${[5,4,3,2,1].map(v=>`<option value="${v}" ${+ev[k]===v?'selected':''}>${v} - ${level(v)}</option>`).join('')}</select></div>`).join('')}<div class="field"><label>ملاحظات</label><textarea id="ev_notes">${esc(ev.notes||'')}</textarea></div><button onclick="saveEvaluation('${id}',${p})">حفظ التقييم</button></div>`)}
function saveEvaluation(id,p){const ev=ensureEval(id,p);['interaction','response','cooperation','responsibility','completion'].forEach(k=>ev[k]=+document.getElementById('ev_'+k).value);ev.notes=document.getElementById('ev_notes').value.trim();closeModal();saveState()}

function renderReports(){const el=document.getElementById('view-reports');el.innerHTML=`<div class="section-head"><div><h2>التقارير والتحليل</h2><div class="muted">تقارير فردية ومقارنة الفترات الأربع</div></div></div><div class="grid cards-2"><div class="card"><h3>تقرير طالبة</h3><div class="field"><label>اختاري الطالبة</label><select id="reportStudent"><option value="">—</option>${state.students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><button style="margin-top:10px" onclick="const v=document.getElementById('reportStudent').value;if(v)showStudentReport(v)">عرض التقرير</button></div><div class="card"><h3>تقرير مجموعة</h3><div class="field"><label>اختاري المجموعة</label><select id="reportGroup"><option value="">—</option>${state.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><button style="margin-top:10px" onclick="const v=document.getElementById('reportGroup').value;if(v)showGroupReport(v)">عرض التقرير</button></div></div><div class="card" style="margin-top:14px"><h3>مقارنة الفترات الأربع</h3>${periodComparisonHTML()}</div>`}
function periodComparisonHTML(){if(!state.students.length)return'<div class="empty">لا توجد بيانات.</div>';return `<div class="table-wrap"><table><thead><tr><th>الطالبة</th><th>ف1</th><th>ف2</th><th>ف3</th><th>ف4</th><th>المتوسط العام</th></tr></thead><tbody>${state.students.map(s=>{const vs=[1,2,3,4].map(p=>totalStudentPeriod(s.id,p));return `<tr><td>${esc(s.name)}</td>${vs.map(v=>`<td>${fmt(v,2)}</td>`).join('')}<td>${fmt(avg(vs),2)}</td></tr>`}).join('')}</tbody></table></div>`}
function showStudentReport(id){const s=studentById(id);if(!s)return;const vals=[1,2,3,4].map(p=>({p,ev:ensureEval(id,p),total:totalStudentPeriod(id,p),wa:s.groupId?worksheetAvgForGroup(s.groupId,p):0}));const html=`<div id="reportPrint" class="report-sheet"><h2>تقرير الطالبة</h2><p><strong>الطالبة:</strong> ${esc(s.name)} &nbsp; <strong>المجموعة:</strong> ${esc(groupById(s.groupId)?.name||'—')} &nbsp; <strong>الدور:</strong> ${esc(s.role||'عضو')}</p><div class="table-wrap"><table><thead><tr><th>المعيار</th>${[1,2,3,4].map(p=>`<th>الفترة ${p}</th>`).join('')}</tr></thead><tbody>${[['interaction','التفاعل'],['response','الاستجابة'],['cooperation','التعاون'],['responsibility','المسؤولية'],['completion','إنجاز المهمة']].map(([k,l])=>`<tr><td>${l}</td>${vals.map(x=>`<td>${x.ev[k]}</td>`).join('')}</tr>`).join('')}<tr><td>أوراق العمل /5</td>${vals.map(x=>`<td>${x.wa?fmt(x.wa,2):'—'}</td>`).join('')}</tr><tr><td><strong>متوسط الفترة</strong></td>${vals.map(x=>`<td><strong>${fmt(x.total,2)}</strong></td>`).join('')}</tr></tbody></table></div><h3>المتوسط العام: ${fmt(avg(vals.map(x=>x.total)),2)} / 5 — ${level(avg(vals.map(x=>x.total)))}</h3><div class="grid cards-2"><div><strong>نقاط القوة:</strong><p>${studentStrengths(id)}</p></div><div><strong>جوانب التحسين:</strong><p>${studentImprovements(id)}</p></div></div><p><strong>توصية:</strong> ${studentRecommendation(id)}</p></div><div class="row" style="margin-top:12px"><button onclick="printReportModal()">طباعة التقرير</button></div>`;openModal('تقرير الطالبة',html)}
function studentStrengths(id){const a=['interaction','response','cooperation','responsibility','completion'];const labels={interaction:'التفاعل',response:'الاستجابة',cooperation:'التعاون',responsibility:'تحمل المسؤولية',completion:'إنجاز المهمة'};const ranked=a.map(k=>[k,avg([1,2,3,4].map(p=>ensureEval(id,p)[k]))]).sort((x,y)=>y[1]-x[1]);return ranked.filter(x=>x[1]>=4).map(x=>labels[x[0]]).join('، ')||'الأداء متوازن ويحتاج إلى استمرار المتابعة.'}
function studentImprovements(id){const a=['interaction','response','cooperation','responsibility','completion'];const labels={interaction:'التفاعل',response:'الاستجابة',cooperation:'التعاون',responsibility:'تحمل المسؤولية',completion:'إنجاز المهمة'};const ranked=a.map(k=>[k,avg([1,2,3,4].map(p=>ensureEval(id,p)[k]))]).sort((x,y)=>x[1]-y[1]);return ranked.filter(x=>x[1]<3.5).map(x=>labels[x[0]]).join('، ')||'لا توجد جوانب منخفضة بوضوح.'}
function studentRecommendation(id){const v=avg([1,2,3,4].map(p=>totalStudentPeriod(id,p)));return v>=4.5?'الاستمرار في تعزيز دور الطالبة القيادي ومشاركة خبراتها مع المجموعة.':v>=3.5?'تشجيع الطالبة على زيادة المبادرة والمحافظة على مستوى الأداء.':v>=2.5?'تحديد دور واضح للطالبة في كل نشاط مع تعزيز فوري للمشاركة.':'تحتاج الطالبة إلى متابعة قريبة، وأدوار قصيرة ومحددة، وتعزيز متكرر لكل استجابة إيجابية.'}
function showGroupReport(id){const g=groupById(id);if(!g)return;const ss=studentsInGroup(id);const rows=ss.map(s=>`<tr><td>${esc(s.name)}</td>${[1,2,3,4].map(p=>`<td>${fmt(totalStudentPeriod(s.id,p),2)}</td>`).join('')}<td>${fmt(avg([1,2,3,4].map(p=>totalStudentPeriod(s.id,p))),2)}</td></tr>`).join('');const html=`<div id="reportPrint" class="report-sheet"><h2>تقرير المجموعة</h2><h3>${esc(g.name)}</h3><div class="table-wrap"><table><thead><tr><th>الطالبة</th><th>ف1</th><th>ف2</th><th>ف3</th><th>ف4</th><th>المتوسط</th></tr></thead><tbody>${rows||'<tr><td colspan="6">لا توجد طالبات</td></tr>'}</tbody></table></div><p><strong>متوسط المجموعة العام:</strong> ${ss.length?fmt(avg(ss.map(s=>avg([1,2,3,4].map(p=>totalStudentPeriod(s.id,p))))),2):'—'} / 5</p></div><div class="row" style="margin-top:12px"><button onclick="printReportModal()">طباعة التقرير</button></div>`;openModal('تقرير المجموعة',html)}
function printReportModal(){const report=document.getElementById('reportPrint');if(!report)return;const w=window.open('','_blank');w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>تقرير</title><link rel="stylesheet" href="style.css"></head><body>${report.outerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

function renderSettings(){const s=state.settings;const el=document.getElementById('view-settings');el.innerHTML=`<div class="section-head"><div><h2>الإعدادات</h2><div class="muted">بيانات التقارير والفترة الحالية</div></div></div><div class="card"><div class="grid cards-2"><div class="field"><label>اسم المعلمة</label><input id="setTeacher" value="${esc(s.teacher||'')}"></div><div class="field"><label>اسم المدرسة</label><input id="setSchool" value="${esc(s.school||'')}"></div><div class="field"><label>المادة</label><input id="setSubject" value="${esc(s.subject||'')}"></div><div class="field"><label>الصف</label><input id="setGrade" value="${esc(s.grade||'')}"></div><div class="field"><label>الشعبة الحالية</label><input id="setSection" value="${esc(s.section||'')}"></div><div class="field"><label>الفصل الدراسي</label><input id="setTerm" value="${esc(s.term||'')}"></div><div class="field"><label>الفترة الحالية</label><select id="setPeriod">${[1,2,3,4].map(p=>`<option ${+s.currentPeriod===p?'selected':''}>${p}</option>`).join('')}</select></div></div><div class="row" style="margin-top:14px"><button onclick="saveSettings()">حفظ الإعدادات</button><button class="danger" onclick="resetAll()">مسح بيانات الشعبة الحالية</button><button class="danger secondary" onclick="deleteCurrentSection()">حذف الشعبة الحالية</button></div></div>`}
function saveSettings(){const newSectionName=document.getElementById('setSection').value.trim()||currentSection()?.name||'الشعبة';const sec=currentSection();if(sec)sec.name=newSectionName;Object.assign(state.settings,{teacher:document.getElementById('setTeacher').value.trim(),school:document.getElementById('setSchool').value.trim(),subject:document.getElementById('setSubject').value.trim(),grade:document.getElementById('setGrade').value.trim(),section:newSectionName,term:document.getElementById('setTerm').value.trim(),currentPeriod:+document.getElementById('setPeriod').value});persistMeta();saveState();alert('تم حفظ الإعدادات')}
function resetAll(){if(confirm('سيتم حذف جميع الطالبات والمجموعات والدرجات من الشعبة الحالية فقط. متابعة؟')){state=blankState(currentSection()?.name||'');saveState()}}

function exportBackup(){
  const sections={};
  sectionsMeta.sections.forEach(s=>sections[s.id]=parseJSON(localStorage.getItem(sectionStorageKey(s.id)),blankState(s.name)));
  const payload={type:'coop_group_tracker_multi_section',version:2,meta:sectionsMeta,activeId:activeSectionId,sections};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`نسخة-احتياطية-كل-الشعب-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)
}
document.getElementById('backupBtn').onclick=exportBackup;
document.getElementById('restoreInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());
  if(data.type==='coop_group_tracker_multi_section'&&data.meta?.sections?.length&&data.sections){
    if(confirm('استيراد النسخة سيستبدل بيانات جميع الشعب الحالية. متابعة؟')){
      sectionsMeta=data.meta;
      sectionsMeta.sections.forEach(s=>localStorage.setItem(sectionStorageKey(s.id),JSON.stringify(data.sections[s.id]||blankState(s.name))));
      activeSectionId=(data.activeId&&sectionsMeta.sections.some(s=>s.id===data.activeId))?data.activeId:sectionsMeta.sections[0].id;
      persistMeta();state=loadState();renderAll();alert('تم استيراد النسخة الاحتياطية لجميع الشعب بنجاح')
    }
  }else if(data.students&&data.groups&&data.settings){
    if(confirm('هذه نسخة قديمة لشعبة واحدة. سيتم استيرادها إلى الشعبة الحالية. متابعة؟')){state=data;saveState();alert('تم استيراد النسخة إلى الشعبة الحالية بنجاح')}
  }else throw new Error();
}catch{alert('ملف النسخة الاحتياطية غير صالح')}e.target.value=''})
document.getElementById('printBtn').onclick=()=>window.print();

window.setView=setView;window.switchSection=switchSection;window.addSection=addSection;window.deleteCurrentSection=deleteCurrentSection;window.showBulkStudents=showBulkStudents;window.addBulkStudents=addBulkStudents;window.showStudentForm=showStudentForm;window.saveStudent=saveStudent;window.deleteStudent=deleteStudent;window.showStudentReport=showStudentReport;window.showGroupForm=showGroupForm;window.saveGroup=saveGroup;window.deleteGroup=deleteGroup;window.showGroupReport=showGroupReport;window.showWorksheetForm=showWorksheetForm;window.saveWorksheet=saveWorksheet;window.deleteWorksheet=deleteWorksheet;window.incQuick=incQuick;window.changePeriod=changePeriod;window.showEvaluation=showEvaluation;window.saveEvaluation=saveEvaluation;window.printReportModal=printReportModal;window.saveSettings=saveSettings;window.resetAll=resetAll;
renderAll();
