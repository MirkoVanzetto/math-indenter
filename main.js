const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');




let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  mainWindow.loadFile('index.html');
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuovo',
          accelerator: 'Ctrl+N',
          click: () => mainWindow.webContents.send('menu-new-file')
        },
        {
          label: 'Apri',
          accelerator: 'Ctrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'File Matematici', extensions: ['math'] },
                { name: 'Tutti i file', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const content = fs.readFileSync(result.filePaths[0], 'utf8');
                mainWindow.webContents.send('menu-open-file', content, result.filePaths[0]);
              } catch (error) {
                dialog.showErrorBox('Errore', 'Impossibile aprire il file: ' + error.message);
              }
            }
          }
        },
        {
          label: 'Salva',
          accelerator: 'Ctrl+S',
          click: () => mainWindow.webContents.send('menu-save-file')
        },
        {
          label: 'Salva con nome',
          accelerator: 'Ctrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as-file')
        },
        { type: 'separator' },
        {
          label: 'Esporta PDF',
          accelerator: 'Ctrl+P',
          click: () => mainWindow.webContents.send('menu-export-pdf')
        },
        {
          label: 'Esporta HTML',
          accelerator: 'Ctrl+E',
          click: () => mainWindow.webContents.send('menu-export-html')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Esci' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripristina' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectall', label: 'Seleziona tutto' }
      ]
    },{
      label: 'Visualizza',
      submenu: [
          { role: 'reload', label: 'Ricarica' },
          { role: 'forceReload', label: 'Forza Ricarica' },
          { role: 'toggleDevTools', label: 'DevTools' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Normale' },
          { role: 'zoomIn', label: 'Zoom Avanti' },
          { role: 'zoomOut', label: 'Zoom Indietro' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Schermo Intero' }
      ]
  }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createMathSymbolImage(symbol, color = '#2C3E50') {
  const canvas = createCanvas(50, 20);
  const ctx = canvas.getContext('2d');
  
  // Sfondo trasparente
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, 50, 20);
  
  // Testo
  ctx.fillStyle = color;
  ctx.font = '16px Arial';
  ctx.fillText(symbol, 5, 15);
  
  return canvas.toBuffer();
}

// Modifica la funzione colorizeEquationForPDF
// Aggiungi queste funzioni helper prima della funzione colorizeEquationForPDF

// Helper per convertire simboli Unicode in comandi LaTeX
function convertUnicodeToLatex(text) {
  const symbolMap = {
      '∑': '\\sum',
      '∫': '\\int',
      '∂': '\\partial',
      '∇': '\\nabla',
      '∆': '\\Delta',
      '√': '\\sqrt',
      'π': '\\pi',
      '∞': '\\infty',
      'α': '\\alpha',
      'β': '\\beta',
      'γ': '\\gamma',
      'δ': '\\delta',
      'ε': '\\varepsilon',
      'θ': '\\theta',
      'λ': '\\lambda',
      'μ': '\\mu',
      'σ': '\\sigma',
      'φ': '\\phi',
      'ω': '\\omega',
      '→': '\\to',
      '±': '\\pm',
      '≠': '\\neq',
      '≡': '\\equiv',
      '≈': '\\approx',
      '≤': '\\leq',
      '≥': '\\geq',
      '∈': '\\in',
      '∀': '\\forall',
      '∃': '\\exists',
      '⇒': '\\Rightarrow',
      '×': '\\times',
      '÷': '\\div',
      '⋅': '\\cdot'
  };

  let result = text;
  Object.keys(symbolMap).forEach(symbol => {
      const regex = new RegExp(symbol, 'g');
      result = result.replace(regex, symbolMap[symbol]);
  });
  
  return result;
}

// Nuova funzione per scrivere equazioni matematiche nel PDF
function writeMathEquation(doc, equation, variableColors, x, y) {
  const colors = variableColors || {};
  let currentY = y;
  const lineHeight = 25;
  const pageWidth = doc.page.width - 100;
  const fs = require('fs');
  const fontPath = path.join(__dirname, 'fonts', 'dejavu-fonts-ttf-2.37', 'ttf', 'DejaVuSans.ttf');

  if (!fs.existsSync(fontPath)) {
    console.error('Font non trovato:', fontPath);
    return;
  }

  // Registra il font matematico
  doc.registerFont('DejaVuSans', fontPath);
  doc.font('DejaVuSans').fontSize(14);


  
  // Converti l'equazione in formato leggibile per PDF
  let latexEquation = convertUnicodeToLatex(equation);
  
  // Semplifica ulteriormente per PDF
  latexEquation = latexEquation
      .replace(/\\sum/g, 'Σ')
      .replace(/\\int/g, '∫')
      .replace(/\\partial/g, '∂')
      .replace(/\\nabla/g, '∇')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\sqrt/g, '√')
      .replace(/\\pi/g, 'π')
      .replace(/\\infty/g, '∞')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\varepsilon/g, 'ε')
      .replace(/\\theta/g, 'θ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\to/g, '→')
      .replace(/\\pm/g, '±')
      .replace(/\\neq/g, '≠')
      .replace(/\\equiv/g, '≡')
      .replace(/\\approx/g, '≈')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\in/g, '∈')
      .replace(/\\forall/g, '∀')
      .replace(/\\exists/g, '∃')
      .replace(/\\Rightarrow/g, '⇒')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '⋅');
  
  // Usa un font che supporta più caratteri matematici
  doc.font('Helvetica')
     .fontSize(12)
     .fillColor('#2C3E50');
  
  // Gestisci il testo lungo andando a capo
  const words = latexEquation.split(/(\s+)/);
  let currentX = x;
  let line = '';
  
  for (const word of words) {
      const testLine = line + word;
      const testWidth = doc.widthOfString(testLine);
      
      if (testWidth > (pageWidth - currentX) && line !== '') {
          // Scrivi la linea corrente
          writeColoredLine(doc, line, colors, currentX, currentY);
          currentY += lineHeight;
          line = word;
          currentX = x;
      } else {
          line = testLine;
      }
  }
  
  // Scrivi l'ultima linea
  if (line) {
      writeColoredLine(doc, line, colors, currentX, currentY);
      currentY += lineHeight;
  }
  
  return { newX: x, newY: currentY };
}

