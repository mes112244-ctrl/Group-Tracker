const table = document.getElementById("studentTable");
const addButton = document.getElementById("addStudent");
const saveButton = document.getElementById("saveData");
const printPageButton = document.getElementById("printPage");
const printBlankRosterButton = document.getElementById("printBlankRoster");
const saveStatus = document.getElementById("saveStatus");
const backupButton = document.getElementById("backupData");
const restoreButton = document.getElementById("restoreData");
const restoreFile = document.getElementById("restoreFile");
const modal = document.getElementById("reportModal");
const reportNote = document.getElementById("reportNote");
const pasteNamesButton = document.getElementById("pasteNames");
const pastePanel = document.getElementById("pastePanel");
const namesText = document.getElementById("namesText");
const importNamesButton = document.getElementById("importNames");
const cancelPasteButton = document.getElementById("cancelPaste");
const classTabs = document.getElementById("classTabs");
const addClassButton = document.getElementById("addClass");
const renameClassButton = document.getElementById("renameClass");
const deleteClassButton = document.getElementById("deleteClass");
const classNameInput = document.getElementById("className");
const activeClassTitle = document.getElementById("activeClassTitle");
const analysisPanel = document.getElementById("analysisPanel");
const toggleAnalysisButton = document.getElementById("toggleAnalysis");
const printAnalysisButton = document.getElementById("printAnalysis");
const chartCanvas = document.getElementById("studentChart");
const chartEmpty = document.getElementById("chartEmpty");

const TEST_MAX = 20;
const TOTAL_MAX = 90;
const STORAGE_KEY = "studentTrackerAppV5";
let appState = { school: "", teacher: "", week: "", classes: [], activeClassId: "" };
let students = [];
let currentReportIndex = null;

