/**
 * MathEditor - A professional mathematical expression editor with syntax highlighting
 * and multiple export capabilities. Supports both colored HTML preview and MathJax rendering.
 * 
 * Features:
 * - Real-time mathematical expression editing with syntax highlighting
 * - Variable management with customizable colors
 * - Multiple preview modes (colored HTML and MathJax)
 * - Export to PDF and HTML formats
 * - File operations (save, open, new)
 * - Interactive tooltips and hover effects
 * - Mathematical symbol palette
 */

class MathEditor {
    constructor() {
        this.currentFilePath = null;
        this.variables = {};
        this.variableColors = {};
        this.currentColorPickerVariable = null;
        this.selectedColor = '#3498DB';
        this.useMathJax = false; // Flag to toggle between HTML and MathJax rendering
        this.init();
    }

    /**
     * Initializes the MathEditor component
     * Sets up event listeners, menu handlers, color picker, and loads example content
     */
    init() {
        this.setupEventListeners();
        this.setupMenuHandlers();
        this.setupColorPicker();
        this.updateStatus('Editor ready! Use "🎨 Color" for colored preview', 'success');
        this.loadExample();
    }

    /**
     * Loads example mathematical expressions and variables for demonstration
     */
    loadExample() {
        const exampleVariables = `x = vehicle speed (m/s)
y = system throughput (ops/sec)
t = time (seconds)
a = constant acceleration (m/s²)
n = number of iterations
θ = tilt angle (radians)`;

        const exampleFunction = `f(x,y) = ∑(x_i * y_i) from i=1 to n

lim t→∞ (1 + 1/t)^t = e

∂y/∂t = a * t + x

∫ from 0 to t of v(t) dt = position`;

        document.getElementById('variablesEditor').value = exampleVariables;
        document.getElementById('functionEditor').value = exampleFunction;
        
        this.parseVariables();
        this.updateMathPreview();
    }

