// ==================== GOOGLE APPS SCRIPT - GÖREV DAĞILIMI ====================
// Bu dosyayı Google Apps Script'e kopyalayın ve Web App olarak deploy edin

const SPREADSHEET_ID = '1bPlSz-4hF1wL0MR6fqeqxOCZfVLvjoTBLyodzAFugGU'; // Kendi Spreadsheet ID'nizi girin

// Sheet isimleri
const SHEETS = {
  PERSONNEL: 'Personeller',
  LEAVES: 'Izinler',
  DEPARTMENTS: 'Departmanlar',
  TASKS: 'Gorevler',
  LEAVE_TYPES: 'IzinTurleri',
  USERS: 'Kullanicilar',
  NOTES: 'Notlar'
};

// CORS için gerekli
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // e veya e.parameter undefined olabilir, kontrol et
  if (!e || !e.parameter) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Geçersiz istek parametreleri' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = e.parameter.action;
  let result;
  
  try {
    switch(action) {
      // GET işlemleri
      case 'getPersonnel':
        result = getPersonnel();
        break;
      case 'getLeaves':
        result = getLeaves();
        break;
      case 'getDepartments':
        result = getDepartments();
        break;
      case 'getTasks':
        result = getTasks();
        break;
      case 'getLeaveTypes':
        result = getLeaveTypes();
        break;
      case 'getAllData':
        result = getAllData();
        break;
      case 'login':
        result = loginUser(JSON.parse(e.parameter.data));
        break;
      
      // POST işlemleri
      case 'addPersonnel':
        result = addPersonnel(JSON.parse(e.parameter.data));
        break;
      case 'updatePersonnel':
        result = updatePersonnel(JSON.parse(e.parameter.data));
        break;
      case 'deletePersonnel':
        result = deletePersonnel(e.parameter.id);
        break;
      case 'archivePersonnel':
        result = archivePersonnel(e.parameter.id);
        break;
      case 'restorePersonnel':
        result = restorePersonnel(e.parameter.id);
        break;
      case 'addLeave':
        result = addLeave(JSON.parse(e.parameter.data));
        break;
      case 'updateLeave':
        result = updateLeave(JSON.parse(e.parameter.data));
        break;
      case 'deleteLeave':
        result = deleteLeave(e.parameter.id);
        break;
      
      // NOT İŞLEMLERİ
      case 'getNotes':
        result = getNotes(e.parameter.personnelId);
        break;
      case 'addNote':
        result = addNote(JSON.parse(e.parameter.data));
        break;
      case 'updateNote':
        result = updateNote(JSON.parse(e.parameter.data));
        break;
      case 'deleteNote':
        result = deleteNote(e.parameter.id);
        break;
      
      default:
        result = { success: false, error: 'Geçersiz işlem: ' + action };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== GET FONKSİYONLARI ====================

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetData(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Başlıkları ekle
    if (sheetName === SHEETS.PERSONNEL) {
      sheet.appendRow(['ID', 'Ad Soyad', 'Departman', 'Görev', 'Not', 'Oluşturma Tarihi', 'Arşivlendi']);
    } else if (sheetName === SHEETS.LEAVES) {
      sheet.appendRow(['ID', 'Personel ID', 'Personel Adı', 'Departman', 'İzin Türü', 'Başlangıç', 'Bitiş', 'Açıklama', 'Oluşturma Tarihi']);
    } else if (sheetName === SHEETS.DEPARTMENTS) {
      sheet.appendRow(['Departman']);
      sheet.appendRow(['Paketleme']);
      sheet.appendRow(['Balon Tedarik']);
    } else if (sheetName === SHEETS.TASKS) {
      sheet.appendRow(['Departman', 'Görev']);
      // Paketleme görevleri
      sheet.appendRow(['Paketleme', 'Sorumlu']);
      sheet.appendRow(['Paketleme', 'Kalite Kontrol']);
      sheet.appendRow(['Paketleme', 'Numune']);
      sheet.appendRow(['Paketleme', 'TR Reklamlık/Paketleme']);
      sheet.appendRow(['Paketleme', 'Paketleme Çıkış']);
      sheet.appendRow(['Paketleme', 'Paketleme']);
      sheet.appendRow(['Paketleme', 'Paketleme Tartım']);
      // Balon Tedarik görevleri
      sheet.appendRow(['Balon Tedarik', 'Stok/Sevkiyat/Tedarik']);
      sheet.appendRow(['Balon Tedarik', 'Tedarik']);
      sheet.appendRow(['Balon Tedarik', 'Sevkiyat Hazırlık']);
      sheet.appendRow(['Balon Tedarik', 'Dolum']);
    } else if (sheetName === SHEETS.LEAVE_TYPES) {
      sheet.appendRow(['İzin Türü']);
      sheet.appendRow(['Geç Gelecek']);
      sheet.appendRow(['Saatlik İzinli']);
      sheet.appendRow(['Günlük İzinli']);
      sheet.appendRow(['Yıllık İzinli']);
      sheet.appendRow(['Mazeretsiz Gelmedi']);
      sheet.appendRow(['Doğum İzni']);
      sheet.appendRow(['Raporlu']);
      sheet.appendRow(['Erken Çıktı']);
    } else if (sheetName === SHEETS.NOTES) {
      sheet.appendRow(['ID', 'Personel ID', 'Personel Adı', 'Departman', 'Not', 'Oluşturma Tarihi', 'Güncellenme Tarihi']);
    }
  }
  
  const data = sheet.getDataRange().getValues();
  return data;
}

function getPersonnel() {
  const data = getSheetData(SHEETS.PERSONNEL);
  if (data.length <= 1) return { success: true, data: [] };
  
  const headers = data[0];
  const personnel = data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    department: row[2],
    task: row[3],
    note: row[4] || '',
    createdAt: row[5],
    archived: row[6] === true || row[6] === 'true' || row[6] === 'TRUE'
  })).filter(p => p.id); // Boş satırları filtrele
  
  return { success: true, data: personnel };
}

