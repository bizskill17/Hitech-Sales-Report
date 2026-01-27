
/**
 * SalesInsight Pro - Data Bridge (Production Grade)
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all existing code with this script.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select 'Web App'.
 * 6. Set "Execute as" to: 'Me'.
 * 7. Set "Who has access" to: 'Anyone'.
 * 8. Click 'Deploy' and Copy the 'Web App URL'.
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    // Look for the specific tab names from your screenshot
    let sheet = ss.getSheetByName("Sales Analysis") || 
                ss.getSheetByName("Sales Analysis2") || 
                sheets.find(s => s.getName().toLowerCase().includes("sales")) ||
                sheets[0];
    
    // Get all data from the sheet
    const values = sheet.getDataRange().getValues();
    
    // If sheet is empty or only has headers
    if (!values || values.length < 2) {
      return createJsonResponse([]); 
    }
    
    // The data mapping matches your spreadsheet screenshot:
    // A: Date(0), B: Inv(1), C: Customer(2), D: Hidden(3)
    // E: Sales person(4), F: Item Name(5), G: Brand(6), H: Quantity(7)
    // I: Units(8), J: Pack Size(9), K: Invoice Status(10), L: Qty Ltrs(11)
    
    const results = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Basic row validation: skip if both Salesperson and Item Name are missing
      const salesperson = row[4] ? String(row[4]).trim() : "";
      const itemName = row[5] ? String(row[5]).trim() : "";
      
      if (!salesperson && !itemName) continue;
      
      const qtyValue = parseFloat(row[7]) || 0;
      const packValue = parseFloat(row[9]) || 1;
      
      results.push({
        // Extracting data with reliable fallbacks
        date: formatAsIsoDate(row[0]) || new Date().toISOString().split('T')[0],
        invoice: row[1] ? String(row[1]) : "INV-" + i,
        customer: row[2] ? String(row[2]) : "General Customer",
        salesperson: salesperson || "Unknown",
        item: itemName || "Unspecified Item",
        brand: row[6] ? String(row[6]).trim() : "Others",
        qty: qtyValue,
        packSize: packValue,
        status: row[10] ? String(row[10]).trim() : "Closed"
      });
    }

    return createJsonResponse(results);
    
  } catch (err) {
    // Return a JSON error object if something goes wrong
    return createJsonResponse({ error: "Script Error", details: err.toString() });
  }
}

/**
 * Ensures dates are formatted correctly for the dashboard (YYYY-MM-DD)
 */
function formatAsIsoDate(dateVal) {
  if (!dateVal) return null;
  
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    const day = ("0" + dateVal.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  
  // Try parsing string if not a Date object
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = ("0" + (d.getMonth() + 1)).slice(-2);
      const day = ("0" + d.getDate()).slice(-2);
      return year + "-" + month + "-" + day;
    }
  } catch(e) {}
  
  return null;
}

/**
 * Formats the response as application/json
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
