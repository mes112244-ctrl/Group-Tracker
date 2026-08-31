
(() => {
  const originalStudentResult = studentResult;
  const originalNewStudent = newStudent;
  const originalRender = render;
  const originalOpenReport = openReport;
  const originalReportText = reportText;
  const originalPrintBlankRoster = printBlankRoster;

  function participationValues(student) {
    const old = student.participation ?? "";
    const values = [1,2,3,4].map(n => {
      const key = `participation${n}`;
      if (student[key] !== undefined && student[key] !== null) return student[key];
      return old;
    });
    return values;
  }

  function participationAverage(student) {
    const vals = participationValues(student).map(v => numberValue(v, 5));
    return Math.round((vals.reduce((a,b)=>a+b,0) / 4) * 100) / 100;
  }

  newStudent = function(data = {}) {
    const s = originalNewStudent(data);
    const old = data.participation ?? s.participation ?? "";
    [1,2,3,4].forEach(n => {
      const key = `participation${n}`;
      s[key] = data[key] ?? old;
    });
    s.participation = participationAverage(s);
    return s;
  };

  studentResult = function(student) {
    const avg = participationAverage(student);
    const result = originalStudentResult({ ...student, participation: avg });
    result.participation = avg;
    result.participationParts = participationValues(student).map(v => numberValue(v,5));
    return result;
  };

  function splitCellHtml(student, index) {
    const vals = participationValues(student);
    const avg = participationAverage(student);
    return `
      <div class="participation-grid" aria-label="المشاركة مقسمة إلى أربع خانات">
        ${[1,2,3,4].map((n,i)=>`
          <label class="participation-part">
            <span>${n}</span>
            <input class="grade-input participation-input" type="number" inputmode="decimal"
              min="0" max="5" step="0.5" value="${escapeHtml(vals[i])}"
              data-index="${index}" data-field="participation${n}" aria-label="المشاركة ${n}">
          </label>`).join("")}
      </div>
      <div class="participation-average" data-participation-average="${index}">المتوسط: ${avg} / 5</div>`;
  }

  function enhanceRows() {
    students.forEach((student,index) => {
      [1,2,3,4].forEach(n => {
        const key = `participation${n}`;
        if (student[key] === undefined) student[key] = student.participation ?? "";
      });
      const oldInput = table.querySelector(`tr[data-row-index="${index}"] [data-field="participation"]`);
      if (!oldInput) return;
      const td = oldInput.closest("td");
      td.classList.add("participation-cell");
      td.innerHTML = splitCellHtml(student, index);
    });
  }

  render = function() {
    originalRender();
    enhanceRows();
  };

  table.addEventListener("input", (event) => {
    const field = event.target?.dataset?.field || "";
    if (!/^participation[1-4]$/.test(field)) return;
    const index = Number(event.target.dataset.index);
    if (!students[index]) return;
    students[index].participation = participationAverage(students[index]);
    const label = table.querySelector(`[data-participation-average="${index}"]`);
    if (label) label.textContent = `المتوسط: ${students[index].participation} / 5`;
    updateRow(index);
    updateAnalysis();
    save(false);
  });

  openReport = function(index) {
    originalOpenReport(index);
    const s = students[index];
    const r = studentResult(s);
    const parts = r.participationParts.map((v,i)=>`${i+1}: ${v}`).join(" | ");
    document.getElementById("reportParticipation").textContent = `${r.participation} / 5 (${parts})`;
  };

  reportText = function() {
    const base = originalReportText();
    if (currentReportIndex === null || !students[currentReportIndex]) return base;
    const r = studentResult(students[currentReportIndex]);
    const detail = r.participationParts.map((v,i)=>`مشاركة ${i+1}: ${v}/5`).join("، ");
    return base.replace(
      new RegExp(`المشاركة:.*`),
      `المشاركة: ${r.participation}/5 — ${detail}`
    );
  };

  printBlankRoster = function() {
    const item = activeClass();
    if (!item) { alert("لا توجد شعبة للطباعة."); return; }
    const namedStudents = students.filter(student => String(student.name || "").trim());
    if (!namedStudents.length) {
      alert("أضيفي أسماء الطالبات أولًا ثم اختاري طباعة الكشف الفارغ.");
      return;
    }
    save(false);
    const school = document.getElementById("school").value.trim();
    const teacher = document.getElementById("teacher").value.trim();
    const className = document.getElementById("className").value.trim() || item.name || "الشعبة";
    const week = document.getElementById("week").value.trim();
    const rows = namedStudents.map((student,index)=>`
      <tr>
        <td>${index+1}</td><td class="student-name">${escapeHtml(student.name)}</td>
        <td></td><td></td>
        <td><div class="paper-four"><span></span><span></span><span></span><span></span></div></td>
        <td></td><td></td><td></td><td></td><td class="notes"></td>
      </tr>`).join("");

    const w = window.open("", "_blank");
    if (!w) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة الكشف."); return; }
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>كشف متابعة فارغ - ${escapeHtml(className)}</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#111;direction:rtl;margin:0}
    h1{text-align:center;font-size:20px;margin:0 0 8px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;font-size:12px}
    .meta div{border:1px solid #777;padding:7px 8px}.meta strong{margin-left:4px}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}th,td{border:1px solid #333;text-align:center;padding:3px;height:30px}
    th{background:#f2f2f2}.student-name{text-align:right;padding-right:7px;font-weight:600}.paper-four{display:grid;grid-template-columns:repeat(4,1fr);height:24px}
    .paper-four span{border-left:1px solid #999}.paper-four span:last-child{border-left:0}.footer{margin-top:7px;font-size:10px;color:#555;display:flex;justify-content:space-between}
    </style></head><body><h1>كشف متابعة الطالبات — فارغ للكتابة الورقية</h1>
    <div class="meta"><div><strong>المدرسة:</strong>${escapeHtml(school||"________________")}</div>
    <div><strong>المعلمة:</strong>${escapeHtml(teacher||"________________")}</div><div><strong>الشعبة:</strong>${escapeHtml(className)}</div>
    <div><strong>الأسبوع:</strong>${escapeHtml(week||"________________")}</div></div>
    <table><thead><tr><th>م</th><th>اسم الطالبة</th><th>العملي</th><th>الواجب</th><th>المشاركة<br>1 | 2 | 3 | 4</th><th>النشاط</th>
    <th>الاختبار 1</th><th>الاختبار 2</th><th>الاختبار 3</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer"><span>عدد الطالبات: ${namedStudents.length}</span><span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</span></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  };

  printBlankRosterButton.removeEventListener("click", originalPrintBlankRoster);
  printBlankRosterButton.addEventListener("click", printBlankRoster);

  const style = document.createElement("style");
  style.textContent = `
    .participation-cell{min-width:210px}
    .participation-grid{display:grid;grid-template-columns:repeat(4,minmax(42px,1fr));gap:4px}
    .participation-part{display:grid;gap:3px;text-align:center}
    .participation-part span{font-size:11px;color:#667085;font-weight:700}
    .participation-input{min-width:0!important;width:100%!important;padding:6px 3px!important;text-align:center}
    .participation-average{margin-top:5px;font-size:11px;font-weight:700;color:#475467;white-space:nowrap}
    @media(max-width:700px){.participation-cell{min-width:180px}.participation-grid{grid-template-columns:repeat(4,40px)}}
    @media print{.participation-grid{gap:2px}.participation-average{font-size:9px}}
  `;
  document.head.appendChild(style);

  // تحويل البيانات الحالية دون فقدان الدرجة القديمة ثم إعادة رسم الجدول.
  appState.classes.forEach(c => c.students.forEach(s => {
    const old = s.participation ?? "";
    [1,2,3,4].forEach(n => {
      const key = `participation${n}`;
      if (s[key] === undefined) s[key] = old;
    });
    s.participation = participationAverage(s);
  }));
  save(false);
  render();
})();