function uid() {
  return `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function numberValue(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || value === "") return 0;
  return Math.min(Math.max(n, 0), max);
}

function studentResult(student) {
  const practical = numberValue(student.practical ?? student.attendance, 5);
  const homework = numberValue(student.homework, 10);
  const participation = numberValue(student.participation, 5);
  const activity = numberValue(student.activity, 10);
  const test1 = numberValue(student.test1, TEST_MAX);
  const test2 = numberValue(student.test2, TEST_MAX);
  const test3 = numberValue(student.test3, TEST_MAX);
  const testAverage = Math.round(((test1 + test2 + test3) / 3) * 10) / 10;
  const total = practical + homework + participation + activity + test1 + test2 + test3;
  const percentage = Math.round((total / TOTAL_MAX) * 100);

  let level = "تحتاج متابعة", levelClass = "level-follow", icon = "🔴";
  let defaultNote = "تحتاج الطالبة إلى متابعة ودعم إضافي مع التركيز على المراجعة المنتظمة وإكمال المهام.";
  if (percentage >= 90) {
    level = "ممتاز"; levelClass = "level-excellent"; icon = "🌟";
    defaultNote = "أداء متميز جدًا. استمري على هذا المستوى مع المحافظة على المشاركة والمراجعة المنتظمة.";
  } else if (percentage >= 80) {
    level = "جيد جدًا"; levelClass = "level-verygood"; icon = "🟢";
    defaultNote = "أداء جيد جدًا. يمكن الوصول إلى مستوى أعلى بالمزيد من التركيز والمراجعة المستمرة.";
  } else if (percentage >= 70) {
    level = "جيد"; levelClass = "level-good"; icon = "🔵";
    defaultNote = "أداء جيد. يوصى بزيادة المراجعة والاهتمام بالواجبات والمشاركة الصفية.";
  } else if (percentage >= 60) {
    level = "مقبول"; levelClass = "level-acceptable"; icon = "🟠";
    defaultNote = "المستوى مقبول ويحتاج إلى تحسين. يوصى بخطة مراجعة قصيرة ومتابعة المهام أولًا بأول.";
  }
  return { practical, homework, participation, activity, test1, test2, test3, testAverage, total, percentage, level, levelClass, icon, defaultNote };
}

function newStudent(data = {}) {
  return {
    name: data.name || "",
    practical: data.practical ?? data.attendance ?? "",
    homework: data.homework ?? "",
    participation: data.participation ?? "",
    activity: data.activity ?? "",
    test1: data.test1 ?? data.quiz ?? "",
    test2: data.test2 ?? "",
    test3: data.test3 ?? "",
    note: data.note || ""
  };
}

function newClass(name = "شعبة 1", classStudents = []) {
  return { id: uid(), name: name || "شعبة", students: classStudents.map(newStudent) };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function activeClass() {
  let item = appState.classes.find(c => c.id === appState.activeClassId);
  if (!item && appState.classes.length) {
    item = appState.classes[0];
    appState.activeClassId = item.id;
  }
  return item;
}

function syncStudentsReference() {
  const item = activeClass();
  students = item ? item.students : [];
}

function showStatus(message, duration = 2500) {
  saveStatus.textContent = message;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { saveStatus.textContent = ""; }, duration);
}

function addStudent(data = {}) {
  students.push(newStudent(data));
  render();
  save(false);
}

function renderClassTabs() {
  classTabs.innerHTML = "";
  appState.classes.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `class-tab${item.id === appState.activeClassId ? " active" : ""}`;
    button.dataset.classId = item.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", item.id === appState.activeClassId ? "true" : "false");
    button.textContent = item.name || "شعبة";
    classTabs.appendChild(button);
  });
}

function render() {
  syncStudentsReference();
  const item = activeClass();
  const className = item?.name || "الشعبة";
  classNameInput.value = className;
  activeClassTitle.textContent = className;
  renderClassTabs();

  table.innerHTML = "";
  students.forEach((student, index) => {
    const result = studentResult(student);
    const row = document.createElement("tr");
    row.dataset.rowIndex = index;
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input class="name-input" type="text" placeholder="اكتبي اسم الطالبة" value="${escapeHtml(student.name)}" data-index="${index}" data-field="name" autocomplete="off"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="5" value="${student.practical}" data-index="${index}" data-field="practical"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="10" value="${student.homework}" data-index="${index}" data-field="homework"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="5" value="${student.participation}" data-index="${index}" data-field="participation"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="10" value="${student.activity}" data-index="${index}" data-field="activity"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="${TEST_MAX}" value="${student.test1}" data-index="${index}" data-field="test1"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="${TEST_MAX}" value="${student.test2}" data-index="${index}" data-field="test2"></td>
      <td><input class="grade-input" type="number" inputmode="decimal" min="0" max="${TEST_MAX}" value="${student.test3}" data-index="${index}" data-field="test3"></td>
      <td class="average-cell" data-result="average">${result.testAverage} / ${TEST_MAX}</td>
      <td class="total-cell" data-result="total">${result.total} / ${TOTAL_MAX}</td>
      <td class="percent-cell" data-result="percentage">${result.percentage}%</td>
      <td data-result="level"><span class="level-badge ${result.levelClass}">${result.icon} ${result.level}</span></td>
      <td><button class="report-button" type="button" data-report="${index}">📄 تقرير</button></td>
      <td><button class="delete-button" type="button" data-delete="${index}">حذف</button></td>`;
    table.appendChild(row);
  });
  updateAnalysis();
}

function updateRow(index) {
  const row = table.querySelector(`tr[data-row-index="${index}"]`);
  if (!row || !students[index]) return;
  const result = studentResult(students[index]);
  row.querySelector('[data-result="average"]').textContent = `${result.testAverage} / ${TEST_MAX}`;
  row.querySelector('[data-result="total"]').textContent = `${result.total} / ${TOTAL_MAX}`;
  row.querySelector('[data-result="percentage"]').textContent = `${result.percentage}%`;
  row.querySelector('[data-result="level"]').innerHTML = `<span class="level-badge ${result.levelClass}">${result.icon} ${result.level}</span>`;
}

