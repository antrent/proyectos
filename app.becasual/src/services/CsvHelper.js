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

    // Auto-detect delimiter (comma or semicolon) based on first line
    let delimiter = ',';
    const firstLineEnd = csvText.indexOf('\n');
    const firstLine = firstLineEnd !== -1 ? csvText.substring(0, firstLineEnd) : csvText;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    if (semicolonCount > commaCount) {
      delimiter = ';';
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
        } else if (char === delimiter) {
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

    // Helper to normalize strings (lowercase, strip accents, normalize spaces)
    const normalizeString = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ' ')
        .trim();
    };

    const COLUMN_ALIASES = {
      invoiceNumber: ['numero factura', 'nro factura', 'factura', 'id factura', 'consecutivo', 'consecutivo factura', 'nro. factura', 'nro_factura', 'nro', 'numero_factura', 'numero', 'num factura', 'num. factura', 'nro de factura', 'numero de factura'],
      date: ['fecha y hora', 'fecha', 'fecha_hora', 'fecha factura', 'fecha de factura', 'date', 'fecha/hora', 'creado el', 'creado'],
      clientName: ['nombre cliente', 'cliente', 'nombre', 'nombre_cliente', 'cliente nombre', 'client', 'comprador'],
      clientDocument: ['documento cliente', 'documento', 'documento_cliente', 'cedula', 'nit', 'id cliente', 'identificacion', 'cc', 'doc', 'documento de identidad'],
      name: ['nombre producto', 'producto', 'articulo', 'descripcion', 'name', 'nombre_producto', 'detalle', 'descripcion producto', 'concepto', 'item'],
      barcode: ['codigo de barras', 'codigo', 'codigo_barras', 'barcode', 'ref', 'referencia', 'cod barras', 'cod. barras', 'codigo barras', 'plu'],
      quantity: ['cantidad', 'cant', 'quantity', 'cant.', 'unidades', 'uds', 'cant_vendida', 'cantidad vendida'],
      sellPrice: ['precio', 'precio venta', 'precio unitario', 'valor unitario', 'valor', 'precio_venta', 'price', 'vlr unitario', 'valor venta', 'valor unitario'],
      discount: ['descuento porcentaje', 'descuento', 'desc', 'descuento %', '% descuento', 'dcto', 'descuento valor'],
      paymentMethod: ['metodo pago', 'forma pago', 'metodo de pago', 'forma de pago', 'medio pago', 'medio de pago', 'tipo pago', 'pago', 'metodo_pago'],
      subtotal: ['subtotal factura', 'subtotal', 'sub_total', 'sub total', 'subtotal_factura', 'valor subtotal'],
      tax: ['iva factura', 'iva', 'impuesto', 'valor iva', 'iva_factura', 'impuestos'],
      total: ['total factura', 'total', 'valor total', 'total_factura', 'vlr total', 'total pagado'],
      sellerId: ['usuario vendedor', 'vendedor', 'usuario', 'seller', 'vendedor id', 'id vendedor', 'cajero'],
      cancelled: ['anulada', 'estado', 'anulado', 'cancelado', 'cancelada', 'cancelado?', 'anulado?', 'anulada?']
    };

    const headers = lines[0].map(h => normalizeString(h));
    const jsonRows = [];

    for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
      const row = lines[rowIdx];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const obj = {};
      columns.forEach(col => {
        const key = col.key;
        const aliases = COLUMN_ALIASES[key] || [];
        const labelNormalized = normalizeString(col.label);
        const keyNormalized = normalizeString(key);

        const headerIdx = headers.findIndex(h => 
          h === labelNormalized || 
          h === keyNormalized || 
          aliases.includes(h)
        );

        if (headerIdx !== -1 && row[headerIdx] !== undefined) {
          obj[key] = row[headerIdx];
        } else {
          obj[key] = ''; // Default empty
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
