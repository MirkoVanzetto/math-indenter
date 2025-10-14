const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
//const PDFDocument = require('pdfkit');

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
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
    
    if (!result.canceled) {
      return new Promise((resolve) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(result.filePath);
        doc.pipe(stream);
        
        // INTESTAZIONE
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2C3E50')
           .text('DOCUMENTO MATEMATICO', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#7F8C8D')
           .text(`Generato con Math Editor Pro - ${new Date().toLocaleDateString('it-IT')}`, { align: 'center' });
        
        doc.moveDown(1);
        
        // VARIABILI
        if (data.variables && Object.keys(data.variables).length > 0) {
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .fillColor('#2C3E50')
             .text('VARIABILI DEFINITE:');
          
          doc.moveDown(0.5);
          doc.fontSize(12)
             .font('Helvetica');
          
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
               .font('Helvetica-Bold')
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
        if (data.functions && data.functions.length > 0) {
          doc.addPage();
          
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .fillColor('#2C3E50')
             .text('FUNZIONI MATEMATICHE:', 50, 100);
          
          doc.moveDown(1);
          
          let functionY = doc.y;
          
          data.functions.forEach((func, index) => {
            // Numero equazione
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#7F8C8D')
               .text(`${index + 1}.`, 50, functionY);
            
            // Equazione con colori
            const equation = this.colorizeEquationForPDF(doc, func, data.variableColors, 70, functionY);
            functionY = equation.newY + 15;
            
            // Linea separatrice
            if (index < data.functions.length - 1) {
              doc.moveTo(50, functionY - 5)
                 .lineTo(doc.page.width - 50, functionY - 5)
                 .strokeColor('#ECF0F1')
                 .lineWidth(1)
                 .stroke();
              functionY += 10;
            }
            
            // Controlla se serve nuova pagina
            if (functionY > doc.page.height - 100 && index < data.functions.length - 1) {
              doc.addPage();
              functionY = 100;
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
  let currentX = x;
  let currentY = y;
  const words = equation.split(/(\s+)/);
  const lineHeight = 15;
  const pageWidth = doc.page.width - 100;
  
  words.forEach(word => {
    const trimmedWord = word.trim();
    
    if (!trimmedWord) {
      currentX += doc.widthOfString(word);
      return;
    }
    
    // Controlla se è una variabile colorata
    if (variableColors[trimmedWord]) {
      const color = variableColors[trimmedWord];
      const wordWidth = doc.widthOfString(trimmedWord);
      
      // Controlla se va a capo
      if (currentX + wordWidth > pageWidth) {
        currentX = x;
        currentY += lineHeight;
      }
      
      doc.fillColor(color)
         .font('Helvetica-Bold')
         .text(trimmedWord, currentX, currentY);
      
      currentX += wordWidth;
    } else {
      const wordWidth = doc.widthOfString(word);
      
      // Controlla se va a capo
      if (currentX + wordWidth > pageWidth) {
        currentX = x;
        currentY += lineHeight;
      }
      
      doc.fillColor('#2C3E50')
         .font('Helvetica')
         .text(word, currentX, currentY);
      
      currentX += wordWidth;
    }
  });
  
  return { newX: currentX, newY: currentY };
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