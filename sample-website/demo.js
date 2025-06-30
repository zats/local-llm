// ChromeLLM API Demo JavaScript

class ChromeLLMDemo {
    constructor() {
        this.isGenerating = false;
        this.init();
    }

    async init() {
        await this.checkAvailability();
        this.checkDetection();
    }

    async checkAvailability() {
        const statusEl = document.getElementById('status');
        
        try {
            if (!window.chromeNativeLLM) {
                statusEl.textContent = 'ChromeLLM extension not detected. Please install and enable the extension.';
                statusEl.className = 'status unavailable';
                return;
            }

            const status = await window.chromeNativeLLM.checkAvailability();
            
            if (status.available) {
                statusEl.textContent = 'ChromeLLM is available and ready to use!';
                statusEl.className = 'status available';
            } else {
                statusEl.textContent = `ChromeLLM unavailable: ${status.reason || 'Unknown reason'}`;
                statusEl.className = 'status unavailable';
            }
        } catch (error) {
            statusEl.textContent = `Error checking availability: ${error.message}`;
            statusEl.className = 'status unavailable';
        }
    }

    checkDetection() {
        const detectionEl = document.getElementById('detectionResult');
        
        if (window.chromeNativeLLM) {
            detectionEl.textContent = '✅ Extension detected';
            detectionEl.style.color = '#28a745';
        } else {
            detectionEl.textContent = '❌ Extension not found';
            detectionEl.style.color = '#dc3545';
        }
    }

    async generateCompletion() {
        if (this.isGenerating) return;
        
        const prompt = document.getElementById('prompt1').value.trim();
        const responseEl = document.getElementById('response1');
        const generateBtn = document.getElementById('generateBtn');
        
        if (!prompt) {
            this.showError(responseEl, 'Please enter a prompt');
            return;
        }

        if (!window.chromeNativeLLM) {
            this.showError(responseEl, 'ChromeLLM extension not available');
            return;
        }

        this.isGenerating = true;
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        responseEl.textContent = 'Generating response...';
        responseEl.className = 'response';

        try {
            const options = {
                temperature: parseFloat(document.getElementById('temp1').value),
                maximumResponseTokens: parseInt(document.getElementById('maxTokens1').value),
                samplingMode: document.getElementById('mode1').value
            };

            const response = await window.chromeNativeLLM.getCompletion(prompt, options);
            responseEl.textContent = response;
            
        } catch (error) {
            this.showError(responseEl, `Error: ${error.message}`);
        } finally {
            this.isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Completion';
        }
    }

    async generateStream() {
        if (this.isGenerating) return;
        
        const prompt = document.getElementById('prompt2').value.trim();
        const responseEl = document.getElementById('response2');
        const streamBtn = document.getElementById('streamBtn');
        
        if (!prompt) {
            this.showError(responseEl, 'Please enter a prompt');
            return;
        }

        if (!window.chromeNativeLLM) {
            this.showError(responseEl, 'ChromeLLM extension not available');
            return;
        }

        this.isGenerating = true;
        streamBtn.disabled = true;
        streamBtn.textContent = 'Streaming...';
        responseEl.textContent = '';
        responseEl.className = 'response streaming-response';

        try {
            const options = {
                temperature: parseFloat(document.getElementById('temp2').value),
                maximumResponseTokens: parseInt(document.getElementById('maxTokens2').value),
                samplingMode: document.getElementById('mode2').value
            };

            const stream = window.chromeNativeLLM.getCompletionStream(prompt, options);
            
            for await (const token of stream) {
                responseEl.textContent += token;
                // Auto-scroll to bottom if needed
                responseEl.scrollTop = responseEl.scrollHeight;
            }
            
        } catch (error) {
            this.showError(responseEl, `Error: ${error.message}`);
        } finally {
            this.isGenerating = false;
            streamBtn.disabled = false;
            streamBtn.textContent = 'Generate Stream';
        }
    }

    showError(element, message) {
        element.textContent = message;
        element.className = 'response error';
    }
}

// Global functions for HTML onclick handlers
function checkDetection() {
    demo.checkDetection();
    demo.checkAvailability();
}

function generateCompletion() {
    demo.generateCompletion();
}

function generateStream() {
    demo.generateStream();
}

// Initialize demo when page loads
let demo;
document.addEventListener('DOMContentLoaded', () => {
    demo = new ChromeLLMDemo();
});