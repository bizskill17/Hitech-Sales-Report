
import { RawSalesRecord } from '../types.ts';

/**
 * Parses a CSV string into an array of objects.
 * Handles quoted values containing commas.
 */
const parseCSV = (csv: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        }
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
};

/**
 * Fetches data from a source URL. 
 * Supports both direct CSV export URLs and Apps Script Web App (JSON) URLs.
 */
export const fetchDataFromSource = async (source: string): Promise<RawSalesRecord[]> => {
  let url = source;
  
  // If it's just an ID, assume it's a Google Sheet ID for CSV export
  if (!source.startsWith('http')) {
    url = `https://docs.google.com/spreadsheets/d/${source}/export?format=csv&gid=0`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Connection failed. Check your URL or Sheet ID and ensure public access.");
  
  const contentType = response.headers.get('content-type');

  // Handle JSON response (typical for Apps Script doGet)
  if (contentType && contentType.includes('application/json')) {
    const jsonData = await response.json();
    return jsonData.map((row: any, index: number) => {
      // Logic to map fields if they are in different positions in JSON
      const qty = parseFloat(row.qty || row[7]) || 0;
      const packSize = parseFloat(row.packSize || row[9]) || 1;
      return {
        date: row.date || row[0],
        invoice: row.invoice || row[1] || `ROW-${index}`,
        customer: row.customer || row[2] || 'Unknown',
        salesperson: row.salesperson || row[4] || 'N/A',
        item: row.item || row[5] || 'Unknown',
        brand: row.brand || row[6] || 'Generic',
        qty,
        packSize,
        status: row.status || row[10] || 'Completed',
        totalQty: qty * packSize
      };
    });
  }

  // Handle CSV response
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  const dataRows = rows.slice(1);

  return dataRows.map((row, index) => {
    const qty = parseFloat(row[7]) || 0;
    const packSize = parseFloat(row[9]) || 1;
    return {
      date: row[0], 
      invoice: row[1] || `ROW-${index}`,
      customer: row[2] || 'Unknown',
      salesperson: row[4] || 'N/A',
      item: row[5] || 'Unknown',
      brand: row[6] || 'Generic',
      qty,
      packSize,
      status: row[10] || 'Completed',
      totalQty: qty * packSize
    };
  });
};

export const fetchRawData = async (): Promise<RawSalesRecord[]> => [];

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const getFiscalYearStart = (date: Date): number => {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

export const getFiscalYearDisplay = (fy: number): string => {
  const shortFy = String(fy).slice(-2);
  const nextShortFy = String(fy + 1).slice(-2);
  return `${shortFy}-${nextShortFy}`;
};