// Helper per scrivere una linea con variabili colorate
function writeColoredLine(doc, line, colors, x, y) {
  let currentX = x;
  
  // Cerca variabili nella linea
  const words = line.split(/(\s+)/);
  
  for (const word of words) {
      const cleanWord = word.trim();
      
      if (colors[cleanWord]) {
          // Variabile colorata
          doc.fillColor(colors[cleanWord])
             .font('DejaVuSans');
      } else {
          // Testo normale
          doc.fillColor('#2C3E50')
             .font('DejaVuSans');
      }
      
      doc.text(word, currentX, y);
      currentX += doc.widthOfString(word);
  }
}

// Sostituisci la funzione colorizeEquationForPDF con questa versione migliorata


// Funzione per testo semplice senza simboli matematici
function writeSimpleText(doc, text, variableColors, x, y) {
  const colors = variableColors || {};
  let currentY = y;
  const lineHeight = 20;
  const pageWidth = doc.page.width - 100;
  
  doc.font('DejaVuSans')
     .fontSize(12)
     .fillColor('#2C3E50');
  
  const words = text.split(/(\s+)/);
  let currentX = x;
  
  for (const word of words) {
      if (!word.trim()) {
          currentX += doc.widthOfString(' ');
          continue;
      }
      
      const wordWidth = doc.widthOfString(word);
      
      if (currentX + wordWidth > pageWidth) {
          currentX = x;
          currentY += lineHeight;
      }
      
      if (colors[word]) {
          doc.fillColor(colors[word]).font('DejaVuSans');
      } else {
          doc.fillColor('#2C3E50').font('DejaVuSans');
      }
      
      doc.text(word, currentX, currentY);
      currentX += wordWidth;
  }
  
  return { newX: currentX, newY: currentY + lineHeight };
}

// Nuova funzione per formattare equazioni LaTeX
function formatLatexEquation(doc, equation, variableColors, x, y) {
  const colors = variableColors || {};
  let currentY = y;
  
  // Stile per matematica
  doc.font('Helvetica')
     .fontSize(14)
     .fillColor('#2C3E50');
  
  // Semplifica LaTeX per il PDF (rimuovi comandi complessi)
  let simplified = equation
      .replace(/\\/g, ' ')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/\^/g, '^')
      .replace(/_/g, '_');
  
  // Dividi in righe se troppo lunga
  const lines = simplified.split('. ');
  
  lines.forEach(line => {
      if (line.trim()) {
          doc.text(line.trim(), x, currentY);
          currentY += 25;
      }
  });
  
  return { newX: x, newY: currentY };
}


