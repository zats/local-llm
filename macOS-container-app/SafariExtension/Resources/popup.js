// Popup Script for NativeFoundationModels Extension
class PopupController {
    constructor() {
        this.lastChecked = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateLastUpdated();
        this.checkStatus();
    }

    setupEventListeners() {
        // Test buttons
        document.getElementById('test-availability')?.addEventListener('click', () => this.testAvailability());
        document.getElementById('test-completion')?.addEventListener('click', () => this.testCompletion());
        document.getElementById('test-streaming')?.addEventListener('click', () => this.testStreaming());
        
        // Utility buttons
        document.getElementById('request-permissions')?.addEventListener('click', () => this.requestPermissions());
        document.getElementById('refresh-status')?.addEventListener('click', () => this.checkStatus());
    }

    updateLastUpdated() {
        const now = new Date().toLocaleTimeString();
        const element = document.getElementById('last-updated');
        if (element) element.textContent = now;
    }

    async checkStatus() {
        this.updateLastUpdated();
        this.updateStatus('status-text', 'Checking status...', 'checking');
        
        try {
            // Check extension active
            this.updateStatus('extension-active', '✅ Active', 'success');
            
            // Check permissions
            await this.checkPermissions();
            
            // Check content script and API
            await this.checkContentScriptAndAPI();
            
            // Update overall status
            this.updateOverallStatus();
            
        } catch (error) {
            console.error("Critical error during status check:", error);
            this.updateStatus('status-text', 'Status check failed', 'error');
        }
    }

    async checkPermissions() {
        try {
            // Safari handles permissions differently - if extension is running, permissions are granted
            let hasPermissions = false;
            
            try {
                // Try to get current tab - if this works, we have permissions
                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                if (tabs && tabs[0]) {
                    hasPermissions = true;
                }
            } catch (e) {
                // Fallback: try the permissions API
                try {
                    hasPermissions = await browser.permissions.contains({
                        origins: ['<all_urls>']
                    });
                } catch (e2) {
                    try {
                        hasPermissions = await browser.permissions.contains({
                            origins: ['http://*/*', 'https://*/*']
                        });
                    } catch (e3) {
                        console.error("Critical error: All permission checks failed:", e3);
                        // If all fails, we can't determine permissions
                        hasPermissions = false;
                    }
                }
            }
            
            if (hasPermissions) {
                this.updateStatus('permissions-granted', '✅ Granted', 'success');
            } else {
                this.updateStatus('permissions-granted', '❌ Not Granted', 'error');
            }
        } catch (error) {
            this.updateStatus('permissions-granted', '⚠️ Unknown', 'warning');
        }
    }

