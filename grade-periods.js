// مسودة: فترتان بنفس سلم أعمال السنة (60 لكل فترة)، دون اختبار نهائي.
// لا تُنشر على الفرع الرئيسي قبل اختبار الاستعادة والنسخ الاحتياطي.
(() => {
  const originalNewStudent = newStudent;
  const originalRender = render;
  const parts = [
    ['participation60','المشاركة',10],
    ['homework60','الواجبات',10],
    ['projects60','المشاريع',10],
    ['tasks60','المهام الأدائية',10],
    ['periodTest60','اختبار الفترة',20]
  ];
  const pkey=(period,key)=>period===1?key:'p2_'+key;
  const value=(s,key,max)=>s[key]===''||s[key]===undefined||s[key]===null?0:Math.max(0,Math.min(max,Number(s[key])||0));
  const hasPeriod=(s,p)=>parts.some(([key])=>s[pkey(p,key)]!==''&&s[pkey(p,key)]!==undefined&&s[pkey(p,key)]!==null);
  const periodTotal=(s,p)=>parts.reduce((sum,[key,,max])=>sum+value(s,pkey(p,key),max),0);
  const calc=(s)=>{
    const p1=periodTotal(s,1),p2=periodTotal(s,2);
    const completed=[1,2].filter(p=>hasPeriod(s,p));
    const coursework=completed.length?Math.round(completed.reduce((sum,p)=>sum+periodTotal(s,p),0)/completed.length*100)/100:0;
    const total=coursework;
    const percentage=Math.round(coursework/60*100);
    let level='تحتاج متابعة',levelClass='level-follow',icon='🔴';
    if(percentage>=90){level='ممتاز';levelClass='level-excellent';icon='🌟';}
    else if(percentage>=80){level='جيد جدًا';levelClass='level-verygood';icon='🟢';}
    else if(percentage>=70){level='جيد';levelClass='level-good';icon='🔵';}
    else if(percentage>=60){level='مقبول';levelClass='level-acceptable';icon='🟠';}
    return {p1,p2,coursework,total,percentage,level,levelClass,icon,defaultNote:'',practical:0,homework:0,participation:0,activity:0,test1:0,test2:0,test3:0,testAverage:0};
  };
  newStudent=function(data={}){
    const s=originalNewStudent(data);
    for(const [key] of parts){s[key]=data[key]??'';s['p2_'+key]=data['p2_'+key]??'';}
    return s;
  };
  studentResult=calc;
  const scoreInput=(s,i,p,key,label,max)=>`<label class="score-field"><span>${label} / ${max}</span><input class="grade-input" type="number" min="0" max="${max}" step="0.5" inputmode="decimal" value="${escapeHtml(s[pkey(p,key)]??'')}" data-index="${i}" data-field="${pkey(p,key)}" aria-label="${label} - الفترة ${p}"></label>`;
  const resultCell=(r)=>`<td data-result="total">${r.coursework+' / 60'}</td><td data-result="percentage">${r.percentage}%</td><td data-result="level"><span class="level-badge ${r.levelClass}">${r.icon} ${r.level}</span></td>`;
  render=function(){
    originalRender();
    table.innerHTML='';
    students.forEach((s,i)=>{
      const r=calc(s),row=document.createElement('tr');
      row.dataset.rowIndex=i;
      row.innerHTML=`<td>${i+1}</td><td><input class="name-input" type="text" value="${escapeHtml(s.name)}" data-index="${i}" data-field="name"></td>
      <td class="periods-cell"><div class="period-title">الفترة الأولى</div><div class="period-title">الفترة الثانية</div></td>
      ${parts.map(([key,label,max])=>`<td class="periods-cell">${scoreInput(s,i,1,key,label,max)}${scoreInput(s,i,2,key,label,max)}</td>`).join('')}
      <td class="periods-cell"><strong>${r.p1} / 60</strong><strong>${r.p2} / 60</strong></td>
      <td data-result="coursework">${r.coursework} / 60</td>
      ${resultCell(r)}<td><button class="report-button" type="button" data-report="${i}">📄 تقرير</button></td><td><button class="delete-button" type="button" data-delete="${i}">حذف</button></td>`;
      table.appendChild(row);
    });
    updateAnalysis();
  };
  updateRow=function(i){
    const row=table.querySelector(`tr[data-row-index="${i}"]`);
    if(!row||!students[i])return;
    const r=calc(students[i]);
    const totals=row.querySelectorAll('.periods-cell strong');
    if(totals.length===2){totals[0].textContent=r.p1+' / 60';totals[1].textContent=r.p2+' / 60';}
    row.querySelector('[data-result="coursework"]').textContent=r.coursework+' / 60';
    row.querySelector('[data-result="total"]').textContent=r.coursework+' / 60';
    row.querySelector('[data-result="percentage"]').textContent=r.percentage+'%';
    row.querySelector('[data-result="level"]').innerHTML=`<span class="level-badge ${r.levelClass}">${r.icon} ${r.level}</span>`;
  };
  const report=(s)=>{
    const r=calc(s);
    return [`الفترة الأولى: ${r.p1} / 60`,`الفترة الثانية: ${r.p2} / 60`,`متوسط أعمال السنة: ${r.coursework} / 60`,`المجموع: ${r.coursework+' / 60'}`,`المستوى: ${r.level}`].join('\n');
  };
  openReport=function(i){
    currentReportIndex=i;
    const s=students[i],r=calc(s);
    document.getElementById('reportMeta').textContent=[document.getElementById('school').value,document.getElementById('teacher').value,activeClass()?.name||''].filter(Boolean).join(' • ');
    document.getElementById('reportName').textContent=s.name||'غير مسجل';
    document.getElementById('reportPercentage').textContent=r.percentage+'%';
    document.getElementById('reportLevel').textContent=r.icon+' '+r.level;
    reportNote.value=s.note||'';
    document.querySelector('#reportContent .report-grid').innerHTML=[['الفترة الأولى',r.p1+' / 60'],['الفترة الثانية',r.p2+' / 60'],['متوسط أعمال السنة',r.coursework+' / 60'],['المجموع',r.coursework+' / 60']].map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  };
  reportText=function(){
    if(currentReportIndex===null)return '';
    const s=students[currentReportIndex];
    return `تقرير متابعة الطالبة\nاسم الطالبة: ${s.name||'غير مسجل'}\nالشعبة: ${activeClass()?.name||''}\n${report(s)}\nملاحظة المعلمة: ${reportNote.value.trim()}`;
  };
  printCurrentReport=function(){
    if(currentReportIndex===null)return;
    students[currentReportIndex].note=reportNote.value.trim();save(false);
    const w=window.open('','_blank');if(!w)return alert('اسمحي بالنوافذ المنبثقة');
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>body{font:16px Tahoma,Arial;padding:30px;line-height:2}pre{font:inherit;white-space:pre-wrap}</style><h2>تقرير متابعة</h2><pre>${escapeHtml(reportText())}</pre><script>onload=()=>print()<\/script></html>`);
    w.document.close();
  };
  for(const id of ['printReport','printBlankRoster']){
    const old=document.getElementById(id),replacement=old.cloneNode(true);
    old.replaceWith(replacement);
    replacement.addEventListener('click',()=>{
      if(id==='printReport')return printCurrentReport();
      const list=students.filter(s=>s.name.trim());
      const w=window.open('','_blank');if(!w)return alert('اسمحي بالنوافذ المنبثقة');
      const cols=['م','اسم الطالبة','الفترة',...parts.map(f=>f[1]),'مجموع الفترة / 60','متوسط الفترتين / 60'];
      w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>@page{size:A4 landscape}body{font:12px Tahoma,Arial}table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:7px}th{background:#eee}</style><h2>كشف متابعة — ${escapeHtml(activeClass()?.name||'')}</h2><table><tr>${cols.map(c=>'<th>'+c+'</th>').join('')}</tr>${list.map((s,i)=>[1,2].map(p=>`<tr><td>${i+1}</td><td>${escapeHtml(s.name)}</td><td>الفترة ${p}</td>${parts.map(()=>'<td></td>').join('')}<td></td><td></td></tr>`).join('')).join('')}</table><script>onload=()=>print()<\/script>`);
      w.document.close();
    });
  }
  const style=document.createElement('style');
  style.textContent='.score-field{display:flex;flex-direction:column;gap:3px;min-width:95px;font-size:11px}.score-field input{width:85px;box-sizing:border-box}.periods-cell{vertical-align:top}.periods-cell>.score-field+ .score-field,.period-title+.period-title,.periods-cell>strong+strong{margin-top:12px;border-top:1px solid #ddd;padding-top:10px}.periods-cell>strong{display:block}.period-title{min-height:56px;display:flex;align-items:center;font-weight:bold;white-space:nowrap}';
  document.head.appendChild(style);
  render();
})();