table.addEventListener("input", (event) => {
  const input = event.target;
  if (!input.dataset.field) return;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;
  if (field !== "name" && input.value !== "") {
    const max = Number(input.max);
    let value = Number(input.value);
    if (value > max) value = max;
    if (value < 0) value = 0;
    input.value = value;
  }
  students[index][field] = input.value;
  save(false);
  if (field !== "name") updateRow(index);
  updateAnalysis();
});

table.addEventListener("click", (event) => {
  const reportButton = event.target.closest("[data-report]");
  const deleteButton = event.target.closest("[data-delete]");
  if (reportButton) openReport(Number(reportButton.dataset.report));
  if (deleteButton) {
    const index = Number(deleteButton.dataset.delete);
    const name = students[index]?.name || "هذه الطالبة";
    if (confirm(`هل تريدين حذف ${name}؟`)) {
      students.splice(index, 1);
      save(false);
      render();
    }
  }
});

function save(showMessage = true) {
  appState.school = document.getElementById("school").value;
  appState.teacher = document.getElementById("teacher").value;
  appState.week = document.getElementById("week").value;
  const item = activeClass();
  if (item) item.name = classNameInput.value.trim() || item.name || "شعبة";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  if (showMessage) showStatus("✅ تم حفظ جميع الشعب والبيانات بنجاح");
}

function migrateLegacyData() {
  let oldStudents = [];
  try {
    const saved = JSON.parse(localStorage.getItem("students") || "[]");
    oldStudents = Array.isArray(saved) ? saved.map(newStudent) : [];
  } catch { oldStudents = []; }
  const oldClassName = localStorage.getItem("className") || "شعبة 1";
  const firstClass = newClass(oldClassName, oldStudents);
  if (!firstClass.students.length) firstClass.students.push(newStudent());
  return {
    school: localStorage.getItem("school") || "",
    teacher: localStorage.getItem("teacher") || "",
    week: localStorage.getItem("week") || "",
    classes: [firstClass],
    activeClassId: firstClass.id
  };
}

function normalizeState(data) {
  if (!data || !Array.isArray(data.classes)) return null;
  const classes = data.classes.map((item, index) => ({
    id: item.id || uid(),
    name: item.name || `شعبة ${index + 1}`,
    students: Array.isArray(item.students) ? item.students.map(newStudent) : []
  }));
  if (!classes.length) classes.push(newClass("شعبة 1", [newStudent()]));
  const activeId = classes.some(c => c.id === data.activeClassId) ? data.activeClassId : classes[0].id;
  return {
    school: data.school || "",
    teacher: data.teacher || "",
    week: data.week || "",
    classes,
    activeClassId: activeId
  };
}