    async checkContentScriptAndAPI() {
        try {
            // Get current active tab
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (!tabs[0]) {
                this.updateStatus('content-script-active', '❌ No active tab', 'error');
                this.updateStatus('api-available', '❌ No active tab', 'error');
                return;
            }

            // Try to execute a script to check if content script is working
            try {
                // Use Safari-compatible script execution
                const results = await browser.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        try {
                            // Check if our API exists
                            const hasAPI = typeof window.nativeFoundationModels !== 'undefined';
                            const hasTestFunction = typeof window.testNFMCheck !== 'undefined';
                            
                            return {
                                contentScriptActive: true,
                                apiAvailable: hasAPI,
                                testFunctionAvailable: hasTestFunction,
                                url: window.location.href
                            };
                        } catch (e) {
                            return { error: e.message };
                        }
                    }
                });

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    
                    if (data.error) {
                        this.updateStatus('content-script-active', '❌ Error', 'error');
                        this.updateStatus('api-available', '❌ Error', 'error');
                    } else {
                        // Content script status
                        if (data.contentScriptActive) {
                            this.updateStatus('content-script-active', '✅ Active', 'success');
                        } else {
                            this.updateStatus('content-script-active', '❌ Not Active', 'error');
                        }
                        
                        // API status
                        if (data.apiAvailable) {
                            this.updateStatus('api-available', '✅ Available', 'success');
                        } else {
                            this.updateStatus('api-available', '❌ Not Available', 'error');
                        }
                    }
                }
            } catch (executeError) {
                // Modern script execution failed, trying legacy method
                
                // Fallback to legacy method for older Safari versions
                try {
                    const result = await browser.tabs.executeScript(tabs[0].id, {
                        code: `
                            try {
                                // Check if our API exists
                                const hasAPI = typeof window.nativeFoundationModels !== 'undefined';
                                const hasTestFunction = typeof window.testNFMCheck !== 'undefined';
                                
                                ({
                                    contentScriptActive: true,
                                    apiAvailable: hasAPI,
                                    testFunctionAvailable: hasTestFunction,
                                    url: window.location.href
                                });
                            } catch (e) {
                                ({ error: e.message });
                            }
                        `
                    });

                    if (result && result[0]) {
                        const data = result[0];
                        
                        if (data.error) {
                            this.updateStatus('content-script-active', '❌ Error', 'error');
                            this.updateStatus('api-available', '❌ Error', 'error');
                        } else {
                            if (data.contentScriptActive) {
                                this.updateStatus('content-script-active', '✅ Active', 'success');
                            } else {
                                this.updateStatus('content-script-active', '❌ Not Active', 'error');
                            }
                            
                            if (data.apiAvailable) {
                                this.updateStatus('api-available', '✅ Available', 'success');
                            } else {
                                this.updateStatus('api-available', '❌ Not Available', 'error');
                            }
                        }
                    }
                } catch (legacyError) {
                    console.error("Critical error: Both modern and legacy script execution failed:", legacyError);
                    this.updateStatus('content-script-active', '❌ Cannot check', 'error');
                    this.updateStatus('api-available', '❌ Cannot check', 'error');
                }
            }

        } catch (error) {
            this.updateStatus('content-script-active', '⚠️ Check failed', 'warning');
            this.updateStatus('api-available', '⚠️ Check failed', 'warning');
        }
    }

    updateOverallStatus() {
        const extensionOk = document.getElementById('extension-active')?.textContent.includes('✅');
        const permissionsOk = document.getElementById('permissions-granted')?.textContent.includes('✅');
        const contentScriptOk = document.getElementById('content-script-active')?.textContent.includes('✅');
        const apiOk = document.getElementById('api-available')?.textContent.includes('✅');

        if (extensionOk && permissionsOk && contentScriptOk && apiOk) {
            this.updateStatus('status-text', 'All systems operational', 'success');
        } else if (!permissionsOk) {
            this.updateStatus('status-text', 'Permissions needed', 'error');
        } else if (!apiOk) {
            this.updateStatus('status-text', 'API not available', 'error');
        } else {
            this.updateStatus('status-text', 'Issues detected', 'warning');
        }
    }

    updateStatus(elementId, text, type = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = text;
        element.className = `value ${type}`;

        // Update status dot if this is the main status
        if (elementId === 'status-text') {
            const dot = document.querySelector('.status-dot');
            if (dot) {
                dot.className = `status-dot ${type}`;
            }
        }
    }

    async testAvailability() {
        this.addResult('Testing availability...', 'info');
        
        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (!tabs[0]) {
                this.addResult('No active tab found', 'error');
                return;
            }

            try {
                const results = await browser.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async () => {
                        try {
                            if (typeof window.testNFMCheck === 'function') {
                                const result = await window.testNFMCheck();
                                return { success: true, result };
                            } else if (typeof window.nativeFoundationModels !== 'undefined') {
                                const result = await window.nativeFoundationModels.checkAvailability();
                                return { success: true, result };
                            } else {
                                return { success: false, error: 'API not available' };
                            }
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    }
                });

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    if (data.success) {
                        this.addResult(`✅ Availability check successful: ${JSON.stringify(data.result, null, 2)}`, 'success');
                    } else {
                        this.addResult(`❌ Availability check failed: ${data.error}`, 'error');
                    }
                }
            } catch (modernError) {
                // Fallback to legacy method
                const result = await browser.tabs.executeScript(tabs[0].id, {
                    code: `
                        (async () => {
                            try {
                                if (typeof window.testNFMCheck === 'function') {
                                    const result = await window.testNFMCheck();
                                    return { success: true, result };
                                } else if (typeof window.nativeFoundationModels !== 'undefined') {
                                    const result = await window.nativeFoundationModels.checkAvailability();
                                    return { success: true, result };
                                } else {
                                    return { success: false, error: 'API not available' };
                                }
                            } catch (error) {
                                return { success: false, error: error.message };
                            }
                        })();
                    `
                });

                if (result && result[0]) {
                    const data = result[0];
                    if (data.success) {
                        this.addResult(`✅ Availability check successful: ${JSON.stringify(data.result, null, 2)}`, 'success');
                    } else {
                        this.addResult(`❌ Availability check failed: ${data.error}`, 'error');
                    }
                }
            }
        } catch (error) {
            this.addResult(`❌ Test failed: ${error.message}`, 'error');
        }
    }

    async testCompletion() {
        const prompt = document.getElementById('test-prompt')?.value || 'Hello, how are you?';
        this.addResult(`Testing completion with prompt: "${prompt}"`, 'info');
        
        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (!tabs[0]) {
                this.addResult('No active tab found', 'error');
                return;
            }

            try {
                const results = await browser.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async (testPrompt) => {
                        try {
                            if (typeof window.nativeFoundationModels !== 'undefined') {
                                const result = await window.nativeFoundationModels.getCompletion(testPrompt);
                                return { success: true, result };
                            } else {
                                return { success: false, error: 'API not available' };
                            }
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    },
                    args: [prompt]
                });

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    if (data.success) {
                        this.addResult(`✅ Completion successful: ${JSON.stringify(data.result, null, 2)}`, 'success');
                    } else {
                        this.addResult(`❌ Completion failed: ${data.error}`, 'error');
                    }
                }
            } catch (modernError) {
                // Fallback to legacy method
                const result = await browser.tabs.executeScript(tabs[0].id, {
                    code: `
                        (async () => {
                            try {
                                if (typeof window.nativeFoundationModels !== 'undefined') {
                                    const result = await window.nativeFoundationModels.getCompletion('${prompt.replace(/'/g, "\\'")}');
                                    return { success: true, result };
                                } else {
                                    return { success: false, error: 'API not available' };
                                }
                            } catch (error) {
                                return { success: false, error: error.message };
                            }
                        })();
                    `
                });

                if (result && result[0]) {
                    const data = result[0];
                    if (data.success) {
                        this.addResult(`✅ Completion successful: ${JSON.stringify(data.result, null, 2)}`, 'success');
                    } else {
                        this.addResult(`❌ Completion failed: ${data.error}`, 'error');
                    }
                }
            }
        } catch (error) {
            this.addResult(`❌ Test failed: ${error.message}`, 'error');
        }
    }

    async testStreaming() {
        const prompt = document.getElementById('test-prompt')?.value || 'Write a short story';
        this.addResult(`Testing streaming with prompt: "${prompt}"`, 'info');
        
        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (!tabs[0]) {
                this.addResult('No active tab found', 'error');
                return;
            }

            try {
                // Note: Streaming is complex to test in popup, so we'll just check if the method exists
                const results = await browser.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        try {
                            if (typeof window.nativeFoundationModels !== 'undefined' && 
                                typeof window.nativeFoundationModels.getCompletionStream === 'function') {
                                return { success: true, message: 'Streaming method available' };
                            } else {
                                return { success: false, error: 'Streaming API not available' };
                            }
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    }
                });

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    if (data.success) {
                        this.addResult(`✅ Streaming test: ${data.message}`, 'success');
                    } else {
                        this.addResult(`❌ Streaming test failed: ${data.error}`, 'error');
                    }
                }
            } catch (modernError) {
                // Fallback to legacy method
                const result = await browser.tabs.executeScript(tabs[0].id, {
                    code: `
                        (async () => {
                            try {
                                if (typeof window.nativeFoundationModels !== 'undefined' && 
                                    typeof window.nativeFoundationModels.getCompletionStream === 'function') {
                                    return { success: true, message: 'Streaming method available' };
                                } else {
                                    return { success: false, error: 'Streaming API not available' };
                                }
                            } catch (error) {
                                return { success: false, error: error.message };
                            }
                        })();
                    `
                });

                if (result && result[0]) {
                    const data = result[0];
                    if (data.success) {
                        this.addResult(`✅ Streaming test: ${data.message}`, 'success');
                    } else {
                        this.addResult(`❌ Streaming test failed: ${data.error}`, 'error');
                    }
                }
            }
        } catch (error) {
            this.addResult(`❌ Test failed: ${error.message}`, 'error');
        }
    }

    async requestPermissions() {
        this.addResult('Requesting permissions...', 'info');
        
        try {
            const granted = await browser.permissions.request({
                origins: ['<all_urls>']
            });
            
            if (granted) {
                this.addResult('✅ Permissions granted!', 'success');
                setTimeout(() => this.checkStatus(), 1000);
            } else {
                this.addResult('❌ Permissions denied by user', 'error');
            }
        } catch (error) {
            this.addResult(`❌ Permission request failed: ${error.message}`, 'error');
        }
    }

    addResult(text, type = 'info') {
        const resultsArea = document.getElementById('results');
        if (!resultsArea) return;

        // Remove placeholder if it exists
        const placeholder = resultsArea.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Create result item
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${type}`;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'result-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const content = document.createElement('div');
        content.textContent = text;
        
        resultItem.appendChild(timestamp);
        resultItem.appendChild(content);
        resultsArea.appendChild(resultItem);
        
        // Scroll to bottom
        resultsArea.scrollTop = resultsArea.scrollHeight;
        
        // Limit to 10 results
        const items = resultsArea.querySelectorAll('.result-item');
        if (items.length > 10) {
            items[0].remove();
        }
    }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PopupController());
} else {
    new PopupController();
}