    /**
     * Sets up all event listeners for editor interactions
     */
    setupEventListeners() {
        const variablesEditor = document.getElementById('variablesEditor');
        const functionEditor = document.getElementById('functionEditor');

        // Real-time parsing and preview updates
        variablesEditor.addEventListener('input', () => {
            this.parseVariables();
            this.updateMathPreview();
            this.updateStatus('Variables updated', 'info');
        });

        functionEditor.addEventListener('input', () => {
            this.updateMathPreview();
            this.updateStatus('Function updated', 'info');
        });

        // Enhanced keyboard shortcuts
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

        // Tooltip management for math preview
        document.getElementById('mathPreview').addEventListener('mouseover', (e) => {
            this.handleMathPreviewHover(e);
        });

        document.getElementById('mathPreview').addEventListener('mouseout', () => {
            this.hideTooltip();
        });

        // Tooltip management for variables in editor
        functionEditor.addEventListener('mousemove', (e) => {
            this.handleVariableHover(e);
        });

        functionEditor.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    /**
     * Exports the current mathematical content to PDF format
     * Handles data preparation and error management
     */
    async exportPDF() {
        try {
            // Use new function to prepare data for PDF export
            const data = this.prepareDataForPDF();
            
            console.log('PDF export data:', {
                variables: Object.keys(data.variables),
                functions: data.functions
            });
            
            this.updateStatus('Generating PDF...', 'info');
            
            const result = await window.electronAPI.exportPDF(data);
            
            if (result.success) {
                this.updateStatus(`✅ PDF exported: ${result.path}`, 'success');
                
                setTimeout(() => {
                    if (confirm('PDF created successfully! Open containing folder?')) {
                        this.showInFolder(result.path);
                    }
                }, 500);
            } else {
                this.updateStatus(`❌ PDF Error: ${result.error}`, 'danger');
                console.error('PDF Error:', result.error);
            }
        } catch (error) {
            this.updateStatus(`❌ PDF export error: ${error.message}`, 'danger');
            console.error('exportPDF error:', error);
        }
    }
    

    /**
     * Opens the file location in system explorer (simulated)
     * @param {string} filePath - Path to the file
     */
    openFileLocation(filePath) {
        // In a real Electron app, you would use shell.showItemInFolder()
        console.log('File saved at:', filePath);
        // For now, show an alert
        alert(`File saved at:\n${filePath}`);
    }

    /**
     * Exports the current mathematical content to HTML format
     * Converts equations to MathJax format and handles export process
     */
    async exportHTML() {
        try {
            const variablesContent = document.getElementById('variablesEditor').value;
            const functionContent = document.getElementById('functionEditor').value;
            
            // Parse variables to ensure they are up to date
            this.parseVariables();
            
            const equations = this.splitIntoEquations(functionContent).map(eq => 
                this.convertToMathJax(eq.trim())
            );
            
            const data = {
                variables: this.variables,
                variableColors: this.variableColors,
                functions: equations
            };
            
            console.log('HTML export data:', data); // Debug
            
            this.updateStatus('Generating HTML...', 'info');
            
            const result = await window.electronAPI.exportHTML(data);
            
            if (result.success) {
                this.updateStatus(`✅ HTML exported: ${result.path}`, 'success');
                
                setTimeout(() => {
                    if (confirm('HTML created successfully! Open containing folder?')) {
                        this.showInFolder(result.path);
                    }
                }, 500);
            } else {
                this.updateStatus(`❌ HTML Error: ${result.error}`, 'danger');
                console.error('HTML Error:', result.error);
            }
        } catch (error) {
            this.updateStatus(`❌ HTML export error: ${error.message}`, 'danger');
            console.error('exportHTML error:', error);
        }
    }

    /**
     * Shows the file in system folder (simulated)
     * @param {string} filePath - Path to the file
     */
    showInFolder(filePath) {
        // In Electron you might use: require('electron').shell.showItemInFolder(filePath)
        console.log('File saved at:', filePath);
        alert(`File saved at:\n${filePath}`);
    }
    
    /**
     * Cleans mathematical equations for PDF export
     * Preserves Unicode mathematical symbols while removing HTML tags
     * @param {string} equation - The equation to clean
     * @returns {string} Cleaned equation ready for PDF export
     */
    cleanEquationForPDF(equation) {
        console.log('=== DEBUG CLEAN EQUATION ===');
        console.log('Original equation:', equation);
        console.log('Original char codes:', Array.from(equation).map(c => `${c}: ${c.charCodeAt(0)}`));
        
        // Map of mathematical symbols to preserve
        const mathSymbols = {
            '∑': '∑',
            '∫': '∫', 
            '∂': '∂',
            '∞': '∞',
            '→': '→',
            '∆': 'Δ',
            '∇': '∇',
            '√': '√',
            'π': 'π',
            'θ': 'θ',
            'α': 'α',
            'β': 'β',
            'γ': 'γ',
            'δ': 'δ',
            'ε': 'ε',
            'λ': 'λ',
            'μ': 'μ',
            'σ': 'σ',
            'φ': 'φ',
            'ω': 'ω'
        };
        
        // Remove ONLY HTML tags if present
        let cleaned = equation
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/\s+/g, ' ') // Normalize multiple spaces
            .trim();

        console.log('Final cleaned equation:', cleaned);

        return cleaned; // Return the original equation with symbols preserved
    }
    
 

    /**
     * Sets up the color picker functionality for variable coloring
     */
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

    /**
     * Parses variables from the variables editor and updates internal state
     */
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

