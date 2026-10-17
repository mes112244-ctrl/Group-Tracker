// تعديل الفترتين على المنصة الأصلية، مع الإبقاء على وظائف الشعب والحفظ والتحليل.
(() => {
  const originalNewStudent = newStudent;
  const originalRender = render;
  const originalOpenReport = openReport;
  const originalReportText = reportText;
  const originalPrintCurrentReport = printCurrentReport;
  const labels = ['المشاركة والتفاعل','الواجبات والمشروع','المهام الأدائية','العملي'];
  const fields = ['participation','homework','activity','practical'];
  const caps = [10,10,10,5];
  const testFields = ['test1','test2','test3','test4'];
  const round = n => Math.round(n*100)/100;
  const num = (v,max) => numberValue(v,max);
  const periodKeys = (p) => [...fields.map(f=>`p${p}_${f}`),...testFields.map(f=>`p${p}_${f}`)];
  function period(s,p){
    const scores=fields.map((f,i)=>num(s[`p${p}_${f}`],caps[i]));
    const tests=testFields.map(f=>num(s[`p${p}_${f}`],15));
    const average=round(tests.reduce((a,b)=>a+b,0)/4);
    const total=round(scores.reduce((a,b)=>a+b,0)+average);
    return {scores,tests,average,total};
  }
  newStudent = function(data={}) {
    const s=originalNewStudent(data);
    // لا تُحذف البيانات القديمة؛ تُحفظ معها حقول الفترتين المستقلة.
    for(const p of [1,2]) for(const key of periodKeys(p)) s[key]=data[key]??'';
    return s;
  };
  studentResult = function(s) {
    const p1=period(s,1),p2=period(s,2),total=round(p1.total+p2.total),percentage=Math.round(total);
    let level='تحتاج متابعة',levelClass='level-follow',icon='🔴';
    let defaultNote='تحتاج الطالبة إلى متابعة ودعم إضافي.';
    if(percentage>=90){level='ممتاز';levelClass='level-excellent';icon='🌟';defaultNote='أداء متميز جدًا.';}
    else if(percentage>=80){level='جيد جدًا';levelClass='level-verygood';icon='🟢';defaultNote='أداء جيد جدًا.';}
    else if(percentage>=70){level='جيد';levelClass='level-good';icon='🔵';defaultNote='أداء جيد.';}
    else if(percentage>=60){level='مقبول';levelClass='level-acceptable';icon='🟠';defaultNote='المستوى مقبول ويحتاج إلى تحسين.';}
    return {p1,p2,total,percentage,level,levelClass,icon,defaultNote,
      practical:p1.scores[3],homework:p1.scores[1],participation:p1.scores[0],activity:p1.scores[2],
      test1:p1.tests[0],test2:p1.tests[1],test3:p1.tests[2],testAverage:p1.average};
  };
  function periodHtml(s,index,p){
    const r=period(s,p);
    const cells=fields.map((f,i)=>input(s,index,`p${p}_${f}`,caps[i],labels[i])).join('');
    const tests=testFields.map((f,i)=>input(s,index,`p${p}_${f}`,15,`الاختبار ${i+1}`)).join('');
    return `<div class="period-panel"><strong>الفترة ${p===1?'الأولى':'الثانية'}</strong><div class="period-fields">${cells}${tests}</div><div class="period-summary">معدل الاختبارات: <b data-period-average="${p}">${r.average} / 15</b> · المجموع: <b data-period-total="${p}">${r.total} / 50</b></div></div>`;
  }
  function input(s,index,key,max,label){
    return `<label class="period-field"><span>${label} / ${max}</span><input class="grade-input" type="number" min="0" max="${max}" step="0.5" inputmode="decimal" value="${escapeHtml(s[key]??'')}" data-index="${index}" data-field="${key}" aria-label="${label}"></label>`;
  }
  render=function(){
    originalRender(); // يحافظ على تحديث الشعب والتحليل والإجراءات الأصلية
    table.innerHTML='';
    students.forEach((s,i)=>{
      const r=studentResult(s),row=document.createElement('tr');row.dataset.rowIndex=i;
      row.innerHTML=`<td>${i+1}</td><td><input class="name-input" type="text" value="${escapeHtml(s.name)}" data-index="${i}" data-field="name" placeholder="اسم الطالبة"></td>
      <td>${periodHtml(s,i,1)}</td><td>${periodHtml(s,i,2)}</td>
      <td class="total-cell" data-result="total">${r.total} / 100</td><td class="percent-cell" data-result="percentage">${r.percentage}%</td>
      <td data-result="level"><span class="level-badge ${r.levelClass}">${r.icon} ${r.level}</span></td>
      <td><button class="report-button" type="button" data-report="${i}">📄 تقرير</button></td>
      <td><button class="delete-button" type="button" data-delete="${i}">حذف</button></td>`;
      table.appendChild(row);
    });
    updateAnalysis();
  };
  updateRow=function(i){
    const row=table.querySelector(`tr[data-row-index="${i}"]`);if(!row||!students[i])return;
    const r=studentResult(students[i]);
    row.querySelector('[data-result="total"]').textContent=`${r.total} / 100`;
    row.querySelector('[data-result="percentage"]').textContent=`${r.percentage}%`;
    row.querySelector('[data-result="level"]').innerHTML=`<span class="level-badge ${r.levelClass}">${r.icon} ${r.level}</span>`;
    for(const p of [1,2]){
      row.querySelector(`[data-period-average="${p}"]`).textContent=`${r[`p${p}`].average} / 15`;
      row.querySelector(`[data-period-total="${p}"]`).textContent=`${r[`p${p}`].total} / 50`;
    }
  };
  function detail(s){
    return [1,2].map(p=>{
      const r=period(s,p);
      return `الفترة ${p}:\n`+fields.map((f,i)=>`${labels[i]}: ${r.scores[i]}/${caps[i]}`).join('\n')+'\n'+
      r.tests.map((v,i)=>`الاختبار ${i+1}: ${v}/15`).join('\n')+`\nمعدل الاختبارات: ${r.average}/15\nمجموع الفترة: ${r.total}/50`;
    }).join('\n\n');
  }
  openReport=function(index){
    originalOpenReport(index);
    const s=students[index],r=studentResult(s);
    // استبدال محتوى شبكة التقرير القديمة فقط، مع بقاء نافذة التقرير وأزرارها.
    const grid=document.querySelector('#reportContent .report-grid');
    grid.innerHTML=[1,2].map(p=>{
      const x=r[`p${p}`];
      return `<div class="report-period"><h3>الفترة ${p===1?'الأولى':'الثانية'} — ${x.total} / 50</h3><div class="period-report-grid">`+
        fields.map((f,i)=>`<div><span>${labels[i]}</span><strong>${x.scores[i]} / ${caps[i]}</strong></div>`).join('')+
        x.tests.map((v,i)=>`<div><span>الاختبار ${i+1}</span><strong>${v} / 15</strong></div>`).join('')+
        `<div><span>معدل الاختبارات</span><strong>${x.average} / 15</strong></div></div></div>`;
    }).join('')+`<div class="report-period"><strong>المجموع النهائي: ${r.total} / 100</strong></div>`;
    document.getElementById('reportTotal').textContent=`${r.total} / 100`;
  };
  reportText=function(){
    if(currentReportIndex===null)return '';
    const s=students[currentReportIndex],r=studentResult(s);
    return `تقرير متابعة الطالبة\nاسم الطالبة: ${s.name||'غير مسجل'}\nالشعبة: ${activeClass()?.name||''}\n\n${detail(s)}\n\nالمجموع: ${r.total}/100\nالنسبة: ${r.percentage}%\nالمستوى: ${r.level}\nملاحظة المعلمة: ${reportNote.value.trim()}`;
  };
  // التقرير المطبوع يعتمد البيانات الجديدة وليس حقول الاختبارات القديمة.
  printCurrentReport=function(){
    if(currentReportIndex===null)return;
    const s=students[currentReportIndex],r=studentResult(s);
    s.note=reportNote.value.trim();save(false);
    const w=window.open('','_blank');if(!w){alert('اسمحي بالنوافذ المنبثقة للطباعة.');return;}
    const sections=[1,2].map(p=>{
      const x=r[`p${p}`];return `<h2>الفترة ${p===1?'الأولى':'الثانية'} — ${x.total}/50</h2><div class="grid">`+
        fields.map((f,i)=>`<div>${labels[i]}: ${x.scores[i]}/${caps[i]}</div>`).join('')+
        x.tests.map((v,i)=>`<div>الاختبار ${i+1}: ${v}/15</div>`).join('')+
        `<div>معدل الاختبارات: ${x.average}/15</div></div>`;
    }).join('');
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير الطالبة</title><style>body{font:15px Tahoma,Arial;padding:30px}h1{text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid div{border:1px solid #ddd;padding:12px;border-radius:8px}h2{margin-top:22px}@media print{body{padding:0}}</style></head><body><h1>تقرير متابعة الطالبة</h1><p>الاسم: ${escapeHtml(s.name)}</p><p>الشعبة: ${escapeHtml(activeClass()?.name||'')}</p>${sections}<h2>المجموع النهائي: ${r.total}/100 — ${r.percentage}% — ${r.level}</h2><p>ملاحظة المعلمة: ${escapeHtml(s.note)}</p><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();
  };
  // استبدال مستمع زر الطباعة القديم الذي تم ربطه قبل هذا الملف.
  const printBtn=document.getElementById('printReport');
  const replacement=printBtn.cloneNode(true);printBtn.replaceWith(replacement);
  replacement.addEventListener('click',()=>printCurrentReport());
  // كشف ورقي فارغ للفترتين، دون التأثير في بقية أدوات المنصة.
  const blank=document.getElementById('printBlankRoster'),blankCopy=blank.cloneNode(true);
  blank.replaceWith(blankCopy);
  blankCopy.addEventListener('click',()=>{
    const named=students.filter(s=>s.name.trim());if(!named.length){alert('أضيفي أسماء الطالبات أولًا.');return;}
    const w=window.open('','_blank');if(!w){alert('اسمحي بالنوافذ المنبثقة للطباعة.');return;}
    const columns=['م','اسم الطالبة',...['الأولى','الثانية'].flatMap(p=>[`مشاركة ${p}`,`واجب ومشروع ${p}`,`مهام ${p}`,`عملي ${p}`,`اختبارات ${p}`,`مجموع ${p}`]),'النهائي'];
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A3 landscape;margin:8mm}body{font:11px Tahoma,Arial}table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:8px;text-align:center}th{background:#eee}</style></head><body><h2>كشف متابعة — ${escapeHtml(activeClass()?.name||'')}</h2><table><thead><tr>${columns.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${named.map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(s.name)}</td>${Array(13).fill('<td></td>').join('')}</tr>`).join('')}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();
  });
  const style=document.createElement('style');style.textContent=`
    .period-panel{min-width:320px;text-align:right;padding:6px}.period-panel>strong{display:block;margin-bottom:8px;color:#334155}
    .period-fields{display:grid;grid-template-columns:repeat(4,minmax(70px,1fr));gap:7px}
    .period-field{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#475569}
    .period-field input{width:100%;min-width:0;box-sizing:border-box}
    .period-summary{font-size:12px;margin-top:9px;color:#334155;white-space:nowrap}
    .report-period{grid-column:1/-1;border:1px solid #e2e8f0;padding:12px;border-radius:10px;margin-bottom:8px}
    .period-report-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
    .period-report-grid>div{padding:6px;background:#f8fafc;border-radius:6px}
    .period-report-grid span{display:block;font-size:11px;color:#64748b}
    .period-report-grid strong{font-size:13px}
    @media(max-width:700px){.period-panel{min-width:280px}.period-fields{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(style);
  render();
})();
