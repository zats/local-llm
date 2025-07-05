// Download dialog component for LocalLLM
(function() {
  'use strict';

  class DownloadDialog {
    constructor() {
      this.dialogId = 'nfm-download-dialog';
      this.backdropId = 'nfm-download-backdrop';
      this.isShowing = false;
      // Detect browser
      this.isChrome = typeof chrome !== 'undefined' && chrome.runtime;
      this.runtime = this.isChrome ? chrome.runtime : browser.runtime;
    }

    show() {
      if (this.isShowing) return;
      this.isShowing = true;

      // Create backdrop (matching settings-backdrop style)
      const backdrop = document.createElement('div');
      backdrop.id = this.backdropId;
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
      `;

      // Create dialog (matching settings-view style)
      const dialog = document.createElement('div');
      dialog.id = this.dialogId;
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        width: 90vw;
        max-width: 500px;
        max-height: 80vh;
        background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
        z-index: 2147483648;
        display: flex;
        flex-direction: column;
        border-radius: 20px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Get brain icon based on browser
      const brainIconElement = this.isChrome 
        ? `<img src="${this.runtime.getURL('brain.png')}" alt="Brain Icon" style="width: 240px; height: 240px;"/>`
        : `<div style="font-size: 200px;">🧠</div>`;

      dialog.innerHTML = `
        <!-- Header (matching settings-header) -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            margin: 0;
            color: #e2e8f0;
            font-size: 18px;
            font-weight: 600;
          ">
            LocalLLM
          </div>
          <button id="nfm-close-btn" style="
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='rgba(255,255,255,0.2)';"
          onmouseout="this.style.background='rgba(255,255,255,0.1)';">
            ✕
          </button>
        </div>

        <!-- Content (matching settings-content) -->
        <div style="
          padding: 24px;
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #e2e8f0;
          text-align: center;
        ">
          <!-- Brain icon with animation -->
          <div style="
            margin: 0 16px;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
            animation: nfm-heartbeat 2s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${brainIconElement}
          </div>

          <div style="
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #e2e8f0;
            text-align: center;
          ">
            Native App Required
          </div>

          <div style="
            font-size: 16px;
            color: #a0aec0;
            line-height: 1.5;
            text-align: center;
            margin-bottom: 24px;
          ">
            To use on-device AI, you need the LocalLLM app. Click below to download it.
          </div>

          <!-- Download button (matching docs style) -->
          <button id="nfm-download-btn" 
             style="
               display: inline-block;
               background: white;
               color: #000;
               padding: 18px 40px;
               border-radius: 50px;
               border: none;
               cursor: pointer;
               font-weight: 600;
               font-size: 16px;
               transition: all 0.3s ease;
               margin: 0 auto;
               box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
             "
             onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 20px rgba(255,255,255,0.3)';"
             onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 14px rgba(255,255,255,0.2)';">
            Download App
          </button>
        </div>

        <!-- Animation keyframes -->
        <style>
          @keyframes nfm-heartbeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        </style>
      `;

      // Add to page
      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      // Show with animation
      requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        backdrop.style.visibility = 'visible';
        dialog.style.opacity = '1';
        dialog.style.visibility = 'visible';
        dialog.style.transform = 'translate(-50%, -50%) scale(1)';
      });

      // Setup event handlers
      this.setupEventHandlers();
    }

    setupEventHandlers() {
      const closeBtn = document.getElementById('nfm-close-btn');
      const downloadBtn = document.getElementById('nfm-download-btn');
      const backdrop = document.getElementById(this.backdropId);

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide());
      }

      if (backdrop) {
        backdrop.addEventListener('click', () => this.hide());
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          window.open('https://github.com/zats/local-llm/releases/latest/download/NativeFoundationModels.app.zip', '_blank');
          this.hide();
        });
      }

      // Handle escape key
      this.escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.hide();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }

    hide() {
      if (!this.isShowing) return;
      
      const dialog = document.getElementById(this.dialogId);
      const backdrop = document.getElementById(this.backdropId);

      if (dialog && backdrop) {
        dialog.style.opacity = '0';
        dialog.style.visibility = 'hidden';
        dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
        backdrop.style.opacity = '0';
        backdrop.style.visibility = 'hidden';

        setTimeout(() => {
          dialog.remove();
          backdrop.remove();
        }, 300);
      }

      // Remove escape handler
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
      }

      this.isShowing = false;
    }
  }

  // Export for use
  window.NativeFoundationModelsDownloadDialog = DownloadDialog;
})();