// GESTORI IPC
ipcMain.handle('save-file', async (event, content, filePath) => {
  try {
    if (filePath) {
      fs.writeFileSync(filePath, content);
      return { success: true, path: filePath };
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'File Matematici', extensions: ['math'] },
          { name: 'Tutti i file', extensions: ['*'] }
        ],
        defaultPath: 'documento.math'
      });
      
      if (!result.canceled) {
        fs.writeFileSync(result.filePath, content);
        return { success: true, path: result.filePath };
      }
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pdf', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ],
      defaultPath: 'documento_matematico.pdf'
    });
    
    if (!data) {
      throw new Error('Nessun dato fornito per il PDF');
    }
       // Assicuriamoci che le strutture dati esistano
       data.variables = data.variables || {};
       data.variableColors = data.variableColors || {};
       data.functions = data.functions || [];
       
       console.log('Export PDF - Dati validati:', {
         variablesCount: Object.keys(data.variables).length,
         colorsCount: Object.keys(data.variableColors).length,
         functionsCount: data.functions.length
       });
    if (!result.canceled) {
      return new Promise((resolve) => {
        const doc = new PDFDocument();
        // ✅ Usa il percorso assoluto al file .ttf
const fontPath = path.join(__dirname, 'fonts', 'dejavu-fonts-ttf-2.37', 'ttf', 'DejaVuSans.ttf');

// Verifica che il file esista
if (!fs.existsSync(fontPath)) {
  console.error('Font non trovato:', fontPath);
  return;
}

// ✅ Registra il font con nome e percorso
doc.registerFont('DejaVuSans', fontPath);




        const stream = fs.createWriteStream(result.filePath);
        doc.pipe(stream);
        
        // INTESTAZIONE
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2C3E50')
           .text('DOCUMENTO MATEMATICO', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#7F8C8D')
           .text(`Generato con Math Editor Pro - ${new Date().toLocaleDateString('it-IT')}`, { align: 'center' });
        
        doc.moveDown(1);
        
        // VARIABILI
        if (data.variables && Object.keys(data.variables).length > 0) {
          doc.fontSize(16)
             .font('DejaVuSans')
             .fillColor('#2C3E50')
             .text('VARIABILI DEFINITE:');
          
          doc.moveDown(0.5);
          doc.fontSize(12)
             .font('DejaVuSans');
          
          let yPosition = doc.y;
          const pageWidth = doc.page.width - 100;
          const maxWidth = pageWidth * 0.6;
          
          Object.entries(data.variables).forEach(([key, value], index) => {
            const color = data.variableColors[key] || '#3498DB';
            const rgb = hexToRgb(color);
            
            // Cerchio colorato
            doc.circle(50, yPosition + 5, 4)
               .fill(color);
            
            // Nome variabile colorato
            doc.fillColor(color)
               .font('DejaVuSans')
               .text(key, 60, yPosition);
            
            // Descrizione
            const descriptionWidth = doc.widthOfString(value);
            if (descriptionWidth > maxWidth) {
              // Testo troppo lungo, va a capo
              doc.fillColor('#2C3E50')
                 .font('Helvetica')
                 .text(`= ${value}`, 60, yPosition, {
                   width: maxWidth,
                   align: 'left'
                 });
              yPosition = doc.y + 8;
            } else {
              doc.fillColor('#2C3E50')
                 .font('Helvetica')
                 .text(`= ${value}`, 60 + doc.widthOfString(key) + 5, yPosition);
              yPosition += 20;
            }
            
            // Controlla se serve nuova pagina
            if (yPosition > doc.page.height - 100 && index < Object.entries(data.variables).length - 1) {
              doc.addPage();
              yPosition = 100;
            }
          });
          
          doc.moveDown(1);
        }
        
        // FUNZIONI MATEMATICHE
// FUNZIONI MATEMATICHE - VERSIONE CORRETTA
if (data.functions && data.functions.length > 0) {
  // Verifica se abbiamo abbastanza spazio nella pagina corrente
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
    doc.y = 100;
  } else {
    doc.moveDown(2);
  }
  
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#2C3E50')
     .text('FUNZIONI MATEMATICHE:');
  
  doc.moveDown(0.5);
  
  let functionY = doc.y + 10;
  
  data.functions.forEach((func, index) => {
    // Controlla se serve nuova pagina prima di iniziare una nuova equazione
    if (functionY > doc.page.height - 100) {
      doc.addPage();
      functionY = 100;
    }
    
    // Numero equazione
    doc.fontSize(10)
       .font('DejaVuSans')
       .fillColor('#7F8C8D')
       .text(`${index + 1}.`, 50, functionY);
    
    // DEBUG: Log dell'equazione
    console.log(`Processing function ${index + 1}:`, func);
    
    // Equazione con colori - con gestione errori migliorata
    try {
      const equation = colorizeEquationForPDF(doc, func, data.variableColors, 70, functionY);
      functionY = equation.newY + 20;
    } catch (error) {
      // Fallback: equazione semplice
      console.error('Errore colorizzazione equazione:', error);
      doc.fillColor('#2C3E50')
         .font('DejaVuSans')
         .text(func, 70, functionY, { width: pageWidth - 80 });
      functionY += 30;
    }
    
    // Linea separatrice (tranne per l'ultima equazione)
    if (index < data.functions.length - 1 && functionY < doc.page.height - 50) {
      doc.moveTo(50, functionY - 10)
         .lineTo(doc.page.width - 50, functionY - 10)
         .strokeColor('#ECF0F1')
         .lineWidth(1)
         .stroke();
      functionY += 15;
    }
  });
}
        // FOOTER
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          
          // Numero pagina
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#7F8C8D')
             .text(
               `Pagina ${i + 1} di ${pages.count}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }
        
        doc.end();
        
        stream.on('finish', () => {
          resolve({ success: true, path: result.filePath });
        });
        
        stream.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
      });
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper function per convertire hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Helper per colorare le equazioni nel PDF
function colorizeEquationForPDF(doc, equation, variableColors, x, y) {
  console.log('Processing equation for PDF:', equation);
  
  const colors = variableColors || {};
  let currentX = x;
  let currentY = y;
  const lineHeight = 15;
  const pageWidth = doc.page.width - 100;
  
  // Usa DejaVuSans che supporta Unicode
  doc.font('DejaVuSans')
     .fontSize(12);
  
  // Dividi preservando tutti i caratteri
  const words = equation.split(/(\s+)/);
  
  for (const word of words) {
      if (!word.trim()) {
          // Spazi
          currentX += doc.widthOfString(word);
          continue;
      }
      
      const wordWidth = doc.widthOfString(word);
      
      // Controlla se va a capo
      if (currentX + wordWidth > pageWidth) {
          currentX = x;
          currentY += lineHeight;
      }
      
      // Colora solo se è una variabile definita
      if (colors[word]) {
          doc.fillColor(colors[word]);
      } else {
          doc.fillColor('#2C3E50');
      }
      
      doc.text(word, currentX, currentY);
      currentX += wordWidth;
  }
  
  return { newX: currentX, newY: currentY + lineHeight };
}

ipcMain.handle('export-html', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'HTML', extensions: ['html'] }
      ],
      defaultPath: 'documento_matematico.html'
    });
    
    if (!result.canceled) {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Documento Matematico</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            background: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        h1 { 
            color: #2C3E50; 
            border-bottom: 3px solid #3498DB; 
            padding-bottom: 15px;
            text-align: center;
        }
        .section { 
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498DB;
        }
        .section h2 {
            color: #2C3E50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .variable-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            border-left: 3px solid #3498DB;
        }
        .variable-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .variable-name {
            font-weight: bold;
            margin-right: 8px;
            font-family: 'Consolas', monospace;
        }
        .math-equation { 
            background: white; 
            padding: 20px; 
            margin: 15px 0; 
            border-left: 4px solid #3498DB;
            border-radius: 8px;
            font-family: 'Cambria Math', serif;
            font-size: 1.2em;
        }
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #7F8C8D; 
            font-size: 0.9em;
            padding-top: 20px;
            border-top: 1px solid #ECF0F1;
        }
        .timestamp {
            font-style: italic;
            color: #95a5a6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧮 Documento Matematico</h1>
        
        <div class="section">
            <h2>📊 Variabili Definite</h2>
            ${data.variables ? Object.entries(data.variables).map(([key, value]) => {
              const color = data.variableColors[key] || '#3498DB';
              return `
                <div class="variable-item">
                    <div class="variable-color" style="background: ${color};"></div>
                    <span class="variable-name" style="color: ${color};">${key}</span>
                    <span>= ${value}</span>
                </div>
              `;
            }).join('') : '<p style="color: #7F8C8D; font-style: italic;">Nessuna variabile definita</p>'}
        </div>
        
        <div class="section">
            <h2>📝 Funzioni Matematiche</h2>
            ${data.functions ? data.functions.map(func => 
              `<div class="math-equation">\\[${func}\\]</div>`
            ).join('') : '<p style="color: #7F8C8D; font-style: italic;">Nessuna funzione definita</p>'}
        </div>
        
        <div class="footer">
            <div>Generato con <strong>Math Editor Pro</strong></div>
            <div class="timestamp">${new Date().toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</div>
        </div>
    </div>
    
    <script>
        MathJax.typesetPromise();
    </script>
</body>
</html>`;
      
      fs.writeFileSync(result.filePath, htmlContent, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});