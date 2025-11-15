// backend/services/googleSheetService.js
// Generic Google Sheets helper functions used by controllers.
// Relies on getGoogleSheet() which returns { sheets, GOOGLE_SHEET_ID }.

import { getGoogleSheet } from "../config/googleSheetConfig.js";

/**
 * Check if a sheet exists in the spreadsheet
 */
async function sheetExists(sheetName) {
  try {
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID,
    });
    
    const sheet = spreadsheet.data.sheets.find(
      (s) => s.properties.title === sheetName
    );
    return !!sheet;
  } catch (error) {
    console.error(`Error checking if sheet "${sheetName}" exists:`, error.message);
    return false;
  }
}

/**
 * Create a new sheet with headers if it doesn't exist
 */
export async function createSheetIfNotExists(sheetName, headers = []) {
  try {
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
    
    // Check if sheet exists
    const exists = await sheetExists(sheetName);
    
    if (exists) {
      console.log(`✅ Sheet "${sheetName}" already exists`);
      // Verify headers exist if they should
      if (headers.length > 0) {
        try {
          const sheetData = await readSheetValues(sheetName);
          if (sheetData.headers.length === 0) {
            console.log(`⚠️ Sheet "${sheetName}" exists but has no headers, adding headers...`);
            await sheets.spreadsheets.values.update({
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `${sheetName}!A1`,
              valueInputOption: "USER_ENTERED",
              resource: { values: [headers] },
            });
            console.log(`✅ Headers added to sheet "${sheetName}"`);
          }
        } catch (error) {
          console.error(`Error checking headers for "${sheetName}":`, error.message);
        }
      }
      return;
    }
    
    // Create the sheet
    console.log(`📝 Creating sheet "${sheetName}"...`);
    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
    
    console.log(`✅ Sheet "${sheetName}" created successfully`);
    
    // Wait for sheet to be fully created
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add headers if provided
    if (headers.length > 0) {
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: "USER_ENTERED",
          resource: { values: [headers] },
        });
        console.log(`✅ Headers added to sheet "${sheetName}": ${headers.join(", ")}`);
        // Wait a bit more to ensure headers are written
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error adding headers to "${sheetName}":`, error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Error creating sheet "${sheetName}":`, error.message);
    throw error;
  }
}

/**
 * Read all rows for a given sheetName (tab).
 * Returns { headers: [...], rows: [ [col1, col2, ...], ... ] }
 */
