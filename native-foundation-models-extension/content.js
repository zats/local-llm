// Content script that injects the website API and handles communication
(function() {
  // Inject the API script into the page
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  
  // Handle messages from injected script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'nativefoundationmodels-request') {
      // Forward to background script
      chrome.runtime.sendMessage(event.data, (response) => {
        // Send response back to injected script
        window.postMessage({
          type: 'nativefoundationmodels-response',
          requestId: event.data.requestId,
          success: !response.error,
          data: response.error ? null : response,
          error: response.error
        }, '*');
      });
    }
  });
  
  // Listen for streaming messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward streaming messages to injected script
    window.postMessage({
      type: 'nativefoundationmodels-response',
      requestId: message.requestId,
      success: !message.error,
      data: message.error ? null : message,
      error: message.error
    }, '*');
  });
})();