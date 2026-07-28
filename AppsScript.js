// ==========================================
// โค้ดสำหรับนำไปใช้บน Google Apps Script (อัปเดตระบบลบข้อมูล)
// ==========================================

const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const postData = JSON.parse(e.postData.contents);
    
    // 1. ตรวจสอบการลบทั้งหมด
    if (postData.action === 'deleteAll') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // ลบข้อมูลตั้งแต่แถวที่ 2 เป็นต้นไป (เก็บ Header ไว้)
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "All data deleted" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. ตรวจสอบการลบแถวเดียว
    if (postData.action === 'deleteRow') {
      const targetTimestamp = postData.timestampToDelete;
      const data = sheet.getDataRange().getValues();
      // ค้นหาแถวที่มี Timestamp ตรงกัน (เริ่มค้นจากท้ายตารางจะเร็วกว่าถ้าเป็นข้อมูลล่าสุด แต่ในที่นี้ค้นจากบนลงล่างก็ได้)
      // data[0] คือ Header, วนลูปเริ่มที่ index 1 (แถวที่ 2)
      for (let i = 1; i < data.length; i++) {
        // แปลงเป็น String เผื่อ format ต่างกัน
        if (String(data[i][0]) === String(targetTimestamp)) {
          sheet.deleteRow(i + 1); // deleteRow รับค่าแถวแบบ 1-index (i คือ 0-index, +1 เพราะ array, +1 เพราะแถวเริ่มที่ 1) -> รวมเป็น i+1
          return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Row deleted" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Row not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. การบันทึกข้อมูล (เข้า/ออก) ตามปกติ
    sheet.appendRow([
      postData.timestamp,
      postData.action,       // "เข้า" หรือ "ออก"
      postData.prefix || "",
      postData.fullName,
      postData.className || "",
      postData.colorGroup || "",
      postData.reason || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Data Saved" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    if (data.length > 0) {
      data.shift();
    }
    
    const formattedData = data.filter(row => row[0]).map(row => ({
      timestamp: row[0],
      action: row[1],
      prefix: row[2],
      name: row[3],
      className: row[4],
      color: row[5],
      reason: row[6]
    }));
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": formattedData }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
