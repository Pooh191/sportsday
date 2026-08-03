/**
 * ตั้งค่า URL ของ Web App ที่ได้จาก Google Apps Script ที่นี่
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyubx4mUmGoszNZ6Vfp4k2HBiSA7lRz0kd8dkc82h4mERbszEc1fpn5zEN-KEQa2ayHWw/exec";

// Global variables
let studentDatabase = [];
let allDashboardData = [];
// Pagination variables
let currentPage = 1;
const rowsPerPage = 20;

document.addEventListener('DOMContentLoaded', () => {
  // 1. หน้า Entry (เข้าโรงเรียน)
  const entryForm = document.getElementById('entryForm');
  if (entryForm) {
    entryForm.addEventListener('submit', (e) => handleFormSubmit(e, 'entryForm'));
  }

  // 2. หน้า Exit (ออกโรงเรียน)
  const exitForm = document.getElementById('exitForm');
  if (exitForm) {
    exitForm.addEventListener('submit', (e) => handleFormSubmit(e, 'exitForm'));
    fetchStudentDatabase(); // ดึงรายชื่อมาทำ Autocomplete

    // ตั้งค่า Autocomplete
    const searchInput = document.getElementById('searchName');
    searchInput.addEventListener('input', handleAutocomplete);

    // ปิด dropdown เมื่อคลิกที่อื่น
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.autocomplete-container')) {
        document.getElementById('autocompleteResults').style.display = 'none';
      }
    });
  }

  // 3. หน้า Dashboard
  const dashboardContent = document.getElementById('dashboardContent');
  if (dashboardContent) {
    fetchDashboardData();
  }
});

// ฟังก์ชันหลักในการส่งข้อมูล (ใช้ร่วมกันทั้ง เข้า และ ออก)
async function handleFormSubmit(e, formId) {
  e.preventDefault();

  if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
    Swal.fire({
      icon: 'warning',
      title: 'ยังไม่ได้ตั้งค่าระบบ',
      text: 'กรุณานำ URL จาก Google Apps Script มาใส่ในไฟล์ script.js ก่อนใช้งาน',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  // ใส่ Single Quote (') นำหน้าเพื่อป้องกัน Google Sheets แปลงเป็นวันที่อัตโนมัติ
  let formData = {
    timestamp: "'" + new Date().toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  };

  if (formId === 'entryForm') {
    const prefix = document.getElementById('namePrefix').value;
    const fName = document.getElementById('fullName').value;
    formData.action = document.getElementById('actionType').value;
    formData.prefix = prefix;
    formData.fullName = fName;
    // ใส่ Single Quote (') นำหน้าเพื่อป้องกัน Google Sheets แปลง 4/1 เป็นวันที่
    const classVal = document.getElementById('className').value;
    formData.className = classVal.startsWith("'") ? classVal : "'" + classVal;
    formData.colorGroup = document.getElementById('colorGroup').value;
    formData.reason = document.getElementById('entryReason').value;
  } else if (formId === 'exitForm') {
    formData.action = document.getElementById('actionType').value;
    formData.prefix = document.getElementById('namePrefix').value;
    formData.fullName = document.getElementById('searchName').value;
    const classVal = document.getElementById('readonlyClass').value;
    formData.className = classVal.startsWith("'") ? classVal : "'" + classVal;
    formData.colorGroup = document.getElementById('readonlyColor').value;
    formData.reason = document.getElementById('exitReason').value;
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.status === 'success') {
      let actionText = formData.action === 'เข้า' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน';
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ!',
        text: `บันทึกเวลา${actionText}ของ ${formData.fullName} เรียบร้อยแล้ว`,
        confirmButtonColor: '#4F46E5'
      }).then(() => {
        document.getElementById(formId).reset();
        if (formId === 'exitForm') {
          document.getElementById('readonlyClass').value = '';
          document.getElementById('readonlyColor').value = '';
        }
      });
    } else if (result.status === 'error' && result.message === 'DUPLICATE_ENTRY') {
      Swal.fire({
        icon: 'error',
        title: 'บันทึกซ้ำซ้อน!',
        text: `นักเรียนคนนี้ (${formData.fullName}) อยู่ในโรงเรียนอยู่แล้ว ไม่สามารถบันทึกเข้าซ้ำได้ครับ`,
        confirmButtonColor: '#dc2626'
      });
    } else if (result.status === 'error' && result.message === 'DUPLICATE_EXIT') {
      Swal.fire({
        icon: 'error',
        title: 'บันทึกซ้ำซ้อน!',
        text: `นักเรียนคนนี้ (${formData.fullName}) อยู่นอกโรงเรียนอยู่แล้ว ไม่สามารถบันทึกออกซ้ำได้ครับ`,
        confirmButtonColor: '#dc2626'
      });
    } else if (result.status === 'error' && result.message === 'NOT_FOUND') {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบประวัติเข้า!',
        text: `นักเรียนคนนี้ยังไม่เคยบันทึกเข้าโรงเรียน จึงไม่สามารถกดออกได้ครับ`,
        confirmButtonColor: '#dc2626'
      });
    } else if (result.status === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดจากระบบ',
        text: result.message || 'ไม่ทราบสาเหตุ',
        confirmButtonColor: '#dc2626'
      });
    } else {
      throw new Error("API Error");
    }
  } catch (error) {
    console.error(error);
    let errorMessage = 'ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ';

    // ตรวจสอบว่าเป็น Error จากการ Parse JSON (เช่น โดน Redirect ไปหน้า Login ของ Google)
    if (error.name === 'SyntaxError') {
      errorMessage = 'การตอบกลับไม่ใช่ JSON โปรดตรวจสอบการตั้งค่า Deploy ของ Google Apps Script ว่าตั้งสิทธิ์เป็น "Anyone" หรือไม่';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'ไม่สามารถเชื่อมต่อได้ (CORS Error) หรือ URL ผิดพลาด โปรดตรวจสอบการ Deploy Web App';
    }

    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: errorMessage,
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ----------------------------------------------------
// ระบบ Autocomplete สำหรับหน้า Exit
// ----------------------------------------------------
async function fetchStudentDatabase() {
  if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") return;

  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();

    if (result.status === 'success') {
      const allData = result.data;

      // หาชื่อนักเรียนที่ไม่ซ้ำกัน โดยยึดข้อมูลล่าสุดจากคอลัมน์ name
      const uniqueStudents = new Map();

      allData.forEach(row => {
        if (row.name && row.action === 'เข้า') {
          // เก็บข้อมูลนักเรียนจากบันทึกการเข้าเท่านั้น
          uniqueStudents.set(row.name, {
            prefix: row.prefix,
            name: row.name,
            className: row.className,
            color: row.color
          });
        }
      });

      studentDatabase = Array.from(uniqueStudents.values());

      // ปิด Loading และแสดง Form
      document.getElementById('loadingData').style.display = 'none';
      document.getElementById('exitForm').style.display = 'block';
    }
  } catch (error) {
    console.error("Error fetching database:", error);
    document.getElementById('loadingData').innerHTML = '<span style="color:red;">ไม่สามารถโหลดฐานข้อมูลได้ กรุณารีเฟรชหน้าเว็บ</span>';
  }
}

function handleAutocomplete(e) {
  const val = e.target.value.toLowerCase();
  const resultsContainer = document.getElementById('autocompleteResults');

  // รีเซ็ตค่า readonly
  document.getElementById('readonlyClass').value = '';
  document.getElementById('readonlyColor').value = '';
  document.getElementById('namePrefix').value = '';

  resultsContainer.innerHTML = '';
  if (!val) {
    resultsContainer.style.display = 'none';
    return;
  }

  // ค้นหาใน database
  const matches = studentDatabase.filter(student =>
    student.name.toLowerCase().includes(val)
  );

  if (matches.length > 0) {
    matches.forEach(student => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.innerHTML = `<strong>${student.prefix} ${student.name}</strong> <span style="color:#6b7280; font-size:12px;">(${student.className})</span>`;
      div.addEventListener('click', () => {
        // เลือกรายการนี้
        document.getElementById('searchName').value = student.name;
        document.getElementById('namePrefix').value = student.prefix;
        document.getElementById('readonlyClass').value = student.className;
        document.getElementById('readonlyColor').value = student.color;
        resultsContainer.style.display = 'none';
      });
      resultsContainer.appendChild(div);
    });
    resultsContainer.style.display = 'block';
  } else {
    resultsContainer.style.display = 'none';
  }
}

// ----------------------------------------------------
// ระบบ Dashboard (dashboard.html)
// ----------------------------------------------------
async function fetchDashboardData() {
  const loading = document.getElementById('loadingDashboard');
  const content = document.getElementById('dashboardContent');

  if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
    if (loading) loading.innerHTML = '<p style="color:red;">กรุณาตั้งค่า SCRIPT_URL ในไฟล์ script.js ให้ถูกต้อง</p>';
    return;
  }

  if (loading) {
    loading.style.display = 'block';
    if (content) content.style.display = 'none';
  }

  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();

    if (result.status === 'success') {
      allDashboardData = result.data;
      if (content) {
        renderDashboard(result.data);
        loading.style.display = 'none';
        content.style.display = 'block';
      }
    }
  } catch (error) {
    console.error(error);
    let msg = 'ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้ กรุณาลองใหม่อีกครั้ง';
    if (error.name === 'SyntaxError') msg = 'การตอบกลับไม่ใช่ JSON (URL อาจจะผิด ถูกลบ หรือไม่ได้เปิดสิทธิ์เป็น "Anyone")';
    else if (error.message.includes('Failed to fetch')) msg = 'เชื่อมต่อไม่ได้ (CORS Error) กรุณาตรวจสอบการ Deploy Web App (ต้องตั้งเป็น "Anyone")';
    if (loading) loading.innerHTML = `<p style="color:red;">${msg}<br><small>Error: ${error.toString()}</small></p>`;
  }
}

function renderDashboard(data) {
  // นับจำนวนรวมการเข้าโรงเรียน
  const entries = data.filter(r => r.action === 'เข้า');
  document.getElementById('totalCount').innerText = entries.length;

  // นับจำนวนแยกตามสี (เฉพาะการเข้า)
  const colorCounts = { 'สีขาว': 0, 'สีแดง': 0, 'สีม่วง': 0, 'สีชมพู': 0, 'สีแสด': 0, 'สีฟ้า': 0, 'สภานักเรียน': 0 };
  entries.forEach(row => {
    if (colorCounts[row.color] !== undefined) colorCounts[row.color]++;
  });

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = `
    <div class="stat-card">
      <h3>จำนวนการเข้าทั้งหมด</h3>
      <p id="totalCount">${entries.length}</p>
    </div>
  `;
  for (const [color, count] of Object.entries(colorCounts)) {
    statsGrid.innerHTML += `
      <div class="stat-card">
        <h3>${color}</h3>
        <p style="color: var(--text-main);">${count}</p>
      </div>
    `;
  }

  // เริ่มการแสดงผลตาราง
  updateRecentTable();

  // ------------------------------------------------
  // คำนวณรายชื่อคนที่ "กำลังอยู่นอกโรงเรียน" (สถานะล่าสุดคือ 'ออก')
  // ------------------------------------------------
  const studentStatus = {};
  data.forEach(row => {
    if (row.name) {
      // วนลูปจากเก่าไปใหม่ การบันทึกทับจะทำให้เหลือข้อมูลล่าสุดของแต่ละคน
      studentStatus[row.name] = row;
    }
  });

  const outsideStudents = Object.values(studentStatus).filter(row => row.action === 'ออก');
  // เรียงลำดับจากเวลาล่าสุดขึ้นก่อน
  outsideStudents.reverse();

  document.getElementById('outsideCount').innerText = outsideStudents.length;

  const outsideTbody = document.getElementById('outsideTableBody');
  if (outsideTbody) {
    outsideTbody.innerHTML = '';

    if (outsideStudents.length === 0) {
      outsideTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่มีนักเรียนอยู่นอกโรงเรียนในขณะนี้</td></tr>';
    } else {
      outsideStudents.forEach(row => {
        const tr = document.createElement('tr');

        let colorClass = 'badge-ขาว';
        if (row.color === 'สีแดง') colorClass = 'badge-แดง';
        else if (row.color === 'สีม่วง') colorClass = 'badge-ม่วง';
        else if (row.color === 'สีชมพู') colorClass = 'badge-ชมพู';
        else if (row.color === 'สีแสด') colorClass = 'badge-แสด';
        else if (row.color === 'สีฟ้า') colorClass = 'badge-ฟ้า';
        else if (row.color === 'สภานักเรียน') colorClass = 'badge-สภานักเรียน';

        const reasonText = row.reason ? `<br><small style="color:#6b7280;">เหตุผล: ${row.reason}</small>` : '';
        const fullName = (row.prefix || '') + ' ' + (row.name || '-');

        let displayTime = row.timestamp || '-';
        if (typeof displayTime === 'string' && displayTime.includes('T') && displayTime.includes('Z')) {
          const d = new Date(displayTime);
          if (!isNaN(d)) displayTime = d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        let displayClass = row.className || '-';
        if (typeof displayClass === 'string' && displayClass.includes('T') && displayClass.includes('Z')) {
          displayClass = "ลบและบันทึกใหม่";
        }

        tr.innerHTML = `
          <td>${displayTime}</td>
          <td>${fullName} ${reasonText}</td>
          <td>${displayClass}</td>
          <td><span class="color-badge ${colorClass}">${row.color || '-'}</span></td>
          <td>
            <button class="action-btn btn-icon-info" title="ดูประวัติ" onclick="viewHistory('${row.name}')"><i class="ph ph-clock-counter-clockwise"></i></button>
          </td>
        `;
        outsideTbody.appendChild(tr);
      });
    }
  }
}

// ฟังก์ชันสลับแท็บ
function switchTab(tabId) {
  document.getElementById('btnTabRecent').classList.remove('active');
  document.getElementById('btnTabOutside').classList.remove('active');
  document.getElementById('tab-recent').style.display = 'none';
  document.getElementById('tab-outside').style.display = 'none';

  if (tabId === 'recent') {
    document.getElementById('btnTabRecent').classList.add('active');
    document.getElementById('tab-recent').style.display = 'block';
  } else if (tabId === 'outside') {
    document.getElementById('btnTabOutside').classList.add('active');
    document.getElementById('tab-outside').style.display = 'block';
  }
}

// ----------------------------------------------------
// ระบบลบข้อมูลและดูประวัติ
// ----------------------------------------------------

async function deleteAllData() {
  const result = await Swal.fire({
    title: 'ยืนยันการล้างข้อมูล?',
    text: 'ข้อมูลทั้งหมดใน Google Sheets จะถูกลบทิ้งอย่างถาวร (ยกเว้นหัวตาราง)',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'ใช่, ลบทิ้งทั้งหมด!',
    cancelButtonText: 'ยกเลิก'
  });

  if (result.isConfirmed) {
    document.getElementById('loadingDashboard').style.display = 'block';
    document.getElementById('dashboardContent').style.display = 'none';

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteAll' })
      });

      Swal.fire('ลบสำเร็จ!', 'ข้อมูลทั้งหมดถูกล้างแล้ว', 'success');
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
      fetchDashboardData();
    }
  }
}

async function deleteRow(timestamp) {
  const result = await Swal.fire({
    title: 'ลบข้อมูลรายการนี้?',
    text: 'คุณไม่สามารถกู้คืนข้อมูลนี้ได้',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'ลบทิ้ง',
    cancelButtonText: 'ยกเลิก'
  });

  if (result.isConfirmed) {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteRow', timestampToDelete: timestamp })
      });

      fetchDashboardData(); // โหลดข้อมูลใหม่
    } catch (error) {
      console.error(error);
      Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
    }
  }
}

function viewHistory(name) {
  const history = allDashboardData.filter(row => row.name === name);

  const modal = document.getElementById('historyModal');
  const modalName = document.getElementById('modalStudentName');
  const modalContent = document.getElementById('modalHistoryContent');

  if (history.length > 0) {
    modalName.innerText = `ประวัติ: ${(history[0].prefix || '') + ' ' + name}`;
  } else {
    modalName.innerText = `ประวัติ: ${name}`;
  }

  modalContent.innerHTML = '';

  if (history.length === 0) {
    modalContent.innerHTML = '<p>ไม่พบประวัติการเข้า-ออก</p>';
  } else {
    // เรียงจากใหม่ไปเก่า
    const sortedHistory = [...history].reverse();

    sortedHistory.forEach(item => {
      const typeClass = `type-${item.action}`;
      const actionBadge = item.action === 'ออก'
        ? `<span style="color:#dc2626; font-weight:bold;">ออกนอกโรงเรียน</span>`
        : `<span style="color:#16a34a; font-weight:bold;">เข้าโรงเรียน</span>`;

      const reasonText = item.reason ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">เหตุผล: ${item.reason}</div>` : '';

      let displayTime = item.timestamp || '-';
      if (typeof displayTime === 'string' && displayTime.includes('T') && displayTime.includes('Z')) {
        const d = new Date(displayTime);
        if (!isNaN(d)) displayTime = d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }

      modalContent.innerHTML += `
        <div class="history-item ${typeClass}">
          <div style="display: flex; justify-content: space-between;">
            <strong style="font-size: 14px;">${actionBadge}</strong>
            <span style="font-size: 13px; color: #9ca3af;">${displayTime}</span>
          </div>
          ${reasonText}
        </div>
      `;
    });
  }

  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('historyModal').classList.remove('show');
}

function updateRecentTable() {
  const tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let recentData = [...allDashboardData]; // ดึงจาก Global Variable
  recentData.reverse(); // ใหม่ล่าสุดขึ้นก่อน

  // Pagination Logic
  const totalRows = recentData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = recentData.slice(startIndex, endIndex);

  if (paginatedData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">ยังไม่มีข้อมูล</td></tr>';
    renderPagination(1, 1);
    return;
  }

  paginatedData.forEach(row => {
    const tr = document.createElement('tr');

    // ป้ายคณะสี
    let colorClass = 'badge-ขาว';
    if (row.color === 'สีแดง') colorClass = 'badge-แดง';
    else if (row.color === 'สีม่วง') colorClass = 'badge-ม่วง';
    else if (row.color === 'สีชมพู') colorClass = 'badge-ชมพู';
    else if (row.color === 'สีแสด') colorClass = 'badge-แสด';
    else if (row.color === 'สีฟ้า') colorClass = 'badge-ฟ้า';
    else if (row.color === 'สภานักเรียน') colorClass = 'badge-สภานักเรียน';

    // ป้ายสถานะเข้าออก
    const actionBadge = row.action === 'ออก'
      ? `<span style="color:#dc2626; font-weight:bold;">${row.action}</span>`
      : `<span style="color:#16a34a; font-weight:bold;">${row.action}</span>`;

    // เหตุผล
    const reasonText = row.reason ? `<br><small style="color:#6b7280;">เหตุผล: ${row.reason}</small>` : '';

    const fullName = (row.prefix || '') + ' ' + (row.name || '-');

    // Format Timestamp และ Class ให้สวยงาม
    let displayTime = row.timestamp || '-';
    if (typeof displayTime === 'string' && displayTime.includes('T') && displayTime.includes('Z')) {
      const d = new Date(displayTime);
      if (!isNaN(d)) displayTime = d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    let displayClass = row.className || '-';
    if (typeof displayClass === 'string' && displayClass.includes('T') && displayClass.includes('Z')) {
      displayClass = "ลบและบันทึกใหม่";
    }

    tr.innerHTML = `
      <td>${displayTime}</td>
      <td>${actionBadge}</td>
      <td>${fullName} ${reasonText}</td>
      <td>${displayClass}</td>
      <td><span class="color-badge ${colorClass}">${row.color || '-'}</span></td>
      <td>
        <button class="action-btn btn-icon-info" title="ดูประวัติ" onclick="viewHistory('${row.name}')"><i class="ph ph-clock-counter-clockwise"></i></button>
        <button class="action-btn btn-icon-danger" title="ลบข้อมูลนี้" onclick="deleteRow('${row.timestamp}')"><i class="ph ph-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(currentPage, totalPages);
}

function renderPagination(current, total) {
  const container = document.getElementById('paginationControls');
  if (!container) return;

  container.innerHTML = `
    <button class="page-btn" onclick="changePage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>&larr; ก่อนหน้า</button>
    <span class="page-info">หน้า ${current} จาก ${total}</span>
    <button class="page-btn" onclick="changePage(${current + 1})" ${current >= total ? 'disabled' : ''}>ถัดไป &rarr;</button>
  `;
}

function changePage(newPage) {
  currentPage = newPage;
  updateRecentTable();
}