function getLeaves() {
  const data = getSheetData(SHEETS.LEAVES);
  if (data.length <= 1) return { success: true, data: [] };
  
  const leaves = data.slice(1).map(row => ({
    id: row[0],
    personnelId: row[1],
    personnelName: row[2],
    department: row[3],
    type: row[4],
    startDate: row[5] ? Utilities.formatDate(new Date(row[5]), 'Europe/Istanbul', 'yyyy-MM-dd') : '',
    endDate: row[6] ? Utilities.formatDate(new Date(row[6]), 'Europe/Istanbul', 'yyyy-MM-dd') : '',
    note: row[7],
    createdAt: row[8]
  })).filter(l => l.id);
  
  return { success: true, data: leaves };
}

function getDepartments() {
  const data = getSheetData(SHEETS.DEPARTMENTS);
  if (data.length <= 1) return { success: true, data: [] };
  
  const departments = data.slice(1).map(row => row[0]).filter(d => d);
  return { success: true, data: departments };
}

function getTasks() {
  const data = getSheetData(SHEETS.TASKS);
  if (data.length <= 1) return { success: true, data: [] };
  
  const tasks = data.slice(1).map(row => ({
    department: row[0],
    task: row[1]
  })).filter(t => t.department && t.task);
  
  return { success: true, data: tasks };
}

function getLeaveTypes() {
  const data = getSheetData(SHEETS.LEAVE_TYPES);
  if (data.length <= 1) return { success: true, data: [] };
  
  const types = data.slice(1).map(row => row[0]).filter(t => t);
  return { success: true, data: types };
}

function getAllData() {
  return {
    success: true,
    data: {
      personnel: getPersonnel().data,
      leaves: getLeaves().data,
      departments: getDepartments().data,
      tasks: getTasks().data,
      leaveTypes: getLeaveTypes().data,
      notes: getAllNotes().data
    }
  };
}

// ==================== YARDIMCI ID FONKSİYONU ====================

// Bir sheet için sonraki sıralı ID'yi hesaplar
function getNextId(sheetName, prefix) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return prefix + '1';
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return prefix + '1';
  
  // Mevcut ID'lerden en yüksek numarayı bul
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]);
    if (id.startsWith(prefix)) {
      const num = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  return prefix + (maxNum + 1);
}

// ==================== PERSONEL İŞLEMLERİ ====================

function addPersonnel(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  
  if (!sheet) {
    getSheetData(SHEETS.PERSONNEL); // Sheet'i oluştur
    sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  }
  
  // Validasyon: Boş veri eklemeyi engelle
  if (!data || !data.name || !data.name.trim()) {
    return { success: false, error: 'Personel adı boş olamaz' };
  }
  
  // Sıralı ID oluştur: P-1, P-2, P-3...
  const id = data.id || getNextId(SHEETS.PERSONNEL, 'P-');
  const createdAt = new Date();
  
  sheet.appendRow([
    id,
    data.name.trim(),
    data.department || '',
    data.task || '',
    data.note || '',
    createdAt,
    false  // archived = false (yeni personel aktif)
  ]);
  
  return { 
    success: true, 
    message: 'Personel eklendi',
    data: { id, ...data, createdAt }
  };
}

