/**
 * Nexus Global Compliance Portal - Backend Web App
 * Serverless architecture built on Google Apps Script
 */

// --- CONFIGURATION ---
const SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; 
const MAIN_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; 

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Nexus Global Compliance')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getUserAuth() {
  const email = Session.getActiveUser().getEmail();
  if (!email) return { authorized: false, error: "Please log in to your Google account." };

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  let userFound = false, name = "", surname = "", jobTitle = "", userRegion = "";

  // Authenticate user against registered database
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      name = data[i][1];
      surname = data[i][2];
      jobTitle = data[i][3] || "Portal User";
      userRegion = data[i][4] || "Global";
      userFound = true;
      break;
    }
  }

  if (!userFound) return { authorized: false, error: `Email (${email}) is not registered in the system.` };
  
  return { authorized: true, email: email, fullName: `${name} ${surname}`, title: jobTitle, region: userRegion };
}

function getSystemData() {
  const docSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
  const docData = docSheet.getDataRange().getValues();
  const documents = [];
  const folderTree = {};

  // 1. Fetch all documents and build UI folder tree
  for (let i = 1; i < docData.length; i++) {
    const row = docData[i]; 
    
    // SAFETY CHECK: Ignore corrupted or half-uploaded rows to prevent UI crashes
    if (!row || !row[0] || !row[2]) continue; 
    
    try {
      let categoryString = String(row[2]);
      let cDate = new Date(row[3]);
      if (isNaN(cDate.getTime())) cDate = new Date(); 
      let eDate = new Date(row[4]);
      if (isNaN(eDate.getTime())) eDate = new Date();

      documents.push({
        id: String(row[0]),
        title: String(row[1]),
        category: categoryString,
        creationDate: Utilities.formatDate(cDate, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        expiryDate: Utilities.formatDate(eDate, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        status: String(row[5]),
        ownerEmail: String(row[6]),
        url: String(row[7]),
        region: row[8] ? String(row[8]) : "Global"
      });

      const parts = categoryString.split('/');
      const root = parts[0];
      if (!folderTree[root]) folderTree[root] = [];
      if (parts.length > 1 && !folderTree[root].includes(parts[1])) {
        folderTree[root].push(parts[1]);
      }
    } catch (e) {
      console.error("Skipped corrupted row at index " + i);
    }
  }

  // 2. Fetch Dynamic Main Folders mapping
  const mainFolderSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('MainFolders');
  const mainFolders = [];
  if (mainFolderSheet) {
    const mfData = mainFolderSheet.getDataRange().getValues();
    for (let i = 1; i < mfData.length; i++) {
      if (mfData[i][0]) {
        mainFolders.push(String(mfData[i][0]).trim());
      }
    }
  }

  return { documents, folderTree, mainFolders };
}

function uploadFile(base64Data, filename, category, subcategory, expiryDate, uploaderEmail, region) {
  try {
    const splitBase = base64Data.split(',');
    const type = splitBase[0].split(';')[0].replace('data:', '');
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const blob = Utilities.newBlob(byteCharacters, type, filename);
    
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    const rootIterator = mainFolder.getFoldersByName(category);
    let targetFolder = rootIterator.hasNext() ? rootIterator.next() : mainFolder.createFolder(category);
    
    let fullCategoryPath = category;
    if (subcategory) {
      const subIterator = targetFolder.getFoldersByName(subcategory);
      targetFolder = subIterator.hasNext() ? subIterator.next() : targetFolder.createFolder(subcategory);
      fullCategoryPath = category + "/" + subcategory;
    }
    
    const file = targetFolder.createFile(blob);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
    sheet.appendRow(['DOC-' + Math.floor(Math.random() * 100000), filename, fullCategoryPath, new Date(), new Date(expiryDate), 'Active', uploaderEmail, file.getUrl(), region]);
    
    return { success: true, message: "File securely uploaded!" };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// BATCH UPLOAD FUNCTION
function uploadFolderFile(base64Data, filename, pathArray, expiryDate, uploaderEmail, region) {
  try {
    let currentFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    for (let folderName of pathArray) {
      let iter = currentFolder.getFoldersByName(folderName);
      currentFolder = iter.hasNext() ? iter.next() : currentFolder.createFolder(folderName);
    }
    
    const splitBase = base64Data.split(',');
    const blob = Utilities.newBlob(Utilities.base64Decode(splitBase[1]), splitBase[0].split(';')[0].replace('data:', ''), filename);
    const file = currentFolder.createFile(blob);
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
    sheet.appendRow(['DOC-' + Math.floor(Math.random() * 100000), filename, pathArray.join('/'), new Date(), new Date(expiryDate), 'Active', uploaderEmail, file.getUrl(), region]);
    
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function createNewFolder(name, parentName) {
  try {
    const main = DriveApp.getFolderById(MAIN_FOLDER_ID);
    let fullPath = name;
    
    if (!parentName) {
      main.createFolder(name);
    } else {
      let it = main.getFoldersByName(parentName);
      if (it.hasNext()) it.next().createFolder(name);
      fullPath = parentName + '/' + name;
    }

    // Register placeholder row so empty folders don't vanish from UI
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
    sheet.appendRow([
      'DIR-' + Math.floor(Math.random() * 100000), 
      '— Folder Created —', 
      fullPath, 
      new Date(), 
      new Date(new Date().setFullYear(new Date().getFullYear() + 10)), 
      'Active', 
      Session.getActiveUser().getEmail(), 
      '', 
      'Global'
    ]);

    return { success: true, message: "Folder created successfully!" };
  } catch (e) { 
    return { success: false, message: e.toString() }; 
  }
}

function renameCategory(oldName, newName) {
  try {
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    const iter = mainFolder.getFoldersByName(oldName);
    if (iter.hasNext()) {
      iter.next().setName(newName);
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === oldName || data[i][2].startsWith(oldName + '/')) {
        const updatedCategory = data[i][2].replace(oldName, newName);
        sheet.getRange(i + 1, 3).setValue(updatedCategory);
      }
    }
    return { success: true, message: "Folder renamed successfully." };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteCategory(folderName, parentFolder) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    
    const targetPath = parentFolder ? `${parentFolder}/${folderName}` : folderName;

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][2] === targetPath || data[i][2].startsWith(targetPath + '/')) {
        rowsToDelete.push(i + 1);
      }
    }
    // Delete from DB
    rowsToDelete.forEach(rowIndex => sheet.deleteRow(rowIndex));

    // Delete from Drive
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    if (parentFolder) {
      const pIter = mainFolder.getFoldersByName(parentFolder);
      if (pIter.hasNext()) {
        const subIter = pIter.next().getFoldersByName(folderName);
        if (subIter.hasNext()) subIter.next().setTrashed(true);
      }
    } else {
      const fIter = mainFolder.getFoldersByName(folderName);
      if (fIter.hasNext()) fIter.next().setTrashed(true);
    }
    
    return { success: true, message: "Folder and all associated documents deleted." };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteDocument(docId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Documents');
  const data = sheet.getDataRange().getValues();
  let deletedCategory = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === docId) {
      deletedCategory = data[i][2];
      sheet.deleteRow(i + 1);
      break;
    }
  }

  if (deletedCategory) {
    // Check if the folder is now empty. If so, leave a placeholder so the UI doesn't drop the folder.
    const newData = sheet.getDataRange().getValues();
    let folderStillHasFiles = false;
    for (let i = 1; i < newData.length; i++) {
      if (newData[i][2] === deletedCategory || newData[i][2].startsWith(deletedCategory + '/')) {
        folderStillHasFiles = true;
        break;
      }
    }
    
    if (!folderStillHasFiles) {
      sheet.appendRow([
        'DIR-' + Math.floor(Math.random() * 100000), 
        '— Folder Created —', 
        deletedCategory, 
        new Date(), 
        new Date(new Date().setFullYear(new Date().getFullYear() + 10)), 
        'Active', 
        Session.getActiveUser().getEmail(), 
        '', 
        'Global'
      ]);
    }
    return { success: true };
  }
  return { success: false };
}