function load() {
  let savedState = null;
  try { savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { savedState = null; }
  appState = normalizeState(savedState) || migrateLegacyData();
  document.getElementById("school").value = appState.school;
  document.getElementById("teacher").value = appState.teacher;
  document.getElementById("week").value = appState.week;
  syncStudentsReference();
  render();
  save(false);
}

function switchClass(classId) {
  if (!appState.classes.some(c => c.id === classId)) return;
  if (currentReportIndex !== null) closeReport();
  save(false);
  appState.activeClassId = classId;
  syncStudentsReference();
  pastePanel.hidden = true;
  namesText.value = "";
  render();
  save(false);
}

function uniqueClassName(baseName) {
  const existing = new Set(appState.classes.map(c => c.name.trim()));
  if (!existing.has(baseName)) return baseName;
  let n = 2;
  while (existing.has(`${baseName} ${n}`)) n++;
  return `${baseName} ${n}`;
}

function addClass() {
  const suggested = `شعبة ${appState.classes.length + 1}`;
  const typed = prompt("اكتبي اسم الشعبة الجديدة:", suggested);
  if (typed === null) return;
  const name = uniqueClassName(typed.trim() || suggested);
  const item = newClass(name, [newStudent()]);
  appState.classes.push(item);
  appState.activeClassId = item.id;
  syncStudentsReference();
  render();
  save(false);
  showStatus(`✅ تم إنشاء صفحة مستقلة للشعبة: ${name}`);
}

function renameClass() {
  const item = activeClass();
  if (!item) return;
  const typed = prompt("اكتبي الاسم الجديد للشعبة:", item.name);
  if (typed === null) return;
  const name = typed.trim();
  if (!name) return;
  item.name = name;
  classNameInput.value = name;
  renderClassTabs();
  activeClassTitle.textContent = name;
  updateAnalysis();
  save(false);
  showStatus("✅ تم تغيير اسم الشعبة");
}

function deleteClass() {
  const item = activeClass();
  if (!item) return;
  if (appState.classes.length === 1) {
    alert("يجب أن يبقى في الدفتر شعبة واحدة على الأقل.");
    return;
  }
  if (!confirm(`هل تريدين حذف شعبة «${item.name}» وجميع بيانات طالباتها؟`)) return;
  const index = appState.classes.findIndex(c => c.id === item.id);
  appState.classes.splice(index, 1);
  const next = appState.classes[Math.min(index, appState.classes.length - 1)];
  appState.activeClassId = next.id;
  syncStudentsReference();
  render();
  save(false);
  showStatus("✅ تم حذف الشعبة");
}

classTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-class-id]");
  if (button) switchClass(button.dataset.classId);
});
addClassButton.addEventListener("click", addClass);
renameClassButton.addEventListener("click", renameClass);
deleteClassButton.addEventListener("click", deleteClass);

classNameInput.addEventListener("input", () => {
  const item = activeClass();
  if (!item) return;
  item.name = classNameInput.value || "شعبة";
  activeClassTitle.textContent = item.name;
  renderClassTabs();
  updateAnalysis();
  save(false);
});