export async function readSheetValues(sheetName) {
  try {
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}`,
    });

    const values = res.data.values || [];
    const headers = values[0] || [];
    const rows = values.slice(1); // everything after header
    return { headers, rows };
  } catch (error) {
    // If sheet doesn't exist or is empty, return empty data
    if (error.message && (error.message.includes("Unable to parse range") || error.message.includes("not found"))) {
      console.warn(`Sheet "${sheetName}" not found or empty:`, error.message);
      return { headers: [], rows: [] };
    }
    throw error;
  }
}

/**
 * Append a single row (array) to the sheet tab.
 * Creates the sheet with headers if it doesn't exist (for AuthUsers sheet).
 */
export async function appendRow(sheetName, rowArray, headers = null) {
  try {
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
    
    // Step 1: Ensure sheet exists with headers
    console.log(`🔍 Ensuring sheet "${sheetName}" exists...`);
    if (headers && headers.length > 0) {
      await createSheetIfNotExists(sheetName, headers);
    } else {
      await createSheetIfNotExists(sheetName);
    }
    
    // Step 2: Verify sheet exists (retry if needed)
    let retries = 0;
    let exists = false;
    while (retries < 3 && !exists) {
      exists = await sheetExists(sheetName);
      if (!exists) {
        console.log(`⚠️ Sheet "${sheetName}" not found, retrying... (${retries + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
    }
    
    if (!exists) {
      throw new Error(`Failed to create or verify sheet "${sheetName}" after ${retries} retries`);
    }
    
    console.log(`✅ Sheet "${sheetName}" exists and verified`);
    
    // Step 3: Verify headers exist if needed
    if (headers && headers.length > 0) {
      try {
        const sheetData = await readSheetValues(sheetName);
        if (!sheetData.headers || sheetData.headers.length === 0) {
          console.log(`⚠️ Sheet "${sheetName}" has no headers, adding headers...`);
          await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: "USER_ENTERED",
            resource: { values: [headers] },
          });
          console.log(`✅ Headers added to sheet "${sheetName}"`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Error verifying headers for "${sheetName}":`, error.message);
        // Try to add headers anyway
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: "USER_ENTERED",
            resource: { values: [headers] },
          });
          console.log(`✅ Headers added to sheet "${sheetName}" (fallback)`);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (updateError) {
          console.error(`Error adding headers (fallback):`, updateError.message);
        }
      }
    }
    
    // Step 4: Append the row - retry if needed
    let appendRetries = 0;
    let appendSuccess = false;
    let lastError = null;
    
    while (appendRetries < 3 && !appendSuccess) {
      try {
        const appendResponse = await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${sheetName}!A:A`, // Use A:A range - API finds next empty row
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          resource: { values: [rowArray] },
        });
        
        console.log(`✅ Row appended to sheet "${sheetName}" successfully`);
        appendSuccess = true;
        return appendResponse;
      } catch (error) {
        lastError = error;
        appendRetries++;
        
        // If it's a range error, wait and retry
        if (error.message && error.message.includes("Unable to parse range")) {
          console.log(`⚠️ Range error on append, retrying... (${appendRetries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          // Re-verify sheet exists
          const stillExists = await sheetExists(sheetName);
          if (!stillExists) {
            console.log(`⚠️ Sheet "${sheetName}" disappeared, recreating...`);
            if (headers && headers.length > 0) {
              await createSheetIfNotExists(sheetName, headers);
            } else {
              await createSheetIfNotExists(sheetName);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          // Other error, don't retry
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error(`Failed to append row to sheet "${sheetName}" after ${appendRetries} retries`);
    
  } catch (error) {
    console.error(`❌ Error appending row to sheet "${sheetName}":`, error.message);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    throw error;
  }
}

/**
 * Update a specific row (1-based rowNumber) in the sheet.
 * rowArray is the full row values (same number of columns as header)
 */
export async function updateRow(sheetName, rowNumber, rowArray) {
  const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
  // Build range like "Projects!A5:Z5"
  // We'll write only the needed columns. Simpler: write from column A to last column.
  const endCol = String.fromCharCode("A".charCodeAt(0) + rowArray.length - 1);
  const range = `${sheetName}!A${rowNumber}:${endCol}${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [rowArray] },
  });
}

/**
 * Delete a single row using Google Sheets API batchUpdate deleteDimension.
 * This is the proper way to delete rows in Google Sheets.
 * rowIndexToDelete is 0-based index into the rows array (not counting header).
 * The actual sheet row number = rowIndexToDelete + 2 (1 for header + 1 for 0-based to 1-based conversion)
 */
export async function deleteRowByIndex(sheetName, rowIndexToDelete) {
  const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
  
  // First, get the sheet ID by name
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEET_ID,
  });
  
  const sheet = spreadsheet.data.sheets.find((s) => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  const sheetId = sheet.properties.sheetId;
  
  // Read current values to validate
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}`,
  });
  
  const values = res.data.values || [];
  
  if (values.length <= 1) {
    // nothing to delete (only header or empty)
    console.log(`Sheet ${sheetName} has no data rows to delete`);
    return;
  }

  // Validate index
  if (rowIndexToDelete < 0 || rowIndexToDelete >= values.length - 1) {
    throw new Error(`Invalid row index ${rowIndexToDelete}. Sheet has ${values.length - 1} data rows.`);
  }

  // Calculate the actual row number in the sheet (1-based)
  // rowIndexToDelete is 0-based for data rows (excluding header)
  // Sheet row 1 = header
  // Sheet row 2 = first data row (rowIndexToDelete = 0)
  // So: sheetRowNumber = rowIndexToDelete + 2
  const sheetRowNumber = rowIndexToDelete + 2;

  console.log(`Deleting row at index ${rowIndexToDelete} (sheet row ${sheetRowNumber}) from sheet ${sheetName} (total rows: ${values.length})`);

  // Use batchUpdate to delete the row using deleteDimension
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: GOOGLE_SHEET_ID,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: sheetRowNumber - 1, // 0-based index (row 2 = index 1)
              endIndex: sheetRowNumber, // endIndex is exclusive
            },
          },
        },
      ],
    },
  });

  console.log(`Row ${sheetRowNumber} deleted successfully from sheet ${sheetName}`);
}
