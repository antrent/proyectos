export const CsvHelper = {
  // Convert JSON array of objects to CSV string
  jsonToCsv(data, columns) {
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(item => {
      return columns.map(col => {
        let value = item[col.key];
        if (value === undefined || value === null) {
          value = '';
        } else {
          value = String(value);
        }
        // Escape quotes, commas and newlines
        if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    });
    return [headers, ...rows].join('\n');
  },

  // Parse CSV string into JSON array of objects mapped by headers
  csvToJson(csvText, columns) {
    // Remove UTF-8 BOM if present (added on export for Excel compatibility)
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++; // skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentLine.push(currentField.trim());
          currentField = '';
        } else if (char === '\r' || char === '\n') {
          currentLine.push(currentField.trim());
          currentField = '';
          if (currentLine.some(f => f !== '')) {
            lines.push(currentLine);
          }
          currentLine = [];
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
        } else {
          currentField += char;
        }
      }
    }

    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f !== '')) {
        lines.push(currentLine);
      }
    }

    if (lines.length === 0) return [];

    const headers = lines[0].map(h => h.toLowerCase().trim());
    const jsonRows = [];

    for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
      const row = lines[rowIdx];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const obj = {};
      columns.forEach(col => {
        const colLabelNormalized = col.label.toLowerCase().trim();
        const headerIdx = headers.findIndex(h => h === colLabelNormalized);
        if (headerIdx !== -1 && row[headerIdx] !== undefined) {
          obj[col.key] = row[headerIdx];
        } else {
          obj[col.key] = ''; // Default empty
        }
      });
      jsonRows.push(obj);
    }

    return jsonRows;
  },

  // Trigger web browser download of CSV string
  download(csvText, filename) {
    // UTF-8 BOM (\uFEFF) forces Microsoft Excel to open CSV with correct encoding for Spanish characters
    const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