function updatePersonnel(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // String'e çevirerek karşılaştır
  const searchId = String(data.id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Personel bulunamadı' };
  
  sheet.getRange(rowIndex, 2).setValue(data.name);
  sheet.getRange(rowIndex, 3).setValue(data.department);
  sheet.getRange(rowIndex, 4).setValue(data.task);
  sheet.getRange(rowIndex, 5).setValue(data.note || '');
  
  // İzinlerde de personel adını güncelle
  updatePersonnelNameInLeaves(data.id, data.name, data.department);
  
  return { success: true, message: 'Personel güncellendi' };
}

function deletePersonnel(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // String'e çevirerek karşılaştır
  const searchId = String(id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Personel bulunamadı' };
  
  sheet.deleteRow(rowIndex);
  
  // İlgili izinleri de sil
  deleteLeavesByPersonnelId(id);
  
  return { success: true, message: 'Personel silindi' };
}

function archivePersonnel(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  const searchId = String(id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Personel bulunamadı' };
  
  // 7. sütun (Arşivlendi) alanını true yap
  sheet.getRange(rowIndex, 7).setValue(true);
  
  return { success: true, message: 'Personel arşivlendi' };
}

function restorePersonnel(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PERSONNEL);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  const searchId = String(id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Personel bulunamadı' };
  
  // 7. sütun (Arşivlendi) alanını false yap
  sheet.getRange(rowIndex, 7).setValue(false);
  
  return { success: true, message: 'Personel arşivden çıkarıldı' };
}

// ==================== İZİN İŞLEMLERİ ====================

function addLeave(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.LEAVES);
  
  if (!sheet) {
    getSheetData(SHEETS.LEAVES);
    sheet = ss.getSheetByName(SHEETS.LEAVES);
  }
  
  // Validasyon: personnelId boş olamaz
  if (!data || !data.personnelId) {
    return { success: false, error: 'İzin için personel seçilmedi' };
  }
  
  // Sıralı ID oluştur: L-1, L-2, L-3...
  const id = data.id || getNextId(SHEETS.LEAVES, 'L-');
  const createdAt = new Date();
  
  // Personel bilgisini al - String'e çevirerek karşılaştır
  const personnelResult = getPersonnel();
  const searchId = String(data.personnelId);
  const person = personnelResult.data.find(p => String(p.id) === searchId);
  
  if (!person) {
    return { success: false, error: 'Personel bulunamadı (ID: ' + searchId + ')' };
  }
  
  sheet.appendRow([
    id,
    data.personnelId,
    person.name,
    person.department,
    data.type,
    data.startDate,
    data.endDate,
    data.note || '',
    createdAt
  ]);
  
  return { 
    success: true, 
    message: 'İzin eklendi',
    data: { id, ...data, personnelName: person.name, department: person.department, createdAt }
  };
}

function updateLeave(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.LEAVES);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // String'e çevirerek karşılaştır
  const searchLeaveId = String(data.id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchLeaveId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'İzin bulunamadı' };
  
  // Personel bilgisini al - String'e çevirerek karşılaştır
  const personnelResult = getPersonnel();
  const searchPersonnelId = String(data.personnelId);
  const person = personnelResult.data.find(p => String(p.id) === searchPersonnelId);
  
  if (!person) return { success: false, error: 'Personel bulunamadı (ID: ' + searchPersonnelId + ')' };
  
  sheet.getRange(rowIndex, 2).setValue(data.personnelId);
  sheet.getRange(rowIndex, 3).setValue(person.name);
  sheet.getRange(rowIndex, 4).setValue(person.department);
  sheet.getRange(rowIndex, 5).setValue(data.type);
  sheet.getRange(rowIndex, 6).setValue(data.startDate);
  sheet.getRange(rowIndex, 7).setValue(data.endDate);
  sheet.getRange(rowIndex, 8).setValue(data.note || '');
  
  return { success: true, message: 'İzin güncellendi' };
}

function deleteLeave(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.LEAVES);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // String'e çevirerek karşılaştır
  const searchId = String(id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'İzin bulunamadı' };
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'İzin silindi' };
}

// ==================== YARDIMCI FONKSİYONLAR ====================

function updatePersonnelNameInLeaves(personnelId, newName, newDepartment) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.LEAVES);
  
  if (!sheet) return;
  
  const allData = sheet.getDataRange().getValues();
  const searchId = String(personnelId);
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][1]) === searchId) {
      sheet.getRange(i + 1, 3).setValue(newName);
      sheet.getRange(i + 1, 4).setValue(newDepartment);
    }
  }
}

function deleteLeavesByPersonnelId(personnelId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.LEAVES);
  
  if (!sheet) return;
  
  const allData = sheet.getDataRange().getValues();
  const searchId = String(personnelId);
  
  // Ters sırada sil (index kayması olmaması için)
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][1]) === searchId) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // Personele ait notları da sil
  deleteNotesByPersonnelId(personnelId);
}

