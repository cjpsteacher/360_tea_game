// ==========================================
// Google 試算表雲端教材與成績同步模組 (完整連動＋介面文字自動適配版)
// ==========================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyfm3WRGTbeNBfPg5nnMBWfPi19rDKjEj4CAOtg0LP1_U-GeSJl-l0LfklelviL5zUT/exec";

async function syncCloudCourseData() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  if (!courseId || !GAS_API_URL.startsWith("http")) {
    return;
  }

  try {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'cloud-loading-overlay';
    loadingDiv.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;font-size:1.25rem;';
    loadingDiv.innerHTML = '<div>🚀 正在從雲端題庫載入探險任務...</div>';
    document.body.appendChild(loadingDiv);

    const res = await fetch(`${GAS_API_URL}?id=${encodeURIComponent(courseId)}`);
    const result = await res.json();

    if (result.status === 'success' && result.currentCourse && result.currentCourse.data) {
      const cloudData = result.currentCourse.data;
      window.CURRENT_COURSE_ID = courseId;

      // 1. 切換不同課程時，自動清除舊課程的闖關進度避免關卡鎖死
      const lastCourseId = localStorage.getItem('active_cloud_course_id');
      if (lastCourseId !== courseId) {
        if (window.GameStorage && typeof window.GameStorage.resetAll === 'function') {
          window.GameStorage.resetAll();
        }
        localStorage.setItem('active_cloud_course_id', courseId);
      }

      // 2. 完整覆寫全域教材資料結構
      window.ERAS_DATA = Object.assign({}, window.ERAS_DATA || {}, cloudData);

      // 3. 同步更新證書設定
      if (typeof CERT_DATA !== 'undefined') {
        if (cloudData.issuer) CERT_DATA.issuer = cloudData.issuer;
        if (cloudData.certTitle) CERT_DATA.certTitle = cloudData.certTitle;
        if (cloudData.certSub) CERT_DATA.certSub = cloudData.certSub;
        if (cloudData.certTextLines) CERT_DATA.certTextLines = cloudData.certTextLines;
      }

      // 4. 通知 App 重新以雲端新資料初始化並渲染畫面
      if (window.App && typeof window.App.init === 'function') {
        await window.App.init();
      }
      if (window.App && typeof window.App.refreshTimeline === 'function') {
        window.App.refreshTimeline();
      }

      // 5. 自動適配介面上的「時代生活比較表」、「三個史前時代」、「現代」、「遺址」等字眼
      adaptGenericCourseLabels(cloudData);

      // 6. 掛載成績自動回傳
      hookCertificateScoreUpload();

      console.log(`✅ 雲端課程 [${courseId}] 載入與介面適配成功！`);
    } else {
      alert("⚠️ 找不到指定的雲端課程代碼：" + courseId);
    }

    loadingDiv.remove();
  } catch (err) {
    console.error("雲端課程載入失敗：", err);
    const overlay = document.getElementById('cloud-loading-overlay');
    if (overlay) overlay.remove();
  }
}

// 動態替換原本寫死在史前歷史模板的通用文字
function adaptGenericCourseLabels(cloudData) {
  const eraCount = (cloudData.eras && cloudData.eras.length) || 3;
  const tableBtnText = cloudData.comparisonBtnText || '📊 課程重點比較表';
  const timelineSubText = cloudData.timelineSubtitle || `請依序前往 ${eraCount} 個探險站點完成觀測與挑戰：`;
  const endNodeText = cloudData.timelineEndLabel || '終點達陣';
  const sitePrefixText = cloudData.sitePrefix || '📍 地點：';

  const applyLabels = () => {
    // (1) 右上角比較表按鈕文字
    document.querySelectorAll('.open-comparison-btn').forEach(btn => {
      btn.textContent = tableBtnText;
    });

    // (2) 儀表板副標題（「請依序前往三個史前時代探索：」）
    const headerP = document.querySelector('.timeline-header p');
    if (headerP && headerP.innerHTML.includes('史前時代')) {
      const nameSpan = document.getElementById('timeline-player-name');
      const playerName = nameSpan ? nameSpan.textContent : '探險家';
      headerP.innerHTML = `歡迎探險家 <span id="timeline-player-name">${playerName}</span>！${timelineSubText}`;
    }

    // (3) 時間軸最右側終點標籤（「現代」）
    document.querySelectorAll('.timeline-node .node-label').forEach(lbl => {
      if (lbl.textContent.trim() === '現代') {
        lbl.textContent = endNodeText;
      }
    });

    // (4) 卡片上的「📍 遺址：」前綴
    document.querySelectorAll('.era-site').forEach(el => {
      if (el.textContent.includes('遺址：')) {
        el.textContent = el.textContent.replace('📍 遺址：', sitePrefixText);
      }
    });
  };

  // 立即執行一次，並監聽後續卡片重繪時自動保持替換
  applyLabels();
  const cardsContainer = document.getElementById('era-cards-container');
  if (cardsContainer && !cardsContainer._labelObserver) {
    const observer = new MutationObserver(() => applyLabels());
    observer.observe(cardsContainer, { childList: true });
    cardsContainer._labelObserver = observer;
  }
}

