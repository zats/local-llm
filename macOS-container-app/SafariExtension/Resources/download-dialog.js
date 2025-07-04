// Download dialog component for Native Foundation Models
(function() {
  'use strict';

  class DownloadDialog {
    constructor() {
      this.dialogId = 'nfm-download-dialog';
      this.backdropId = 'nfm-download-backdrop';
      this.isShowing = false;
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
            Native Foundation Models
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
            <div style="width: 240px; height: 240px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 120px;">🧠</div>
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
            To use on-device AI, you need the Native Foundation Models app. Click below to download it.
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
               box-shadow: 0 4px 20px rgba(0,0,0,0.2);
               margin: 0 auto 24px;
               width: fit-content;
             "
             onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)';">
             Download for macOS
          </button>

          <!-- Instructions -->
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <div style="
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #e2e8f0;
            ">
              Quick Setup:
            </div>
            <ol style="
              margin: 0;
              padding-left: 20px;
              font-size: 14px;
              line-height: 1.6;
              color: #a0aec0;
            ">
              <li>Download and unzip the app</li>
              <li>Run the app once to complete setup</li>
              <li>Reload the browser extension to start using on-device AI</li>
            </ol>
          </div>
        </div>
      `;

      // Add styles
      if (!document.getElementById('nfm-download-styles')) {
        const style = document.createElement('style');
        style.id = 'nfm-download-styles';
        style.textContent = `
          @keyframes nfm-heartbeat {
            0% { transform: scale(1); }
            14% { transform: scale(1.05); }
            28% { transform: scale(1); }
            42% { transform: scale(1.05); }
            70% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }

      // Add to page
      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      // Add close button event listener
      const closeBtn = document.getElementById('nfm-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide());
      }

      // Add download button event listener
      const downloadBtn = document.getElementById('nfm-download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => this.startDownload());
      }

      // Trigger animations
      requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        backdrop.style.visibility = 'visible';
        dialog.style.opacity = '1';
        dialog.style.visibility = 'visible';
        dialog.style.transform = 'translate(-50%, -50%) scale(1)';
      });

      // Close on backdrop click
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.hide();
        }
      });

      // Close on escape key
      this.escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.hide();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }

    startDownload() {
      // Create a temporary link to trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = 'https://github.com/zats/native-foundation-models/releases/latest/download/NativeFoundationModels.zip';
      downloadLink.download = 'NativeFoundationModels.app.zip';
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    hide() {
      if (!this.isShowing) return;
      this.isShowing = false;

      const backdrop = document.getElementById(this.backdropId);
      const dialog = document.getElementById(this.dialogId);
      
      if (backdrop && dialog) {
        backdrop.style.opacity = '0';
        backdrop.style.visibility = 'hidden';
        dialog.style.opacity = '0';
        dialog.style.visibility = 'hidden';
        dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        setTimeout(() => {
          backdrop.remove();
          dialog.remove();
        }, 300);
      }

      // Remove escape handler
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
      }
    }
  }

  // Expose dialog instance globally
  window.nfmDownloadDialog = new DownloadDialog();
})();