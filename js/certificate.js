// js/certificate.js - 探險家闖關證書 Canvas 繪製與匯出
(function () {
  const CANVAS_WIDTH = 1754;
  const CANVAS_HEIGHT = 1240;

  window.CertificateManager = {
    canvas: null,
    ctx: null,

    init() {
      this.canvas = document.getElementById('certificate-canvas');
      if (this.canvas) {
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.ctx = this.canvas.getContext('2d');
      }
    },

    async render() {
      if (!this.canvas) this.init();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const state = window.GameStorage.get();
      const playerName = state.playerName || '小小探險家';
      const erasData = window.ERAS_DATA || {};
      const issuer = erasData.issuer || '新北市國小 五年級 社會學習領域教學團隊';

      // 取得日期
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const dateStr = `${year} 年 ${month} 月 ${day} 日`;

      // 1. 繪製背景底圖
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      try {
        let bgSrc = 'img/certificate-bg.png';
        if (window.CERT_ASSETS && window.CERT_ASSETS.bg) {
          bgSrc = window.CERT_ASSETS.bg;
        }
        const bgImg = await this.loadImage(bgSrc);
        ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } catch (e) {
        // Fallback 米色紙紋背景
        ctx.fillStyle = '#fcf8f0';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#b25d2e';
        ctx.strokeRect(30, 30, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 60);
      }

      // 繪製內層古典飾框
      ctx.strokeStyle = '#d79b5c';
      ctx.lineWidth = 4;
      ctx.strokeRect(70, 70, CANVAS_WIDTH - 140, CANVAS_HEIGHT - 140);

      // 2. 標題：闖關成功證書
      ctx.textAlign = 'center';
      ctx.fillStyle = '#bf360c';
      ctx.font = 'bold 56px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText(erasData.certSub || '🏆  闖  關  成  功  證  書  🏆', CANVAS_WIDTH / 2, 175);

      // 3. 稱號：臺灣史前時光探險家
      ctx.fillStyle = '#3e2723';
      ctx.font = 'bold 78px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.letterSpacing = '8px';
      ctx.fillText(erasData.certTitle || '臺灣史前時光探險家', CANVAS_WIDTH / 2, 275);

      // 4. 金色分割線
      const grad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 400, 0, CANVAS_WIDTH / 2 + 400, 0);
      grad.addColorStop(0, 'rgba(215, 155, 92, 0)');
      grad.addColorStop(0.5, 'rgba(191, 54, 12, 0.85)');
      grad.addColorStop(1, 'rgba(215, 155, 92, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2 - 450, 315);
      ctx.lineTo(CANVAS_WIDTH / 2 + 450, 315);
      ctx.stroke();

      // 5. 恭喜學生姓名
      ctx.fillStyle = '#271912';
      ctx.font = 'normal 46px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(`恭喜`, CANVAS_WIDTH / 2, 400);

      // 學生姓名底線與加重
      ctx.font = 'bold 56px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#b71c1c';
      ctx.fillText(`【  ${playerName}  】 同學`, CANVAS_WIDTH / 2, 475);

      // 6. 表揚內文 (四行詩意敘述)
      ctx.fillStyle = '#4e342e';
      ctx.font = '500 36px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.letterSpacing = '2px';
      const lineHeight = 55;
      const startY = 565;
      const textLines = erasData.certTextLines || [
        '勇敢搭乘時光機，深入探索史前時代，',
        '透過細膩觀察發現豐富生活線索，並全數克服生存大挑戰，',
        '深刻理解史前人類利用環境與開創文明的智慧與歷史延續性，',
        '表現卓絕優異，特頒發此證書，以資鼓勵！'
      ];
      textLines.forEach((line, idx) => {
        ctx.fillText(line, CANVAS_WIDTH / 2, startY + lineHeight * idx);
      });

      // 7. 動態繪製榮譽勳章 (依據場景數量平均分佈)
      const eras = erasData.eras || [];
      const badgeCount = eras.length;
      const badgeY = 870;
      const badgeSize = badgeCount > 3 ? 130 : 160;

      for (let i = 0; i < badgeCount; i++) {
        const era = eras[i];
        const badgeX = (CANVAS_WIDTH / (badgeCount + 1)) * (i + 1);

        try {
          let badgeSrc = era.badge || `img/badges/${era.id}.png`;
          if (window.CERT_ASSETS && window.CERT_ASSETS[era.id]) {
            badgeSrc = window.CERT_ASSETS[era.id];
          }
          const img = await this.loadImage(badgeSrc);
          ctx.drawImage(img, badgeX - badgeSize / 2, badgeY - badgeSize / 2, badgeSize, badgeSize);
        } catch (e) {
          // Fallback circle with emoji
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ff9800';
          ctx.fill();
          ctx.font = '54px sans-serif';
          ctx.fillText(era.badgeEmoji || '🏅', badgeX, badgeY + 18);
        }

        // 勳章下方字樣
        ctx.fillStyle = '#5d4037';
        ctx.font = `bold ${badgeCount > 3 ? 22 : 26}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
        ctx.fillText(era.name, badgeX, badgeY + badgeSize / 2 + 32);
        ctx.fillStyle = '#bf360c';
        ctx.font = `bold ${badgeCount > 3 ? 20 : 24}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
        ctx.fillText(era.badgeTitle || '探險小達人', badgeX, badgeY + badgeSize / 2 + (badgeCount > 3 ? 56 : 65));
      }

      // 8. 頒發單位與日期
      ctx.textAlign = 'right';
      ctx.fillStyle = '#4e342e';
      ctx.font = 'bold 28px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(`頒發單位：${issuer}`, CANVAS_WIDTH - 150, 1140);
      ctx.font = '26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(`認證日期：${dateStr}`, CANVAS_WIDTH - 150, 1180);

      // 左下角：時光機認證編號
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8d6e63';
      ctx.font = '22px monospace';
      ctx.fillText(`認證序號：TW-TIME-${now.getTime().toString(36).toUpperCase()}`, 150, 1160);
    },

    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed ' + src));
        img.src = src;
      });
    },

    download() {
      if (!this.canvas) this.init();
      if (!this.canvas) return;
      const state = window.GameStorage.get();
      const playerName = state.playerName || '臺灣史前時光探險家';
      const filename = `臺灣史前時光探險家證書_${playerName}.png`;

      const triggerDownload = (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) {
            document.body.removeChild(a);
          }
        }, 300);
      };

      try {
        if (this.canvas.toBlob) {
          this.canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              triggerDownload(url);
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            } else {
              try {
                const dataUrl = this.canvas.toDataURL('image/png');
                triggerDownload(dataUrl);
              } catch (e) {
                console.warn('toDataURL fallback failed:', e);
              }
            }
          }, 'image/png');
          return;
        }
      } catch (err) {
        console.warn('toBlob threw error, trying toDataURL...', err);
      }

      try {
        const dataUrl = this.canvas.toDataURL('image/png');
        triggerDownload(dataUrl);
      } catch (err2) {
        console.error('All download methods failed:', err2);
        alert('瀏覽器安全性限制下載圖片，請點擊「🖨️ 列印證書 (A4)」按鈕直接列印或另存為 PDF 喔！');
      }
    },

    print() {
      window.print();
    }
  };
})();