function updateAnalysis() {
  const item = activeClass();
  const classLabel = item?.name || "الشعبة";
  document.getElementById("analysisSubtitle").textContent = `تحليل مباشر لدرجات طالبات ${classLabel}`;
  const meaningful = students.filter(s => s.name.trim() || studentResult(s).total > 0);
  const results = meaningful.map(studentResult);
  const count = meaningful.length;
  const average = count ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / count) : 0;
  const highest = count ? Math.max(...results.map(r => r.percentage)) : 0;
  const follow = results.filter(r => r.percentage < 60).length;
  document.getElementById("statCount").textContent = count;
  document.getElementById("statAverage").textContent = `${average}%`;
  document.getElementById("statHighest").textContent = `${highest}%`;
  document.getElementById("statFollow").textContent = follow;

  const levels = [
    ["ممتاز", results.filter(r => r.percentage >= 90).length, "level-excellent"],
    ["جيد جدًا", results.filter(r => r.percentage >= 80 && r.percentage < 90).length, "level-verygood"],
    ["جيد", results.filter(r => r.percentage >= 70 && r.percentage < 80).length, "level-good"],
    ["مقبول", results.filter(r => r.percentage >= 60 && r.percentage < 70).length, "level-acceptable"],
    ["تحتاج متابعة", results.filter(r => r.percentage < 60).length, "level-follow"]
  ];
  document.getElementById("levelDistribution").innerHTML = levels.map(([label, value, cls]) =>
    `<div class="distribution-item ${cls}"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");

  drawChart(meaningful);
}

function drawChart(list) {
  const ctx = chartCanvas.getContext("2d");
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(680, chartCanvas.parentElement.clientWidth || 680);
  const rowHeight = 42;
  const cssHeight = Math.max(210, 70 + list.length * rowHeight);
  chartCanvas.style.width = `${width}px`;
  chartCanvas.style.height = `${cssHeight}px`;
  chartCanvas.width = Math.floor(width * ratio);
  chartCanvas.height = Math.floor(cssHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, cssHeight);
  chartEmpty.hidden = list.length > 0;
  chartCanvas.hidden = list.length === 0;
  if (!list.length) return;

  const left = 55;
  const right = Math.min(230, Math.max(150, width * 0.26));
  const top = 35;
  const plotWidth = width - left - right;
  ctx.font = "12px Tahoma, Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#666";
  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 1;
  [0, 20, 40, 60, 80, 100].forEach(value => {
    const x = left + plotWidth * (value / 100);
    ctx.beginPath();
    ctx.moveTo(x, top - 12);
    ctx.lineTo(x, cssHeight - 22);
    ctx.stroke();
    ctx.fillText(`${value}%`, x, 15);
  });

  list.forEach((student, i) => {
    const r = studentResult(student);
    const y = top + i * rowHeight + 8;
    const barHeight = 24;
    const barWidth = plotWidth * (r.percentage / 100);
    let fill = "#c93434";
    if (r.percentage >= 90) fill = "#198754";
    else if (r.percentage >= 80) fill = "#3578b8";
    else if (r.percentage >= 70) fill = "#b38a00";
    else if (r.percentage >= 60) fill = "#c46b16";
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(left, y, plotWidth, barHeight);
    ctx.fillStyle = fill;
    ctx.fillRect(left, y, barWidth, barHeight);
    ctx.fillStyle = "#222";
    ctx.textAlign = "right";
    const name = student.name.trim() || `طالبة ${i + 1}`;
    const shortName = name.length > 23 ? `${name.slice(0, 22)}…` : name;
    ctx.fillText(shortName, width - 8, y + barHeight / 2);
    ctx.textAlign = "left";
    ctx.font = "bold 12px Tahoma, Arial";
    ctx.fillText(`${r.percentage}%`, Math.min(left + barWidth + 6, left + plotWidth - 34), y + barHeight / 2);
    ctx.font = "12px Tahoma, Arial";
  });
}

window.addEventListener("resize", () => {
  window.clearTimeout(drawChart.resizeTimer);
  drawChart.resizeTimer = window.setTimeout(updateAnalysis, 150);
});

toggleAnalysisButton.addEventListener("click", () => {
  analysisPanel.classList.toggle("collapsed");
  toggleAnalysisButton.textContent = analysisPanel.classList.contains("collapsed") ? "📊 إظهار التحليل البياني" : "📊 إخفاء التحليل البياني";
  if (!analysisPanel.classList.contains("collapsed")) updateAnalysis();
});

printAnalysisButton.addEventListener("click", () => window.print());

function openReport(index) {
  currentReportIndex = index;
  const student = students[index];
  const r = studentResult(student);
  const school = document.getElementById("school").value.trim();
  const teacher = document.getElementById("teacher").value.trim();
  const className = activeClass()?.name || classNameInput.value.trim();
  const week = document.getElementById("week").value.trim();
  const meta = [school, teacher ? `المعلمة: ${teacher}` : "", className, week].filter(Boolean).join(" • ");
  document.getElementById("reportMeta").textContent = meta;
  document.getElementById("reportName").textContent = student.name || "غير مسجل";
  document.getElementById("reportPractical").textContent = r.practical;
  document.getElementById("reportHomework").textContent = r.homework;
  document.getElementById("reportParticipation").textContent = r.participation;
  document.getElementById("reportActivity").textContent = r.activity;
  document.getElementById("reportTest1").textContent = r.test1;
  document.getElementById("reportTest2").textContent = r.test2;
  document.getElementById("reportTest3").textContent = r.test3;
  document.getElementById("reportTestAverage").textContent = `${r.testAverage} / ${TEST_MAX}`;
  document.getElementById("reportTotal").textContent = `${r.total} / ${TOTAL_MAX}`;
  document.getElementById("reportPercentage").textContent = `${r.percentage}%`;
  document.getElementById("reportLevel").textContent = `${r.icon} ${r.level}`;
  reportNote.value = student.note || r.defaultNote;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeReport() {
  if (currentReportIndex !== null && students[currentReportIndex]) {
    students[currentReportIndex].note = reportNote.value.trim();
    save(false);
  }
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  currentReportIndex = null;
}

reportNote.addEventListener("input", () => {
  if (currentReportIndex !== null && students[currentReportIndex]) {
    students[currentReportIndex].note = reportNote.value;
    save(false);
  }
});

function reportText() {
  if (currentReportIndex === null) return "";
  const student = students[currentReportIndex];
  const r = studentResult(student);
  const school = document.getElementById("school").value.trim();
  const teacher = document.getElementById("teacher").value.trim();
  const className = activeClass()?.name || classNameInput.value.trim();
  const week = document.getElementById("week").value.trim();
  return [
    "تقرير متابعة الطالبة",
    school ? `المدرسة: ${school}` : "",
    teacher ? `المعلمة: ${teacher}` : "",
    className ? `الشعبة: ${className}` : "",
    week ? `الأسبوع: ${week}` : "",
    `اسم الطالبة: ${student.name || "غير مسجل"}`,
    `العملي: ${r.practical}`,
    `الواجب: ${r.homework}`,
    `المشاركة: ${r.participation}`,
    `النشاط: ${r.activity}`,
    `الاختبار 1: ${r.test1}`,
    `الاختبار 2: ${r.test2}`,
    `الاختبار 3: ${r.test3}`,
    `معدل الاختبارات الفترية: ${r.testAverage}/${TEST_MAX}`,
    `المجموع: ${r.total}/${TOTAL_MAX}`,
    `النسبة: ${r.percentage}%`,
    `المستوى: ${r.level}`,
    `ملاحظة المعلمة: ${reportNote.value.trim()}`
  ].filter(Boolean).join("\n");
}

async function shareReport() {
  const text = reportText();
  const studentName = currentReportIndex !== null ? (students[currentReportIndex].name || "الطالبة") : "الطالبة";
  if (navigator.share) {
    try { await navigator.share({ title: `تقرير ${studentName}`, text }); return; }
    catch (error) { if (error.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(text); alert("تم نسخ التقرير ويمكنك لصقه في واتساب أو الرسائل ✅"); }
  catch { alert(text); }
}

function printCurrentReport() {
  if (currentReportIndex === null) return;
  const student = students[currentReportIndex];
  students[currentReportIndex].note = reportNote.value.trim();
  save(false);
  const r = studentResult(student);
  const meta = [
    document.getElementById("school").value.trim(),
    document.getElementById("teacher").value.trim() ? `المعلمة: ${document.getElementById("teacher").value.trim()}` : "",
    activeClass()?.name || classNameInput.value.trim(),
    document.getElementById("week").value.trim()
  ].filter(Boolean).join(" • ");
  const w = window.open("", "_blank");
  if (!w) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير."); return; }
  const boxes = [
    ["العملي", r.practical], ["الواجب", r.homework], ["المشاركة", r.participation], ["النشاط", r.activity],
    ["الاختبار 1", r.test1], ["الاختبار 2", r.test2], ["الاختبار 3", r.test3], ["معدل الاختبارات", `${r.testAverage} / ${TEST_MAX}`], ["المجموع", `${r.total} / ${TOTAL_MAX}`]
  ].map(([label, value]) => `<div class="box"><span>${label}</span><strong>${value}</strong></div>`).join("");
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير ${escapeHtml(student.name || "الطالبة")}</title><style>
    body{font-family:Tahoma,Arial,sans-serif;padding:32px;color:#222;direction:rtl}h1{text-align:center}.meta{text-align:center;color:#666;margin-bottom:24px}.student{background:#f5f5f7;padding:14px;border-radius:10px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.box{border:1px solid #ddd;border-radius:10px;padding:14px;text-align:center}.box span{display:block;color:#666;margin-bottom:6px}.result{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.note{margin-top:18px;border:1px solid #ddd;border-radius:10px;padding:14px;line-height:1.9}@media print{body{padding:0}}
    </style></head><body><h1>تقرير متابعة الطالبة</h1><div class="meta">${escapeHtml(meta)}</div><div class="student"><strong>اسم الطالبة:</strong> ${escapeHtml(student.name || "غير مسجل")}</div><div class="grid">${boxes}</div><div class="result"><div class="box"><span>النسبة</span><strong>${r.percentage}%</strong></div><div class="box"><span>المستوى</span><strong>${r.icon} ${r.level}</strong></div></div><div class="note"><strong>ملاحظة المعلمة:</strong><br>${escapeHtml(reportNote.value.trim()).replace(/\n/g, "<br>")}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}


function printBlankRoster() {
  const item = activeClass();
  if (!item) { alert("لا توجد شعبة للطباعة."); return; }

  const namedStudents = students.filter(student => String(student.name || "").trim());
  if (!namedStudents.length) {
    alert("أضيفي أسماء الطالبات أولًا ثم اختاري طباعة الكشف الفارغ.");
    return;
  }

  // حفظ بيانات الرأس المكتوبة حاليًا قبل تجهيز الكشف.
  save(false);

  const school = document.getElementById("school").value.trim();
  const teacher = document.getElementById("teacher").value.trim();
  const className = document.getElementById("className").value.trim() || item.name || "الشعبة";
  const week = document.getElementById("week").value.trim();
  const rows = namedStudents.map((student, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="student-name">${escapeHtml(student.name)}</td>
      <td></td><td></td><td></td><td></td>
      <td></td><td></td><td></td>
      <td class="notes"></td>
    </tr>`).join("");

  const w = window.open("", "_blank");
  if (!w) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة الكشف."); return; }

  w.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>كشف متابعة فارغ - ${escapeHtml(className)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Tahoma, Arial, sans-serif; color: #111; direction: rtl; margin: 0; background: #fff; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 8px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; font-size: 12px; }
  .meta div { border: 1px solid #777; padding: 7px 8px; min-height: 30px; }
  .meta strong { margin-left: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
  th, td { border: 1px solid #333; text-align: center; padding: 4px 2px; height: 30px; }
  th { background: #f2f2f2; font-weight: 700; }
  th:nth-child(1), td:nth-child(1) { width: 4%; }
  th:nth-child(2), td:nth-child(2) { width: 20%; }
  th:nth-child(3), td:nth-child(3),
  th:nth-child(4), td:nth-child(4),
  th:nth-child(5), td:nth-child(5),
  th:nth-child(6), td:nth-child(6) { width: 7%; }
  th:nth-child(7), td:nth-child(7),
  th:nth-child(8), td:nth-child(8),
  th:nth-child(9), td:nth-child(9) { width: 8%; }
  th:nth-child(10), td:nth-child(10) { width: 19%; }
  td.student-name { text-align: right; padding-right: 7px; font-weight: 600; }
  .footer { margin-top: 7px; font-size: 10px; color: #555; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  <h1>كشف متابعة الطالبات — فارغ للكتابة الورقية</h1>
  <div class="meta">
    <div><strong>المدرسة:</strong> ${escapeHtml(school || "________________")}</div>
    <div><strong>المعلمة:</strong> ${escapeHtml(teacher || "________________")}</div>
    <div><strong>الشعبة:</strong> ${escapeHtml(className)}</div>
    <div><strong>الأسبوع:</strong> ${escapeHtml(week || "________________")}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم الطالبة</th>
        <th>العملي</th>
        <th>الواجب</th>
        <th>المشاركة</th>
        <th>النشاط</th>
        <th>الاختبار 1</th>
        <th>الاختبار 2</th>
        <th>الاختبار 3</th>
        <th>ملاحظات</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer"><span>عدد الطالبات: ${namedStudents.length}</span><span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</span></div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
</body>
</html>`);
  w.document.close();
}

function backupData() {
  save(false);
  const data = {
    app: "دفتر متابعة الطالبات",
    version: 5,
    exportedAt: new Date().toISOString(),
    school: appState.school,
    teacher: appState.teacher,
    week: appState.week,
    activeClassId: appState.activeClassId,
    classes: appState.classes.map(item => ({ id: item.id, name: item.name, students: item.students.map(newStudent) }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeDate = new Date().toLocaleDateString("en-CA");
  a.href = url;
  a.download = `نسخة-احتياطية-دفتر-الطالبات-${safeDate}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showStatus("✅ تم إنشاء نسخة احتياطية تشمل جميع الشعب", 3000);
}

function restoreDataFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let restored = normalizeState(data);
      if (!restored && data && Array.isArray(data.students)) {
        const legacyClass = newClass(data.className || "الشعبة المستعادة", data.students);
        restored = {
          school: data.school || "",
          teacher: data.teacher || "",
          week: data.week || "",
          classes: [legacyClass],
          activeClassId: legacyClass.id
        };
      }
      if (!restored) throw new Error("invalid");
      if (!confirm("سيتم استبدال البيانات الموجودة حاليًا بالنسخة الاحتياطية. هل تريدين المتابعة؟")) return;
      appState = restored;
      document.getElementById("school").value = appState.school;
      document.getElementById("teacher").value = appState.teacher;
      document.getElementById("week").value = appState.week;
      syncStudentsReference();
      save(false);
      render();
      showStatus("✅ تمت استعادة جميع البيانات والشعب بنجاح", 3000);
    } catch {
      alert("تعذر استعادة الملف. اختاري ملف نسخة احتياطية صالحًا.");
    } finally {
      restoreFile.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

pasteNamesButton.addEventListener("click", () => { pastePanel.hidden = false; namesText.focus(); });
cancelPasteButton.addEventListener("click", () => { pastePanel.hidden = true; namesText.value = ""; });
importNamesButton.addEventListener("click", () => {
  const names = namesText.value.split(/\r?\n|\t/).map(name => name.trim()).filter(Boolean);
  if (!names.length) { alert("الصقي أسماء الطالبات أولًا."); return; }
  const existing = new Set(students.map(s => s.name.trim()).filter(Boolean));
  let added = 0;
  names.forEach(name => {
    if (!existing.has(name)) {
      students.push(newStudent({ name }));
      existing.add(name);
      added++;
    }
  });
  render();
  save(false);
  pastePanel.hidden = true;
  namesText.value = "";
  showStatus(added ? `✅ تمت إضافة ${added} طالبة إلى ${activeClass()?.name}. تم تجاهل الأسماء المكررة.` : "لم تتم إضافة أسماء جديدة لأن جميع الأسماء موجودة مسبقًا.", 3500);
});

addButton.addEventListener("click", () => addStudent());
saveButton.addEventListener("click", () => save(true));
printPageButton.addEventListener("click", () => window.print());
printBlankRosterButton.addEventListener("click", printBlankRoster);
backupButton.addEventListener("click", backupData);
restoreButton.addEventListener("click", () => restoreFile.click());
restoreFile.addEventListener("change", () => restoreDataFromFile(restoreFile.files[0]));
["school", "teacher", "week"].forEach((id) => document.getElementById(id).addEventListener("input", () => save(false)));
document.getElementById("closeReport").addEventListener("click", closeReport);
document.getElementById("closeReportBottom").addEventListener("click", closeReport);
document.querySelector("[data-close-report]").addEventListener("click", closeReport);
document.getElementById("shareReport").addEventListener("click", shareReport);
document.getElementById("printReport").addEventListener("click", printCurrentReport);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeReport(); });

load();
