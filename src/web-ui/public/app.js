class VideoAnalyzerApp {
    constructor() {
        this.ws = null;
        this.currentSession = null;
        this.settings = {};
        this.isConnected = false;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupWebSocket();
        await this.loadSettings();
        this.loadSessions();
        this.initializeIcons();
    }
    
    initializeIcons() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    setupEventListeners() {
        // Prompt form
        const promptInput = document.getElementById('promptInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        promptInput.addEventListener('input', () => {
            analyzeBtn.disabled = !promptInput.value.trim();
        });
        
        analyzeBtn.addEventListener('click', () => this.startAnalysis());
        stopBtn.addEventListener('click', () => this.stopAnalysis());
        
        // Settings
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        
        settingsBtn.addEventListener('click', () => this.showSettings());
        closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Settings inputs
        const screenshotQuality = document.getElementById('screenshotQuality');
        const qualityValue = document.getElementById('qualityValue');
        screenshotQuality.addEventListener('input', () => {
            qualityValue.textContent = screenshotQuality.value;
        });
        
        const temperature = document.getElementById('temperature');
        const temperatureValue = document.getElementById('temperatureValue');
        temperature.addEventListener('input', () => {
            temperatureValue.textContent = temperature.value;
        });
        
        // Sessions
        const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
        refreshSessionsBtn.addEventListener('click', () => this.loadSessions());
        
        // Results
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => this.exportResults());
        
        // Modal backdrop click
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.hideSettings();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSettings();
            }
        });
    }
    
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
            
            // Send ping to keep connection alive
            setInterval(() => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => this.setupWebSocket(), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('error', 'Connection Error');
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'pong':
                // Connection is alive
                break;
                
            case 'screenshot':
                this.updateScreenshot(data.screenshot, data.action);
                break;
                
            case 'progress':
                this.updateProgress(data.progress, data.message);
                break;
                
            case 'status':
                this.updateStatus(data.status, data.details);
                break;
                
            case 'session_update':
                this.handleSessionUpdate(data);
                break;
                
            case 'error':
                this.showError(data.error);
                break;
                
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }
    
    updateConnectionStatus(status, text) {
        const statusIndicator = document.getElementById('connectionStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = text;
    }
    
    async startAnalysis() {
        const prompt = document.getElementById('promptInput').value.trim();
        const url = document.getElementById('urlInput').value.trim() || null;
        
        if (!prompt) {
            this.showError('Please enter a prompt for analysis');
            return;
        }
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    url,
                    settings: this.settings
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to start analysis');
            }
            
            this.currentSession = result.sessionId;
            
            // Subscribe to session updates
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    sessionId: this.currentSession
                }));
            }
            
            // Update UI
            document.getElementById('analyzeBtn').style.display = 'none';
            document.getElementById('stopBtn').style.display = 'inline-flex';
            
            this.showSuccess('Analysis started successfully!');
            this.loadSessions();
            
        } catch (error) {
            console.error('Error starting analysis:', error);
            this.showError(error.message);
        }
    }
    
    async stopAnalysis() {
        if (!this.currentSession) return;
        
        try {
            await fetch(`/api/analyze/${this.currentSession}`, {
                method: 'DELETE'
            });
            
            this.resetAnalysisUI();
            this.showSuccess('Analysis stopped');
            
        } catch (error) {
            console.error('Error stopping analysis:', error);
            this.showError('Failed to stop analysis');
        }
    }
    
    resetAnalysisUI() {
        this.currentSession = null;
        
        document.getElementById('analyzeBtn').style.display = 'inline-flex';
        document.getElementById('stopBtn').style.display = 'none';
        
        document.getElementById('statusText').textContent = 'Ready';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('currentAction').textContent = 'Waiting for analysis to start...';
        
        // Hide current frame, show placeholder
        document.getElementById('currentFrame').style.display = 'none';
        document.getElementById('viewerPlaceholder').style.display = 'flex';
        
        // Hide results
        document.getElementById('resultsSection').style.display = 'none';
    }
    
    updateScreenshot(screenshot, action) {
        const currentFrame = document.getElementById('currentFrame');
        const placeholder = document.getElementById('viewerPlaceholder');
        
        if (screenshot) {
            currentFrame.src = `data:image/png;base64,${screenshot}`;
            currentFrame.style.display = 'block';
            placeholder.style.display = 'none';
        }
        
        if (action) {
            document.getElementById('currentAction').textContent = action;
        }
    }
    
    updateProgress(progress, message) {
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        if (message) {
            document.getElementById('currentAction').textContent = message;
        }
    }
    
    updateStatus(status, details) {
        document.getElementById('statusText').textContent = status;
        
        if (status === 'completed') {
            this.loadResults(this.currentSession);
            this.resetAnalysisUI();
        } else if (status === 'failed') {
            this.resetAnalysisUI();
            this.showError(details || 'Analysis failed');
        }
    }
    
    handleSessionUpdate(data) {
        // Refresh sessions list
        this.loadSessions();
    }
    
    async loadResults(sessionId) {
        try {
            const response = await fetch(`/api/analyze/results/${sessionId}`);
            const data = await response.json();
            
            if (response.ok && data.results) {
                this.displayResults(data.results, data.prompt);
            }
            
        } catch (error) {
            console.error('Error loading results:', error);
        }
    }
    
    displayResults(results, prompt) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsContent.innerHTML = `
            <div class="results-header">
                <h3>Analysis Results</h3>
                <p class="prompt-used"><strong>Prompt:</strong> ${prompt}</p>
            </div>
            <div class="results-body">
                ${this.formatResults(results)}
            </div>
        `;
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    formatResults(results) {
        if (typeof results === 'string') {
            return `<div class="result-text">${results.replace(/\n/g, '<br>')}</div>`;
        }
        
        if (typeof results === 'object') {
            return `<pre class="result-json">${JSON.stringify(results, null, 2)}</pre>`;
        }
        
        return `<div class="result-text">${results}</div>`;
    }
    
    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            
            if (response.ok) {
                this.settings = data.settings;
                this.populateSettingsForm();
                
                // Load options for dropdowns
                const optionsResponse = await fetch('/api/settings/options');
                const optionsData = await optionsResponse.json();
                if (optionsResponse.ok) {
                    this.populateOptions(optionsData);
                }
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    populateSettingsForm() {
        const settings = this.settings;
        
        // Browser settings
        document.getElementById('headlessMode').checked = settings.browser?.headless || false;
        document.getElementById('browserTimeout').value = settings.browser?.timeout || 30000;
        document.getElementById('screenshotQuality').value = settings.browser?.screenshotQuality || 80;
        document.getElementById('qualityValue').textContent = settings.browser?.screenshotQuality || 80;
        
        // Analysis settings
        document.getElementById('captureIntervals').value = settings.analysis?.captureIntervals || 5;
        document.getElementById('frameStrategy').value = settings.analysis?.frameStrategy || 'comprehensive';
        document.getElementById('analysisTimeout').value = settings.analysis?.analysisTimeout || 60000;
        
        // AI settings
        document.getElementById('temperature').value = settings.ai?.temperature || 0.1;
        document.getElementById('temperatureValue').textContent = settings.ai?.temperature || 0.1;
        document.getElementById('maxTokens').value = settings.ai?.maxTokens || 2000;
        
        // Capture settings
        document.getElementById('enableScreenshots').checked = settings.capture?.enableScreenshots !== false;
        document.getElementById('screenshotFormat').value = settings.capture?.screenshotFormat || 'png';
    }
    
    populateOptions(options) {
        // Frame strategies
        const frameStrategy = document.getElementById('frameStrategy');
        frameStrategy.innerHTML = options.frameStrategies.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('');
        
        // Screenshot formats
        const screenshotFormat = document.getElementById('screenshotFormat');
        screenshotFormat.innerHTML = options.screenshotFormats.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('');
    }
    
    async saveSettings() {
        const newSettings = {
            browser: {
                headless: document.getElementById('headlessMode').checked,
                timeout: parseInt(document.getElementById('browserTimeout').value),
                screenshotQuality: parseInt(document.getElementById('screenshotQuality').value)
            },
            analysis: {
                captureIntervals: parseInt(document.getElementById('captureIntervals').value),
                frameStrategy: document.getElementById('frameStrategy').value,
                analysisTimeout: parseInt(document.getElementById('analysisTimeout').value)
            },
            ai: {
                temperature: parseFloat(document.getElementById('temperature').value),
                maxTokens: parseInt(document.getElementById('maxTokens').value)
            },
            capture: {
                enableScreenshots: document.getElementById('enableScreenshots').checked,
                screenshotFormat: document.getElementById('screenshotFormat').value
            }
        };
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSettings)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.settings = result.settings;
                this.hideSettings();
                this.showSuccess('Settings saved successfully!');
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError(error.message);
        }
    }
    
    async resetSettings() {
        try {
            const response = await fetch('/api/settings/reset', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.settings = result.settings;
                this.populateSettingsForm();
                this.showSuccess('Settings reset to defaults');
            } else {
                throw new Error(result.error || 'Failed to reset settings');
            }
            
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showError(error.message);
        }
    }
    
    async loadSessions() {
        try {
            const response = await fetch('/api/analyze/sessions');
            const data = await response.json();
            
            if (response.ok) {
                this.displaySessions(data.sessions);
            }
            
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }
    
    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessionsList');
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = '<p class="no-sessions">No active sessions</p>';
            return;
        }
        
        sessionsList.innerHTML = sessions.map(session => `
            <div class="session-item">
                <div class="session-info">
                    <h4>${session.prompt}</h4>
                    <p>Created: ${new Date(session.createdAt).toLocaleString()}</p>
                </div>
                <div class="session-status ${session.status}">
                    ${session.status} ${session.progress ? `(${Math.round(session.progress)}%)` : ''}
                </div>
            </div>
        `).join('');
    }
    
    exportResults() {
        // TODO: Implement results export
        this.showSuccess('Export functionality coming soon!');
    }
    
    showSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }
    
    hideSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoAnalyzerApp();
});

// Add notification styles dynamically
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 400px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease;
}

.notification.error {
    background: #e53e3e;
}

.notification.success {
    background: #38a169;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);