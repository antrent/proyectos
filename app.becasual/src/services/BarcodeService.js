export class Barcode128Svg {
  constructor(input, factor = 2, height = 75) {
    // Sanitize input to only include printable ASCII characters
    this.input = (input || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Strip accents
      .replace(/[^\x20-\x7E]/g, ''); // Keep only standard printable ASCII
    this.factor = factor;
    this.height = height;
  }

  toString() {
    const h = this.height;
    const f = this.factor;
    let svg = "\n";
    let x = 10 * f; // Initial quiet zone offset
    let sum = 104; // Start B value is 104

    // Pattern table for ASCII 32 to 126
    const data = "212222222122222221121223121322131222122213122312132212221213221312231212112232122132122231113222123122123221223211221132221231213212223112312131311222321122321221312212322112322211212123212321232121111323131123131321112313132113132311211313231113231311112133112331132131113123113321133121313121211331231131213113213311213131311123311321331121312113312311332111314111221411431111111224111422121124121421141122141221112214112412122114122411142112142211241211221114413111241112134111111242121142121241114212124112124211411212421112421211212141214121412121111143111341131141114113114311411113411311113141114131311141411131"
      .split(/(\d{6})/)
      .filter(Boolean);

    const lookup = {};
    for (let i = 32; i < 127; i++) {
      lookup[String.fromCharCode(i)] = [i - 32, data[i - 32]];
    }

    function draw(d) {
      if (!d) return;
      d.split("").forEach((n, idx) => {
        // Even indices are bars, odd indices are spaces
        if (idx % 2 === 0) {
          svg += `<rect x="${x}" y="0" width="${Number(n) * f}" height="${h}" fill="black" />`;
        }
        x += Number(n) * f;
      });
    }

    // Start Code B (211214)
    draw("211214");

    // Encode data characters
    const chars = this.input.split("");
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const l = lookup[char] || [0, "212222"]; // Fallback to space if char not found
      sum += l[0] * (i + 1);
      draw(l[1]);
    }

    // Modulo 103 checksum character
    draw(data[sum % 103]);

    // Stop character (2331112) + termination bar (2) => 23311122
    draw("23311122");

    // Total width including right quiet zone margin
    const totalWidth = x + 10 * f;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${h}" width="100%" height="100%">${svg}</svg>`;
  }
}

export function printProductLabels(product, quantity = 1) {
  const printWindow = window.open('', '_blank', 'width=600,height=500');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes (popups) en tu navegador para poder imprimir las etiquetas.');
    return;
  }

  const barcodeValue = product.sku || product.barcode || '';
  const barcodeSvg = new Barcode128Svg(barcodeValue, 1.0, 35).toString();

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const priceFormatted = formatCOP(product.sellPrice);

  let labelsHtml = '';
  for (let i = 0; i < quantity; i++) {
    labelsHtml += `
      <div class="label-container">
        <div class="product-name">${product.name.toUpperCase()}</div>
        <div class="barcode-wrapper">
          ${barcodeSvg}
        </div>
        <div class="barcode-text">${barcodeValue}</div>
        <div class="footer-info">
          <span class="product-price">${priceFormatted}</span>
          <span class="product-size">TALLA: ${product.size || '-'}</span>
        </div>
      </div>
    `;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Imprimir Etiquetas - BeCasual</title>
        <style>
          @page {
            size: 32mm 25mm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 32mm;
            height: 25mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: white;
            color: black;
          }
          .label-container {
            width: 32mm;
            height: 25mm;
            box-sizing: border-box;
            padding: 1.0mm 1.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            page-break-after: always;
            overflow: hidden;
          }
          .product-name {
            font-size: 5.5pt;
            font-weight: 700;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            margin-top: 0.1mm;
          }
          .barcode-wrapper {
            margin: 0.2mm 0;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 8mm;
          }
          .barcode-wrapper svg {
            width: 28mm;
            height: 100%;
            max-height: 8mm;
          }
          .barcode-text {
            font-size: 5pt;
            font-family: "Courier New", Courier, monospace;
            font-weight: bold;
            margin-top: -0.3mm;
            letter-spacing: 0.5px;
          }
          .footer-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            font-size: 6.5pt;
            font-weight: bold;
            border-top: 0.5px dashed #000;
            padding-top: 0.5mm;
            margin-top: 0.1mm;
          }
          .product-price {
            font-size: 7.5pt;
            font-weight: bold;
          }
          .product-size {
            background: #000;
            color: #fff;
            padding: 0.1mm 1.0mm;
            border-radius: 2px;
            font-size: 6pt;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