// ==================== NOT İŞLEMLERİ ====================

function getAllNotes() {
  const data = getSheetData(SHEETS.NOTES);
  if (data.length <= 1) return { success: true, data: [] };
  
  const notes = data.slice(1).map(row => ({
    id: row[0],
    personnelId: row[1],
    personnelName: row[2],
    department: row[3],
    text: row[4] || '',
    createdAt: row[5] ? Utilities.formatDate(new Date(row[5]), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm') : '',
    updatedAt: row[6] ? Utilities.formatDate(new Date(row[6]), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm') : ''
  })).filter(n => n.id);
  
  return { success: true, data: notes };
}

function getNotes(personnelId) {
  const allNotes = getAllNotes();
  if (!personnelId) return allNotes;
  
  const searchId = String(personnelId);
  const filtered = allNotes.data.filter(n => String(n.personnelId) === searchId);
  return { success: true, data: filtered };
}

function addNote(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.NOTES);
  
  if (!sheet) {
    getSheetData(SHEETS.NOTES);
    sheet = ss.getSheetByName(SHEETS.NOTES);
  }
  
  if (!data || !data.personnelId || !data.text || !data.text.trim()) {
    return { success: false, error: 'Not içeriği boş olamaz' };
  }
  
  const id = getNextId(SHEETS.NOTES, 'N-');
  const now = new Date();
  
  // Personel bilgisini al
  const personnelResult = getPersonnel();
  const searchId = String(data.personnelId);
  const person = personnelResult.data.find(p => String(p.id) === searchId);
  
  const personnelName = person ? person.name : 'Bilinmeyen';
  const department = person ? person.department : '';
  
  sheet.appendRow([
    id,
    data.personnelId,
    personnelName,
    department,
    data.text.trim(),
    now,
    now
  ]);
  
  return {
    success: true,
    message: 'Not eklendi',
    data: {
      id,
      personnelId: data.personnelId,
      personnelName,
      department,
      text: data.text.trim(),
      createdAt: Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy HH:mm'),
      updatedAt: Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy HH:mm')
    }
  };
}

function updateNote(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NOTES);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  const searchId = String(data.id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Not bulunamadı' };
  
  const now = new Date();
  sheet.getRange(rowIndex, 5).setValue(data.text.trim());
  sheet.getRange(rowIndex, 7).setValue(now);
  
  return {
    success: true,
    message: 'Not güncellendi',
    data: {
      updatedAt: Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy HH:mm')
    }
  };
}

function deleteNote(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NOTES);
  
  if (!sheet) return { success: false, error: 'Sheet bulunamadı' };
  
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  const searchId = String(id);
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === searchId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: 'Not bulunamadı' };
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Not silindi' };
}

function deleteNotesByPersonnelId(personnelId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NOTES);
  
  if (!sheet) return;
  
  const allData = sheet.getDataRange().getValues();
  const searchId = String(personnelId);
  
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][1]) === searchId) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ==================== LOGIN FONKSİYONLARI ====================

function loginUser(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.USERS);
  
  if (!sheet) {
    // Kullanıcılar sheet'i yoksa oluştur ve varsayılan admin ekle
    sheet = ss.insertSheet(SHEETS.USERS);
    sheet.appendRow(['Email', 'Sifre', 'Ad']);
    sheet.appendRow(['admin@admin.com', 'admin123', 'Admin']);
  }
  
  const allData = sheet.getDataRange().getValues();
  
  // İlk satır başlık, atla
  for (let i = 1; i < allData.length; i++) {
    const email = allData[i][0];
    const password = allData[i][1];
    const name = allData[i][2];
    
    if (email === data.email && password === data.password) {
      return {
        success: true,
        data: {
          email: email,
          name: name
        }
      };
    }
  }
  
  return { success: false, error: 'Geçersiz email veya şifre' };
}

// ==================== BAŞLANGIÇ SETUP ====================
// Bu fonksiyonu bir kez çalıştırarak tüm sheet'leri oluşturabilirsiniz
function setupSheets() {
  getSheetData(SHEETS.PERSONNEL);
  getSheetData(SHEETS.LEAVES);
  getSheetData(SHEETS.DEPARTMENTS);
  getSheetData(SHEETS.TASKS);
  getSheetData(SHEETS.LEAVE_TYPES);
  getSheetData(SHEETS.NOTES);
  
  // Kullanıcılar sheet'ini oluştur
  const ss = getSpreadsheet();
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow(['Email', 'Sifre', 'Ad']);
    usersSheet.appendRow(['admin@admin.com', 'admin123', 'Admin']);
  }
  
  Logger.log('Tüm sheet\'ler oluşturuldu!');
}
