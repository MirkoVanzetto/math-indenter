class MathEditor {
    constructor() {
        this.currentFilePath = null;
        this.variables = {};
        this.variableColors = {};
        this.currentColorPickerVariable = null;
        this.selectedColor = '#3498DB';
        this.useMathJax = false; // Flag per toggle tra HTML e MathJax
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMenuHandlers();
        this.setupColorPicker();
        this.updateStatus('Editor pronto! Usa "🎨 Color" per anteprima colorata', 'success');
        this.loadExample();
    }

    loadExample() {
        const exampleVariables = `x = velocità del veicolo (m/s)
y = throughput del sistema (ops/sec)
t = tempo (secondi)
a = accelerazione costante (m/s²)
n = numero di iterazioni
θ = angolo di inclinazione (radianti)`;

        const exampleFunction = `f(x,y) = ∑(x_i * y_i) from i=1 to n

lim t→∞ (1 + 1/t)^t = e

∂y/∂t = a * t + x

∫ from 0 to t of v(t) dt = posizione`;

        document.getElementById('variablesEditor').value = exampleVariables;
        document.getElementById('functionEditor').value = exampleFunction;
        
        this.parseVariables();
        this.updateMathPreview();
    }

    setupEventListeners() {
        const variablesEditor = document.getElementById('variablesEditor');
        const functionEditor = document.getElementById('functionEditor');

        variablesEditor.addEventListener('input', () => {
            this.parseVariables();
            this.updateMathPreview();
            this.updateStatus('Variabili aggiornate', 'info');
        });

        functionEditor.addEventListener('input', () => {
            this.updateMathPreview();
            this.updateStatus('Funzione aggiornata', 'info');
        });

        functionEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTextAtCursor('    ');
            }
            
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.insertNewLine();
            }
        });

        // Tooltip per l'anteprima
        document.getElementById('mathPreview').addEventListener('mouseover', (e) => {
            this.handleMathPreviewHover(e);
        });

        document.getElementById('mathPreview').addEventListener('mouseout', () => {
            this.hideTooltip();
        });

        // Tooltip per variabili nell'editor
        functionEditor.addEventListener('mousemove', (e) => {
            this.handleVariableHover(e);
        });

        functionEditor.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

      async exportPDF() {
        try {
            const variablesContent = document.getElementById('variablesEditor').value;
            const functionContent = document.getElementById('functionEditor').value;
            const equations = this.splitIntoEquations(functionContent);
            
            // Prepara i dati per il PDF
            const data = {
                variables: this.variables,
                variableColors: this.variableColors,
                functions: equations.map(eq => this.cleanEquationForPDF(eq))
            };
            
            this.updateStatus('Generando PDF...', 'info');
            
            const result = await window.electronAPI.exportPDF(data);
            
            if (result.success) {
                this.updateStatus(`✅ PDF esportato: ${result.path}`, 'success');
                
                // Mostra conferma
                if (confirm('PDF creato con successo! Vuoi aprire la cartella contenente il file?')) {
                    this.openFileLocation(result.path);
                }
            } else {
                this.updateStatus(`❌ Errore PDF: ${result.error}`, 'danger');
            }
        } catch (error) {
            this.updateStatus(`❌ Errore durante l'esportazione: ${error.message}`, 'danger');
        }
    }

    // Pulisce l'equazione per il PDF
    cleanEquationForPDF(equation) {
        return equation
            .replace(/<[^>]*>/g, '') // Rimuove tag HTML
            .replace(/\s+/g, ' ')    // Normalizza spazi
            .trim();
    }

    // Apre la cartella del file (simulato)
    openFileLocation(filePath) {
        // In una vera app Electron, useresti shell.showItemInFolder()
        console.log('File salvato in:', filePath);
        // Per ora mostriamo un alert
        alert(`File salvato in:\n${filePath}`);
    }

    // ESPORTAZIONE HTML
    async exportHTML() {
        try {
            const functionContent = document.getElementById('functionEditor').value;
            const equations = this.splitIntoEquations(functionContent).map(eq => 
                this.convertToMathJax(eq.trim())
            );
            
            const data = {
                variables: this.variables,
                variableColors: this.variableColors,
                functions: equations
            };
            
            this.updateStatus('Generando HTML...', 'info');
            
            const result = await window.electronAPI.exportHTML(data);
            
            if (result.success) {
                this.updateStatus(`✅ HTML esportato: ${result.path}`, 'success');
                
                if (confirm('HTML creato con successo! Vuoi aprire la cartella contenente il file?')) {
                    this.openFileLocation(result.path);
                }
            } else {
                this.updateStatus(`❌ Errore HTML: ${result.error}`, 'danger');
            }
        } catch (error) {
            this.updateStatus(`❌ Errore durante l'esportazione: ${error.message}`, 'danger');
        }
    }

    setupColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedColor = option.getAttribute('data-color');
                document.getElementById('selectedColorPreview').style.background = this.selectedColor;
            });
        });

        if (colorOptions[0]) {
            colorOptions[0].click();
        }
    }

    parseVariables() {
        const content = document.getElementById('variablesEditor').value;
        this.variables = {};
        
        const lines = content.split('\n');
        lines.forEach(line => {
            const match = line.match(/^\s*([a-zA-Zα-ωΑ-Ω_][a-zA-Zα-ωΑ-Ω0-9_]*)\s*=\s*(.+?)\s*(?:#.*)?$/);
            if (match) {
                const varName = match[1];
                this.variables[varName] = match[2].trim();
                
                if (!this.variableColors[varName]) {
                    const defaultColors = [
                        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                        '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
                    ];
                    this.variableColors[varName] = defaultColors[Object.keys(this.variables).length % defaultColors.length];
                }
            }
        });

        this.updateVariablesList();
    }

    updateVariablesList() {
        const list = document.getElementById('variablesList');
        
        if (Object.keys(this.variables).length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span>📝</span>
                    <p>Nessuna variabile definita</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        for (const [name, description] of Object.entries(this.variables)) {
            const color = this.variableColors[name] || '#3498DB';
            
            const div = document.createElement('div');
            div.className = 'variable-item';
            div.style.borderLeftColor = color;
            div.innerHTML = `
                <div class="variable-header">
                    <span class="variable-name">${name}</span>
                    <button class="color-picker-btn" style="background: ${color};" 
                            onclick="mathEditor.openColorPicker('${name}')"
                            title="Cambia colore"></button>
                </div>
                <div class="variable-description">${description}</div>
            `;
            list.appendChild(div);
        }
    }

    // METODO PRINCIPALE RIVISTO - SEMPLICE E FUNZIONANTE
    updateMathPreview() {
        const content = document.getElementById('functionEditor').value;
        const preview = document.getElementById('mathPreview');
        
        if (!content.trim()) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <span class="placeholder-icon">🔍</span>
                    <p>L'anteprima delle tue funzioni apparirà qui</p>
                    <small>Usa "🎨 Color" per anteprima colorata o "📐 Math" per rendering matematico</small>
                </div>
            `;
            return;
        }

        if (this.useMathJax) {
            this.updateMathJaxPreview();
        } else {
            this.updateColoredPreview();
        }
    }

    // ANTEPRIMA COLORATA HTML - FUNZIONA SICURAMENTE
    updateColoredPreview() {
        const content = document.getElementById('functionEditor').value;
        const preview = document.getElementById('mathPreview');
        const equations = this.splitIntoEquations(content);
        
        let html = '';
        
        equations.forEach((equation, index) => {
            let coloredEquation = this.escapeHtml(equation);
            
            // Sostituisci TUTTE le variabili con span colorati
            Object.keys(this.variables).forEach(variable => {
                const color = this.variableColors[variable];
                const regex = new RegExp(`\\b${this.escapeRegex(variable)}\\b`, 'g');
                coloredEquation = coloredEquation.replace(
                    regex,
                    `<span class="variable-preview" 
                          style="color: ${color}; font-weight: bold; cursor: help;" 
                          data-variable="${variable}"
                          title="${variable}: ${this.variables[variable]}">${variable}</span>`
                );
            });
            
            // Sostituisci simboli matematici con versioni stilizzate
            coloredEquation = this.formatMathematicalSymbols(coloredEquation);
            
            html += `
                <div class="math-equation">
                    <div class="equation-content">${coloredEquation}</div>
                </div>
            `;
            
            if (index < equations.length - 1) {
                html += `<div class="equation-spacer"></div>`;
            }
        });
        
        preview.innerHTML = html;
        this.addPreviewTooltipListeners();
        this.updateStatus('Anteprima colorata attiva - I colori sono visibili!', 'success');
    }

    // ANTEPRIMA MATHJAX (senza colori)
    updateMathJaxPreview() {
        const content = document.getElementById('functionEditor').value;
        const preview = document.getElementById('mathPreview');
        const equations = this.splitIntoEquations(content);
        
        let mathContent = '';
        equations.forEach((equation, index) => {
            const converted = this.convertToMathJax(equation.trim());
            mathContent += `<div class="math-equation">\\[${converted}\\]</div>`;
            if (index < equations.length - 1) {
                mathContent += `<div class="equation-spacer"></div>`;
            }
        });
        
        preview.innerHTML = mathContent;
        
        MathJax.typesetPromise([preview]).then(() => {
            this.updateStatus('Anteprima MathJax attiva - Rendering matematico', 'info');
        });
    }

    // FORMATTAZIONE SIMBOLI MATEMATICI
    formatMathematicalSymbols(text) {
        const symbolMap = {
            '∑': '<span class="math-symbol sum" title="Sommatoria">∑</span>',
            '∫': '<span class="math-symbol integral" title="Integrale">∫</span>',
            '∂': '<span class="math-symbol partial" title="Derivata parziale">∂</span>',
            '∇': '<span class="math-symbol nabla" title="Nabla">∇</span>',
            '√': '<span class="math-symbol sqrt" title="Radice quadrata">√</span>',
            '∞': '<span class="math-symbol infinity" title="Infinito">∞</span>',
            'π': '<span class="math-symbol pi" title="Pi greco">π</span>',
            'θ': '<span class="math-symbol theta" title="Theta">θ</span>',
            'α': '<span class="math-symbol alpha" title="Alpha">α</span>',
            'β': '<span class="math-symbol beta" title="Beta">β</span>',
            'γ': '<span class="math-symbol gamma" title="Gamma">γ</span>',
            'δ': '<span class="math-symbol delta" title="Delta">δ</span>',
            'ε': '<span class="math-symbol epsilon" title="Epsilon">ε</span>',
            'λ': '<span class="math-symbol lambda" title="Lambda">λ</span>',
            'μ': '<span class="math-symbol mu" title="Mu">μ</span>',
            'σ': '<span class="math-symbol sigma" title="Sigma">σ</span>',
            'φ': '<span class="math-symbol phi" title="Phi">φ</span>',
            'ω': '<span class="math-symbol omega" title="Omega">ω</span>',
            '→': '<span class="math-symbol arrow" title="Freccia destra">→</span>',
            '←': '<span class="math-symbol arrow-left" title="Freccia sinistra">←</span>',
            '↔': '<span class="math-symbol arrow-both" title="Freccia bidirezionale">↔</span>',
            '±': '<span class="math-symbol plusminus" title="Più/Meno">±</span>',
            '∓': '<span class="math-symbol minusplus" title="Meno/Più">∓</span>',
            '≠': '<span class="math-symbol notequal" title="Diverso">≠</span>',
            '≡': '<span class="math-symbol equivalent" title="Equivalente">≡</span>',
            '≈': '<span class="math-symbol approx" title="Circa uguale">≈</span>',
            '≤': '<span class="math-symbol lessequal" title="Minore o uguale">≤</span>',
            '≥': '<span class="math-symbol greaterequal" title="Maggiore o uguale">≥</span>',
            '≪': '<span class="math-symbol muchless" title="Molto minore">≪</span>',
            '≫': '<span class="math-symbol muchgreater" title="Molto maggiore">≫</span>',
            '∈': '<span class="math-symbol in" title="Appartiene">∈</span>',
            '∉': '<span class="math-symbol notin" title="Non appartiene">∉</span>',
            '⊂': '<span class="math-symbol subset" title="Sottoinsieme">⊂</span>',
            '⊆': '<span class="math-symbol subseteq" title="Sottoinsieme o uguale">⊆</span>',
            '∩': '<span class="math-symbol intersection" title="Intersezione">∩</span>',
            '∪': '<span class="math-symbol union" title="Unione">∪</span>',
            '∀': '<span class="math-symbol forall" title="Per ogni">∀</span>',
            '∃': '<span class="math-symbol exists" title="Esiste">∃</span>',
            '∄': '<span class="math-symbol notexists" title="Non esiste">∄</span>',
            '⇒': '<span class="math-symbol implies" title="Implica">⇒</span>',
            '⇔': '<span class="math-symbol iff" title="Se e solo se">⇔</span>',
            '×': '<span class="math-symbol times" title="Prodotto vettoriale">×</span>',
            '÷': '<span class="math-symbol divide" title="Divisione">÷</span>',
            '⋅': '<span class="math-symbol cdot" title="Prodotto scalare">⋅</span>',
            '∘': '<span class="math-symbol circ" title="Composizione">∘</span>'
        };
        
        Object.keys(symbolMap).forEach(symbol => {
            const regex = new RegExp(this.escapeRegex(symbol), 'g');
            text = text.replace(regex, symbolMap[symbol]);
        });
        
        return text;
    }

    // FUNZIONI DI SUPPORTO
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    splitIntoEquations(content) {
        return content.split(/\n\s*\n/).filter(block => block.trim());
    }

    convertToMathJax(content) {
        return content
            .replace(/∑/g, '\\sum')
            .replace(/∫/g, '\\int')
            .replace(/∂/g, '\\partial')
            .replace(/∇/g, '\\nabla')
            .replace(/√(.+?)(?=[\s\)\]\}])/g, '\\sqrt{$1}')
            .replace(/π/g, '\\pi')
            .replace(/θ/g, '\\theta')
            .replace(/α/g, '\\alpha')
            .replace(/β/g, '\\beta')
            .replace(/γ/g, '\\gamma')
            .replace(/δ/g, '\\delta')
            .replace(/ε/g, '\\varepsilon')
            .replace(/λ/g, '\\lambda')
            .replace(/μ/g, '\\mu')
            .replace(/σ/g, '\\sigma')
            .replace(/φ/g, '\\phi')
            .replace(/ω/g, '\\omega')
            .replace(/→/g, '\\to')
            .replace(/±/g, '\\pm')
            .replace(/≠/g, '\\neq')
            .replace(/≤/g, '\\leq')
            .replace(/≥/g, '\\geq')
            .replace(/∈/g, '\\in')
            .replace(/∀/g, '\\forall')
            .replace(/∃/g, '\\exists')
            .replace(/⇒/g, '\\Rightarrow')
            .replace(/×/g, '\\times')
            .replace(/lim\s+(\w+)→(\w+)\s+(.+)/g, '\\lim_{$1 \\to $2} $3')
            .replace(/(\w+)'(\w*)/g, '\\frac{d$1}{d$2}');
    }

    // TOOLTIP E INTERAZIONI
    addPreviewTooltipListeners() {
        const variableElements = document.querySelectorAll('.variable-preview');
        
        variableElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const variable = e.target.getAttribute('data-variable');
                this.showMathElementTooltip(e, variable, this.variables[variable]);
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });

        const preview = document.getElementById('mathPreview');
        preview.addEventListener('mouseenter', (e) => {
            if (!e.target.classList.contains('variable-preview')) {
                this.showPreviewTooltip(e);
            }
        });
        
        preview.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    handleMathPreviewHover(e) {
        const target = e.target;
        
        if (target.classList.contains('variable-preview')) {
            const variable = target.getAttribute('data-variable');
            this.showMathElementTooltip(e, variable, this.variables[variable]);
            return;
        }
        
        if (target.closest('#mathPreview') && !this.useMathJax) {
            this.showPreviewTooltip(e);
        }
    }

    showMathElementTooltip(e, variable, description) {
        const tooltip = document.getElementById('tooltip');
        const color = this.variableColors[variable] || '#3498DB';
        
        tooltip.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                <strong style="color: ${color};">${variable}</strong>
            </div>
            <div>${description}</div>
        `;
        
        this.moveTooltip(e);
        tooltip.classList.add('show');
    }

    showPreviewTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        const mode = this.useMathJax ? 'MathJax' : 'Colorata';
        tooltip.innerHTML = `
            <strong>🔍 Anteprima ${mode}</strong><br>
            <small>${this.useMathJax ? 'Rendering matematico avanzato' : 'Variabili colorate - Passa il mouse per i dettagli'}</small>
        `;
        this.moveTooltip(e);
        tooltip.classList.add('show');
    }

    handleVariableHover(e) {
        const editor = document.getElementById('functionEditor');
        const text = editor.value;
        const cursorPosition = this.getCursorPosition(editor, e);
        const word = this.getWordAt(text, cursorPosition);
        
        if (word && this.variables[word]) {
            this.showVariableTooltip(e, word, this.variables[word]);
        } else {
            this.hideTooltip();
        }
    }

    getCursorPosition(editor, e) {
        const rect = editor.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const text = editor.value;
        const lines = text.substr(0, editor.selectionStart).split('\n');
        return { 
            line: lines.length - 1, 
            column: Math.floor(x / 8)
        };
    }

    getWordAt(text, position) {
        const lines = text.split('\n');
        if (position.line >= lines.length) return null;
        const line = lines[position.line];
        const words = line.match(/\b[a-zA-Zα-ωΑ-Ω_][a-zA-Zα-ωΑ-Ω0-9_]*\b/g);
        return words ? words.find(word => {
            const index = line.indexOf(word);
            return index <= position.column && index + word.length >= position.column;
        }) : null;
    }

    showVariableTooltip(e, variable, description) {
        const tooltip = document.getElementById('tooltip');
        const color = this.variableColors[variable] || '#3498DB';
        
        tooltip.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                <strong style="color: ${color};">${variable}</strong>
            </div>
            <div>${description}</div>
        `;
        
        this.moveTooltip(e);
        tooltip.classList.add('show');
    }

    moveTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show');
    }

    // CONTROLLI ANTEPRIMA
    enableColoredPreview() {
        this.useMathJax = false;
        this.updateMathPreview();
        this.updateStatus('🎨 Anteprima COLORATA attiva - I colori sono visibili!', 'success');
    }

    enableMathJaxPreview() {
        this.useMathJax = true;
        this.updateMathPreview();
        this.updateStatus('📐 Anteprima MATHJAX attiva - Rendering matematico', 'info');
    }

    // COLOR PICKER
    openColorPicker(variableName) {
        this.currentColorPickerVariable = variableName;
        const modal = document.getElementById('colorPickerModal');
        const currentColor = this.variableColors[variableName];
        
        if (currentColor) {
            const currentOption = document.querySelector(`.color-option[data-color="${currentColor}"]`);
            if (currentOption) {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                currentOption.classList.add('selected');
                this.selectedColor = currentColor;
                document.getElementById('selectedColorPreview').style.background = currentColor;
            }
        }
        
        modal.style.display = 'flex';
    }

    closeColorPicker() {
        document.getElementById('colorPickerModal').style.display = 'none';
        this.currentColorPickerVariable = null;
    }

    confirmColor() {
        if (this.currentColorPickerVariable && this.selectedColor) {
            this.variableColors[this.currentColorPickerVariable] = this.selectedColor;
            this.updateVariablesList();
            this.updateMathPreview();
            this.closeColorPicker();
            this.updateStatus(`Colore aggiornato per ${this.currentColorPickerVariable}`, 'success');
        }
    }

    // EDITOR FUNCTIONS
    insertSymbol(symbol) {
        const editor = document.getElementById('functionEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        
        editor.value = text.substring(0, start) + symbol + text.substring(end);
        editor.selectionStart = editor.selectionEnd = start + symbol.length;
        editor.focus();
        
        this.updateMathPreview();
        this.updateStatus(`Simbolo ${symbol} inserito`, 'info');
    }

    insertNewLine() {
        this.insertTextAtCursor('\n\n');
        this.updateStatus('Nuova equazione aggiunta', 'info');
    }

    insertTextAtCursor(text) {
        const editor = document.getElementById('functionEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const content = editor.value;
        
        editor.value = content.substring(0, start) + text + content.substring(end);
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
        
        this.updateMathPreview();
    }

    // FILE OPERATIONS
    async saveFile(saveAs = false) {
        const variablesContent = document.getElementById('variablesEditor').value;
        const functionContent = document.getElementById('functionEditor').value;
        
        const content = JSON.stringify({
            variables: variablesContent,
            function: functionContent,
            colors: this.variableColors,
            timestamp: new Date().toISOString()
        }, null, 2);
        
        const filePath = saveAs ? null : this.currentFilePath;
        const result = await window.electronAPI.saveFile(content, filePath);
        
        if (result.success) {
            this.currentFilePath = result.path;
            this.updateStatus(`File salvato: ${result.path}`, 'success');
        } else if (result.error) {
            this.updateStatus(`Errore salvataggio: ${result.error}`, 'danger');
        }
    }

    async exportPDF() {
        const functionContent = document.getElementById('functionEditor').value;
        const equations = this.splitIntoEquations(functionContent);
        
        const data = {
            variables: this.variables,
            functions: equations
        };
        
        const result = await window.electronAPI.exportPDF(data);
        
        if (result.success) {
            this.updateStatus(`PDF esportato: ${result.path}`, 'success');
        } else if (result.error) {
            this.updateStatus(`Errore PDF: ${result.error}`, 'danger');
        }
    }

    async exportHTML() {
        const functionContent = document.getElementById('functionEditor').value;
        const equations = this.splitIntoEquations(functionContent).map(eq => 
            this.convertToMathJax(eq.trim())
        );
        
        const data = {
            variables: this.variables,
            functions: equations
        };
        
        const result = await window.electronAPI.exportHTML(data);
        
        if (result.success) {
            this.updateStatus(`HTML esportato: ${result.path}`, 'success');
        } else if (result.error) {
            this.updateStatus(`Errore HTML: ${result.error}`, 'danger');
        }
    }

    clearEditor() {
        document.getElementById('functionEditor').value = '';
        this.updateMathPreview();
        this.updateStatus('Editor pulito', 'warning');
    }

    formatCode() {
        const editor = document.getElementById('functionEditor');
        let content = editor.value;
        
        content = content
            .replace(/([=+\-*/])(?=\w)/g, '$1 ')
            .replace(/(\w)(?=[=+\-*/])/g, '$1 ');
        
        editor.value = content;
        this.updateMathPreview();
        this.updateStatus('Codice formattato', 'success');
    }

    showHelp() {
        alert(`🎯 COME USARE MATH EDITOR:

• VARIABILI: "x = velocità" nella sezione sinistra
• FUNZIONI: Scrivi nella sezione destra  
• A CAPO: Righe vuote separano equazioni diverse
• CTRL+ENTER: Inserisce rapidamente riga vuota
• COLORI: Clicca sui cerchi per cambiare colore
• 🎨 COLOR: Anteprima con variabili COLORATE
• 📐 MATH: Anteprima con rendering matematico
• TOOLTIP: Mouse sulle variabili per dettagli
• ESPORTA: Usa il menu File per PDF/HTML
• SALVA: Ctrl+S per salvare il progetto

✅ I COLORI NELL'ANTEPRIMA ORA FUNZIONANO!`);
    }

    updateStatus(message, type = 'info') {
        const statusText = document.getElementById('statusText');
        const indicator = document.getElementById('statusIndicator');
        
        statusText.textContent = message;
        
        const colors = {
            success: '#27AE60',
            warning: '#F39C12',
            danger: '#E74C3C',
            info: '#3498DB'
        };
        
        indicator.style.background = colors[type] || colors.info;
    }

    setupMenuHandlers() {
        window.electronAPI.onMenuNewFile(() => this.newFile());
        window.electronAPI.onMenuOpenFile((event, content, filePath) => this.openFile(content, filePath));
        window.electronAPI.onMenuSaveFile(() => this.saveFile());
        window.electronAPI.onMenuSaveAsFile(() => this.saveFile(true));
        window.electronAPI.onMenuExportPDF(() => this.exportPDF());
        window.electronAPI.onMenuExportHTML(() => this.exportHTML());
    }

    async newFile() {
        if (confirm('Vuoi creare un nuovo file? Le modifiche non salvate andranno perse.')) {
            document.getElementById('variablesEditor').value = '';
            document.getElementById('functionEditor').value = '';
            this.currentFilePath = null;
            this.variables = {};
            this.variableColors = {};
            this.updateVariablesList();
            this.updateMathPreview();
            this.updateStatus('Nuovo file creato', 'success');
        }
    }

    openFile(content, filePath) {
        try {
            const data = JSON.parse(content);
            document.getElementById('variablesEditor').value = data.variables || '';
            document.getElementById('functionEditor').value = data.function || '';
            this.variableColors = data.colors || {};
            this.currentFilePath = filePath;
            this.parseVariables();
            this.updateMathPreview();
            this.updateStatus(`File aperto: ${filePath}`, 'success');
        } catch (error) {
            document.getElementById('functionEditor').value = content;
            this.currentFilePath = filePath;
            this.updateMathPreview();
            this.updateStatus(`File aperto: ${filePath}`, 'success');
        }
    }
}

// INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
    window.mathEditor = new MathEditor();
});

// FUNZIONI GLOBALI
function insertSymbol(symbol) {
    window.mathEditor.insertSymbol(symbol);
}

function enableColoredPreview() {
    window.mathEditor.enableColoredPreview();
}

function enableMathJaxPreview() {
    window.mathEditor.enableMathJaxPreview();
}


