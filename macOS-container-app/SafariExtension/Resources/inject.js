// This is the actual script that will run in the page context
// It creates the window.nativeFoundationModels API

console.log("DEBUG: inject.js loaded and executing");

// Prevent duplicate loading
if (typeof window.nativeFoundationModels === 'undefined') {
    console.log("DEBUG: Creating NativeFoundationModels API");

// Create the NativeFoundationModels API class
class NativeFoundationModels {
    constructor() {
        this.requestId = 0;
        this.pendingRequests = new Map();
        
        // Listen for responses from content script
        window.addEventListener('message', (event) => {
            console.log("DEBUG: inject.js received message:", event.data);
            if (event.data && event.data.type === 'nativeResponse') {
                console.log("DEBUG: inject.js handling nativeResponse:", event.data.response);
                this._handleResponse(event.data.response);
            }
        });
        
        // NativeFoundationModels constructor completed
    }

    async checkAvailability() {
        console.log("DEBUG: checkAvailability called in inject.js");
        const result = await this._sendRequest('checkAvailability', {});
        console.log("DEBUG: checkAvailability result:", result);
        return result;
    }

    async getCompletion(prompt, options = {}) {
        return this._sendRequest('getCompletion', { prompt, options });
    }

    async* getCompletionStream(prompt, options = {}) {
        const requestId = this._generateRequestId();
        
        const chunks = [];
        let streamComplete = false;
        let streamError = null;
        let chunkWaiters = [];
        
        const messageHandler = (event) => {
            if (event.data && event.data.type === 'nativeResponse' && event.data.response.requestId === requestId) {
                const response = event.data.response;
                const { type, data, error } = response;
                
                if (error) {
                    streamError = new Error(error);
                    streamComplete = true;
                    chunkWaiters.forEach(resolve => resolve());
                    chunkWaiters = [];
                    return;
                }
                
                if (type === 'streamResponse') {
                    // Handle Safari extension streaming format (batch response)
                    if (data && data.chunks) {
                        // Add chunks with smaller delays to simulate streaming
                        for (let i = 0; i < data.chunks.length; i++) {
                            setTimeout(() => {
                                chunks.push(data.chunks[i]);
                                chunkWaiters.forEach(resolve => resolve());
                                chunkWaiters = [];
                                
                                // Mark complete when last chunk is added
                                if (i === data.chunks.length - 1) {
                                    streamComplete = true;
                                    chunkWaiters.forEach(resolve => resolve());
                                    chunkWaiters = [];
                                }
                            }, i * 30); // 30ms delay between chunks for better streaming effect
                        }
                    } else {
                        streamComplete = true;
                        chunkWaiters.forEach(resolve => resolve());
                        chunkWaiters = [];
                    }
                } else if (type === 'response') {
                    // Fallback for other response types
                    streamComplete = true;
                    chunkWaiters.forEach(resolve => resolve());
                    chunkWaiters = [];
                }
            }
        };
        
        window.addEventListener('message', messageHandler);
        
        try {
            // Start the streaming request
            this._sendRequestWithId('getCompletionStream', { 
                prompt, 
                options 
            }, requestId).catch(error => {
                streamError = error;
                streamComplete = true;
                chunkWaiters.forEach(resolve => resolve());
                chunkWaiters = [];
            });
            
            // Yield chunks as they arrive
            let chunkIndex = 0;
            while (true) {
                if (streamError) {
                    throw streamError;
                }
                
                // Yield any new chunks that have arrived
                while (chunkIndex < chunks.length) {
                    yield chunks[chunkIndex];
                    chunkIndex++;
                }
                
                // If we've yielded all chunks and stream is complete, we're done
                if (streamComplete && chunkIndex >= chunks.length) {
                    break;
                }
                
                // Wait for more chunks to arrive
                await new Promise(resolve => {
                    chunkWaiters.push(resolve);
                });
            }
            
        } finally {
            window.removeEventListener('message', messageHandler);
        }
    }

    async _sendRequest(action, data) {
        const requestId = this._generateRequestId();
        return this._sendRequestWithId(action, data, requestId);
    }
    
    async _sendRequestWithId(action, data, requestId) {
        console.log("DEBUG: _sendRequestWithId called with:", { action, data, requestId });
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            
            const message = {
                type: 'nativeRequest',
                request: {
                    action,
                    requestId,
                    data
                }
            };
            
            console.log("DEBUG: Sending postMessage from inject.js:", message);
            
            // Send message to content script via window.postMessage
            window.postMessage(message, '*');
            
            // Set timeout to avoid hanging requests
            setTimeout(() => {
                const pending = this.pendingRequests.get(requestId);
                if (pending) {
                    console.log("DEBUG: Request timeout for requestId:", requestId);
                    pending.reject(new Error('Request timeout'));
                    this.pendingRequests.delete(requestId);
                }
            }, 30000); // 30 second timeout
        });
    }

    _handleResponse(response) {
        const { requestId, type, data, error } = response;
        
        // Handle non-streaming responses
        if (type === 'response') {
            const pending = this.pendingRequests.get(requestId);
            if (pending) {
                if (error) {
                    pending.reject(new Error(error));
                } else {
                    pending.resolve(data);
                }
                this.pendingRequests.delete(requestId);
            }
        }
        // Note: streaming responses are handled directly in the async generator
    }

    _generateRequestId() {
        return `nfm-${Date.now()}-${++this.requestId}`;
    }
}

// Inject the API into the window object
window.nativeFoundationModels = new NativeFoundationModels();

console.log("DEBUG: window.nativeFoundationModels created:", window.nativeFoundationModels);

// API successfully injected into window object

} else {
    console.log("DEBUG: NativeFoundationModels already exists, skipping creation");
} // End duplicate loading check