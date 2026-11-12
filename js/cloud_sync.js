// ==========================================
// Google 試算表雲端教材與成績同步模組 (完整連動版)
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

      // 2. 完整覆寫全域教材資料結構 (包含 appTitle, eras, comparisonTable, finalBoss 等)
      window.ERAS_DATA = Object.assign({}, window.ERAS_DATA || {}, cloudData);

      // 3. 同步更新證書設定 (若存在 CERT_DATA)
      if (typeof CERT_DATA !== 'undefined') {
        if (cloudData.issuer) CERT_DATA.issuer = cloudData.issuer;
        if (cloudData.certTitle) CERT_DATA.certTitle = cloudData.certTitle;
        if (cloudData.certSub) CERT_DATA.certSub = cloudData.certSub;
        if (cloudData.certTextLines) CERT_DATA.certTextLines = cloudData.certTextLines;
      }

      // 4. 關鍵：通知 App 重新以雲端新資料初始化並渲染首頁、時間軸與關卡卡片！
      if (window.App && typeof window.App.init === 'function') {
        await window.App.init();
      }

      // 5. 若使用者已經停留在時間軸畫面，強制重繪時間軸卡片
      if (window.App && typeof window.App.refreshTimeline === 'function') {
        window.App.refreshTimeline();
      }

      // 6. 掛載成績自動回傳（當證書渲染完成時自動寫入試算表 Records）
      hookCertificateScoreUpload();

      console.log(`✅ 雲端課程 [${courseId}] 載入與畫面重繪成功！`);
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