// 攔截證書產生器，過關領證時自動回傳成績到 Google 試算表
function hookCertificateScoreUpload() {
  if (window.CertificateManager && typeof window.CertificateManager.render === 'function' && !window.CertificateManager._cloudHooked) {
    const origRender = window.CertificateManager.render.bind(window.CertificateManager);
    window.CertificateManager.render = function (...args) {
      const res = origRender(...args);
      const state = window.GameStorage ? window.GameStorage.get() : {};
      const studentName = state.playerName || '未填寫姓名';
      uploadStudentScoreToSheet(studentName, "全關卡探索與測驗通過");
      return res;
    };
    window.CertificateManager._cloudHooked = true;
  }
}

async function uploadStudentScoreToSheet(studentName, scoreInfo = "全關卡探索與測驗通過") {
  if (!GAS_API_URL || !GAS_API_URL.startsWith("http")) return;
  try {
    await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submitScore',
        course_id: window.CURRENT_COURSE_ID || 'default_prehistoric',
        class_name: '',
        seat_no: '',
        student_name: studentName,
        score_info: scoreInfo
      })
    });
    console.log(`📊 學生 [${studentName}] 成績已同步至 Google 試算表！`);
  } catch (e) {
    console.error("成績同步失敗：", e);
  }
}
// ==========================================
// 測驗題目與選項雙重隨機洗牌模組（防止學生背答案）
// ==========================================
function shuffleQuizData(courseObj) {
  if (!courseObj || typeof courseObj !== 'object') return;

  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // 洗牌單一題目的選項，並自動追蹤正確答案的新索引位置
  const shuffleSingleQuestion = (qItem) => {
    if (!qItem || !Array.isArray(qItem.options) || typeof qItem.answer !== 'number') return;
    const mapped = qItem.options.map((text, idx) => ({
      text,
      isCorrect: idx === qItem.answer
    }));
    shuffleArray(mapped);
    qItem.options = mapped.map(m => m.text);
    qItem.answer = mapped.findIndex(m => m.isCorrect);
  };

  // 1. 洗牌各關卡（eras）的題目順序與每題選項順序
  if (Array.isArray(courseObj.eras)) {
    courseObj.eras.forEach(era => {
      if (Array.isArray(era.quiz)) {
        shuffleArray(era.quiz);
        era.quiz.forEach(shuffleSingleQuestion);
      }
    });
  }

  // 2. 洗牌終極大魔王（finalBoss）的選項順序
  if (courseObj.finalBoss) {
    shuffleSingleQuestion(courseObj.finalBoss);
  }
}

// 攔截測驗啟動器（QuizManager），確保每次開啟測驗都會重新洗牌
(function hookRandomQuizShuffle() {
  const tryHook = () => {
    if (window.QuizManager && typeof window.QuizManager.open === 'function' && !window.QuizManager._shuffleHooked) {
      const origOpen = window.QuizManager.open.bind(window.QuizManager);
      window.QuizManager.open = function (...args) {
        if (window.ERAS_DATA) shuffleQuizData(window.ERAS_DATA);
        return origOpen(...args);
      };
      window.QuizManager._shuffleHooked = true;
    }
  };
  tryHook();
  window.addEventListener('DOMContentLoaded', tryHook);
  setTimeout(tryHook, 1500);
})();