    /**
     * Updates the variables list display in the UI
     */
    updateVariablesList() {
        const list = document.getElementById('variablesList');
        
        if (Object.keys(this.variables).length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span>📝</span>
                    <p>No variables defined</p>
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
                            title="Change color"></button>
                </div>
                <div class="variable-description">${description}</div>
            `;
            list.appendChild(div);
        }
    }

    /**
     * MAIN REVISED METHOD - SIMPLE AND FUNCTIONAL
     * Updates the mathematical preview based on current content and mode
     */
    updateMathPreview() {
        const content = document.getElementById('functionEditor').value;
        const preview = document.getElementById('mathPreview');
        
        if (!content.trim()) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <span class="placeholder-icon">🔍</span>
                    <p>Your function preview will appear here</p>
                    <small>Use "🎨 Color" for colored preview or "📐 Math" for mathematical rendering</small>
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

    /**
     * COLORED HTML PREVIEW - GUARANTEED TO WORK
     * Renders mathematical expressions with colored variable highlighting
     */
    updateColoredPreview() {
        const content = document.getElementById('functionEditor').value;
        const preview = document.getElementById('mathPreview');
        const equations = this.splitIntoEquations(content);
        
        let html = '';
        
        equations.forEach((equation, index) => {
            let coloredEquation = this.escapeHtml(equation);
            
            // Replace ALL variables with colored spans
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
            
            // Replace mathematical symbols with styled versions
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
        this.updateStatus('Colored preview active - Colors are visible!', 'success');
    }

    /**
     * MATHJAX PREVIEW (without colors)
     * Renders mathematical expressions using MathJax for professional typesetting
     */
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
            this.updateStatus('MathJax preview active - Mathematical rendering', 'info');
        });
    }

    /**
     * MATHEMATICAL SYMBOLS FORMATTING
     * Enhances mathematical symbols with special styling and tooltips
     * @param {string} text - Text containing mathematical symbols
     * @returns {string} Text with formatted mathematical symbols
     */
    formatMathematicalSymbols(text) {
        const symbolMap = {
            '∑': '<span class="math-symbol sum" title="Summation">∑</span>',
            '∫': '<span class="math-symbol integral" title="Integral">∫</span>',
            '∂': '<span class="math-symbol partial" title="Partial derivative">∂</span>',
            '∇': '<span class="math-symbol nabla" title="Nabla">∇</span>',
            '√': '<span class="math-symbol sqrt" title="Square root">√</span>',
            '∞': '<span class="math-symbol infinity" title="Infinity">∞</span>',
            'π': '<span class="math-symbol pi" title="Pi">π</span>',
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
            '→': '<span class="math-symbol arrow" title="Right arrow">→</span>',
            '←': '<span class="math-symbol arrow-left" title="Left arrow">←</span>',
            '↔': '<span class="math-symbol arrow-both" title="Bidirectional arrow">↔</span>',
            '±': '<span class="math-symbol plusminus" title="Plus/Minus">±</span>',
            '∓': '<span class="math-symbol minusplus" title="Minus/Plus">∓</span>',
            '≠': '<span class="math-symbol notequal" title="Not equal">≠</span>',
            '≡': '<span class="math-symbol equivalent" title="Equivalent">≡</span>',
            '≈': '<span class="math-symbol approx" title="Approximately equal">≈</span>',
            '≤': '<span class="math-symbol lessequal" title="Less than or equal">≤</span>',
            '≥': '<span class="math-symbol greaterequal" title="Greater than or equal">≥</span>',
            '≪': '<span class="math-symbol muchless" title="Much less than">≪</span>',
            '≫': '<span class="math-symbol muchgreater" title="Much greater than">≫</span>',
            '∈': '<span class="math-symbol in" title="Element of">∈</span>',
            '∉': '<span class="math-symbol notin" title="Not element of">∉</span>',
            '⊂': '<span class="math-symbol subset" title="Subset">⊂</span>',
            '⊆': '<span class="math-symbol subseteq" title="Subset or equal">⊆</span>',
            '∩': '<span class="math-symbol intersection" title="Intersection">∩</span>',
            '∪': '<span class="math-symbol union" title="Union">∪</span>',
            '∀': '<span class="math-symbol forall" title="For all">∀</span>',
            '∃': '<span class="math-symbol exists" title="Exists">∃</span>',
            '∄': '<span class="math-symbol notexists" title="Does not exist">∄</span>',
            '⇒': '<span class="math-symbol implies" title="Implies">⇒</span>',
            '⇔': '<span class="math-symbol iff" title="If and only if">⇔</span>',
            '×': '<span class="math-symbol times" title="Vector product">×</span>',
            '÷': '<span class="math-symbol divide" title="Division">÷</span>',
            '⋅': '<span class="math-symbol cdot" title="Scalar product">⋅</span>',
            '∘': '<span class="math-symbol circ" title="Composition">∘</span>'
        };
        
        Object.keys(symbolMap).forEach(symbol => {
            const regex = new RegExp(this.escapeRegex(symbol), 'g');
            text = text.replace(regex, symbolMap[symbol]);
        });
        
        return text;
    }

    // HELPER FUNCTIONS
    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escapes special regex characters
     * @param {string} string - String to escape
     * @returns {string} Regex-escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Splits content into separate equations based on empty lines
     * @param {string} content - Mathematical content
     * @returns {string[]} Array of individual equations
     */
    splitIntoEquations(content) {
        return content.split(/\n\s*\n/).filter(block => block.trim());
    }

    /**
     * Converts mathematical expressions to MathJax format
     * Handles Unicode symbols and special mathematical notation
     * @param {string} content - Mathematical content to convert
     * @returns {string} MathJax formatted content
     */
    convertToMathJax(content) {
        // Decode corrupted symbols first
        content = this.decodeBrokenMathSymbols(content);
    
        const symbolMap = {
            // Mathematical symbols
            8721: '\\sum',        // SUMMATION
            8734: '\\infty',      // INFINITY
            8706: '\\partial',    // PARTIAL DERIVATIVE
            8747: '\\int',        // INTEGRAL
            8730: '\\sqrt{}',     // SQUARE ROOT
            
            // Uppercase Greek letters
            913: 'A',             // Alpha
            914: 'B',             // Beta  
            915: '\\Gamma',       // Gamma
            916: '\\Delta',       // Delta
            917: 'E',             // Epsilon
            918: 'Z',             // Zeta
            919: 'H',             // Eta
            920: '\\Theta',       // Theta
            921: 'I',             // Iota
            922: 'K',             // Kappa
            923: '\\Lambda',      // Lambda
            924: 'M',             // Mu
            925: 'N',             // Nu
            926: '\\Xi',          // Xi
            927: 'O',             // Omicron
            928: '\\Pi',          // Pi
            929: 'P',             // Rho
            931: '\\Sigma',       // Sigma
            932: 'T',             // Tau
            933: '\\Upsilon',     // Upsilon
            934: '\\Phi',         // Phi
            935: 'X',             // Chi
            936: '\\Psi',         // Psi
            937: '\\Omega',       // Omega
            
            // Lowercase Greek letters
            945: '\\alpha',       // alpha
            946: '\\beta',        // beta
            947: '\\gamma',       // gamma
            948: '\\delta',       // delta
            949: '\\epsilon',     // epsilon
            950: '\\zeta',        // zeta
            951: '\\eta',         // eta
            952: '\\theta',       // theta
            953: '\\iota',        // iota
            954: '\\kappa',       // kappa
            955: '\\lambda',      // lambda
            956: '\\mu',          // mu
            957: '\\nu',          // nu
            958: '\\xi',          // xi
            959: 'o',             // omicron
            960: '\\pi',          // pi
            961: '\\rho',         // rho
            962: '\\varsigma',    // final sigma
            963: '\\sigma',       // sigma
            964: '\\tau',         // tau
            965: '\\upsilon',     // upsilon
            966: '\\phi',         // phi
            967: '\\chi',         // chi
            968: '\\psi',         // psi
            969: '\\omega',       // omega
            
            // Other mathematical symbols
            8594: '\\rightarrow', // right arrow
            177: '\\pm',          // plus/minus
            8800: '\\neq',        // not equal
            8804: '\\leq',        // less than or equal
            8805: '\\geq',        // greater than or equal
            8712: '\\in',         // element of
            8704: '\\forall',     // for all
            8707: '\\exists',     // exists
            215: '\\times',       // multiplication
            247: '\\div',         // division
            8729: '\\cdot',       // dot product
            8728: '\\circ',       // composition
            8745: '\\cap',        // intersection
            8746: '\\cup',        // union
            8834: '\\subset',     // subset
            8838: '\\subseteq',   // subset or equal
            8658: '\\Rightarrow', // implies
            8660: '\\Leftrightarrow' // if and only if
        };
    
        let result = content;
        
        // Replace all symbols
        Object.keys(symbolMap).forEach(symbol => {
            const regex = new RegExp(this.escapeRegex(symbol), 'g');
            result = result.replace(regex, symbolMap[symbol]);
        });
    
        // Special handling for roots
        result = result.replace(/√(.+?)(?=[\s\)\]\}])/g, '\\sqrt{$1}');
        
        // Special handling for limits
        result = result.replace(/lim\s+(\w+)→(\w+)\s+(.+)/g, '\\lim_{$1 \\to $2} $3');
        
        // Special handling for derivatives
        result = result.replace(/(\w+)'(\w*)/g, '\\frac{d$1}{d$2}');
    
        return result;
    }
    
    /**
     * Decodes corrupted mathematical symbols that may occur during text processing
     * @param {string} content - Content with potentially corrupted symbols
     * @returns {string} Content with corrected symbols
     */
    decodeBrokenMathSymbols(content) {
        const replacements = {
            '': '∑',  // Summation
            '': '→',  // Arrow
            '!': '∞',  // Infinity (some editors corrupt it this way)
            '"': '∫',  // Integral or control character
            '+from': '∫ from', // Fix for poorly written integrals
            '/"': '∂', // Partial derivative
            '"y': '∂y', // Partial y
            '"t': '∂t'  // Partial t
        };
    
        for (const [bad, good] of Object.entries(replacements)) {
            const regex = new RegExp(this.escapeRegex(bad), 'g');
            content = content.replace(regex, good);
        }
        return content;
    }
    

    // TOOLTIP AND INTERACTIONS
    /**
     * Adds tooltip event listeners to preview elements
     */
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

    /**
     * Handles hover events on math preview elements
     * @param {Event} e - Mouse event
     */
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

    /**
     * Shows tooltip for mathematical elements with variable information
     * @param {Event} e - Mouse event
     * @param {string} variable - Variable name
     * @param {string} description - Variable description
     */
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

    /**
     * Shows general preview tooltip with mode information
     * @param {Event} e - Mouse event
     */
    showPreviewTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        const mode = this.useMathJax ? 'MathJax' : 'Colored';
        tooltip.innerHTML = `
            <strong>🔍 ${mode} Preview</strong><br>
            <small>${this.useMathJax ? 'Advanced mathematical rendering' : 'Colored variables - Hover for details'}</small>
        `;
        this.moveTooltip(e);
        tooltip.classList.add('show');
    }

    /**
     * Handles variable hover events in the function editor
     * @param {Event} e - Mouse event
     */
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

    /**
     * Gets cursor position in the editor relative to text content
     * @param {HTMLElement} editor - Editor element
     * @param {Event} e - Mouse event
     * @returns {Object} Cursor position with line and column
     */
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

    /**
     * Gets the word at a specific position in the text
     * @param {string} text - Text content
     * @param {Object} position - Position object with line and column
     * @returns {string|null} The word at position or null
     */
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

    /**
     * Shows tooltip for variables in the editor
     * @param {Event} e - Mouse event
     * @param {string} variable - Variable name
     * @param {string} description - Variable description
     */
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

    /**
     * Moves tooltip to follow mouse position
     * @param {Event} e - Mouse event
     */
    moveTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
    }

    /**
     * Hides the currently displayed tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show');
    }

    // PREVIEW CONTROLS
    /**
     * Enables colored HTML preview mode
     */
    enableColoredPreview() {
        this.useMathJax = false;
        this.updateMathPreview();
        this.updateStatus('🎨 COLORED Preview active - Colors are visible!', 'success');
    }

    /**
     * Enables MathJax mathematical rendering mode
     */
    enableMathJaxPreview() {
        this.useMathJax = true;
        this.updateMathPreview();
        this.updateStatus('📐 MATHJAX Preview active - Mathematical rendering', 'info');
    }

    // COLOR PICKER
    /**
     * Opens color picker modal for a specific variable
     * @param {string} variableName - Name of variable to color
     */
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

    /**
     * Closes the color picker modal
     */
    closeColorPicker() {
        document.getElementById('colorPickerModal').style.display = 'none';
        this.currentColorPickerVariable = null;
    }

    /**
     * Confirms color selection and applies it to the variable
     */
    confirmColor() {
        if (this.currentColorPickerVariable && this.selectedColor) {
            this.variableColors[this.currentColorPickerVariable] = this.selectedColor;
            this.updateVariablesList();
            this.updateMathPreview();
            this.closeColorPicker();
            this.updateStatus(`Color updated for ${this.currentColorPickerVariable}`, 'success');
        }
    }

    // EDITOR FUNCTIONS
    /**
     * Inserts a mathematical symbol at cursor position
     * @param {string} symbol - Symbol to insert
     */
    insertSymbol(symbol) {
        const editor = document.getElementById('functionEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        
        editor.value = text.substring(0, start) + symbol + text.substring(end);
        editor.selectionStart = editor.selectionEnd = start + symbol.length;
        editor.focus();
        
        this.updateMathPreview();
        this.updateStatus(`Symbol ${symbol} inserted`, 'info');
    }

    /**
     * Inserts a new line for creating separate equations
     */
    insertNewLine() {
        this.insertTextAtCursor('\n\n');
        this.updateStatus('New equation added', 'info');
    }

    /**
     * Inserts text at current cursor position
     * @param {string} text - Text to insert
     */
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
    /**
     * Saves the current file
     * @param {boolean} saveAs - Whether to force "Save As" dialog
     */
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
            this.updateStatus(`File saved: ${result.path}`, 'success');
        } else if (result.error) {
            this.updateStatus(`Save error: ${result.error}`, 'danger');
        }
    }

    /**
     * Prepares data for PDF export by cleaning equations and organizing content
     * @returns {Object} Structured data for PDF generation
     */
    prepareDataForPDF() {
        const variablesContent = document.getElementById('variablesEditor').value;
        const functionContent = document.getElementById('functionEditor').value;
        
        this.parseVariables();
        
        const equations = this.splitIntoEquations(functionContent)
            .map(eq => this.cleanEquationForPDF(eq))
            .filter(eq => eq.trim().length > 0);
        
        // DEBUG: verify Unicode characters
        equations.forEach((eq, index) => {
            console.log(`Equation ${index + 1} for PDF:`, eq);
            console.log(`Unicode characters:`, Array.from(eq).map(c => 
                `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase()})`
            ));
        });
        
        return {
            variables: this.variables || {},
            variableColors: this.variableColors || {},
            functions: equations
        };
    }

    /**
     * Exports content to HTML format (alternative implementation)
     */
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
            this.updateStatus(`HTML exported: ${result.path}`, 'success');
        } else if (result.error) {
            this.updateStatus(`HTML Error: ${result.error}`, 'danger');
        }
    }

    /**
     * Clears the function editor content
     */
    clearEditor() {
        document.getElementById('functionEditor').value = '';
        this.updateMathPreview();
        this.updateStatus('Editor cleared', 'warning');
    }
    
    /**
     * Formats the mathematical code for better readability
     */
    formatCode() {
        const editor = document.getElementById('functionEditor');
        let content = editor.value;
        
        content = content
            .replace(/([=+\-*/])(?=\w)/g, '$1 ')
            .replace(/(\w)(?=[=+\-*/])/g, '$1 ');
        
        editor.value = content;
        this.updateMathPreview();
        this.updateStatus('Code formatted', 'success');
    }

    /**
     * Displays help information for using the MathEditor
     */
    showHelp() {
        alert(`🎯 HOW TO USE MATH EDITOR:

• VARIABLES: "x = speed" in left section
• FUNCTIONS: Write in right section  
• NEW LINES: Empty lines separate different equations
• CTRL+ENTER: Quickly inserts empty line
• COLORS: Click circles to change color
• 🎨 COLOR: Preview with COLORED variables
• 📐 MATH: Preview with mathematical rendering
• TOOLTIP: Hover over variables for details
• EXPORT: Use File menu for PDF/HTML
• SAVE: Ctrl+S to save project

✅ COLORS IN PREVIEW NOW WORK!`);
    }

    /**
     * Updates the status indicator with message and type
     * @param {string} message - Status message
     * @param {string} type - Message type (success, warning, danger, info)
     */
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

    /**
     * Sets up menu event handlers for Electron integration
     */
    setupMenuHandlers() {
        window.electronAPI.onMenuNewFile(() => this.newFile());
        window.electronAPI.onMenuOpenFile((event, content, filePath) => this.openFile(content, filePath));
        window.electronAPI.onMenuSaveFile(() => this.saveFile());
        window.electronAPI.onMenuSaveAsFile(() => this.saveFile(true));
        window.electronAPI.onMenuExportPDF(() => {
            console.log('Menu Export PDF called');
            this.exportPDF();
        });
        window.electronAPI.onMenuExportHTML(() => {
            console.log('Menu Export HTML called');
            this.exportHTML();
        });
    }

    /**
     * Creates a new file, clearing current content after confirmation
     */
    async newFile() {
        if (confirm('Create new file? Unsaved changes will be lost.')) {
            document.getElementById('variablesEditor').value = '';
            document.getElementById('functionEditor').value = '';
            this.currentFilePath = null;
            this.variables = {};
            this.variableColors = {};
            this.updateVariablesList();
            this.updateMathPreview();
            this.updateStatus('New file created', 'success');
        }
    }

    /**
     * Opens a file with provided content and path
     * @param {string} content - File content
     * @param {string} filePath - Path to the file
     */
    openFile(content, filePath) {
        try {
            console.log('Attempting to open file:', filePath);
            const data = JSON.parse(content);
            
            document.getElementById('variablesEditor').value = data.variables || '';
            document.getElementById('functionEditor').value = data.function || data.functions || '';
            this.variableColors = data.colors || {};
            this.currentFilePath = filePath;
            
            this.parseVariables();
            this.updateMathPreview();
            this.updateStatus(`File opened: ${filePath}`, 'success');
            
            console.log('File loaded successfully');
        } catch (error) {
            console.error('JSON parsing error, opening as plain text:', error);
            // Fallback: open as plain text
            document.getElementById('functionEditor').value = content;
            document.getElementById('variablesEditor').value = '';
            this.currentFilePath = filePath;
            this.parseVariables();
            this.updateMathPreview();
            this.updateStatus(`File opened (text): ${filePath}`, 'success');
        }
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    window.mathEditor = new MathEditor();
});

// GLOBAL FUNCTIONS
/**
 * Global function to insert mathematical symbols
 * @param {string} symbol - Symbol to insert
 */
function insertSymbol(symbol) {
    window.mathEditor.insertSymbol(symbol);
}

/**
 * Global function to enable colored preview mode
 */
function enableColoredPreview() {
    window.mathEditor.enableColoredPreview();
}

/**
 * Global function to enable MathJax preview mode
 */
function enableMathJaxPreview() {
    window.mathEditor.enableMathJaxPreview();
}