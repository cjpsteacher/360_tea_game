// ==========================================
// Google 試算表雲端教材與成績同步模組
// ==========================================
const GAS_API_URL = "請在這裡貼上你的_GAS_網頁應用程式_EXEC_網址";

async function syncCloudCourseData() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  // 若網址沒有帶 ?id=xxx，且你希望預設維持原本寫死的「史前臺灣」，就直接略過雲端載入
  if (!courseId || GAS_API_URL.includes("請在這裡貼上")) {
    return;
  }

  try {
    // 顯示載入中提示
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

      // 1. 自動替換首頁與網頁標題文字
      if (cloudData.appTitle) {
        document.title = `${cloudData.appTitle}：${cloudData.appSubtitle || '360° 探索大挑戰'}`;
        const brandTitle = document.querySelector('.brand-title');
        if (brandTitle) brandTitle.textContent = cloudData.appTitle;
        const homeTitle = document.querySelector('.home-title');
        if (homeTitle) homeTitle.innerHTML = `${cloudData.appTitle}<br>${cloudData.appSubtitle || ''}`;
      }
      if (cloudData.brandTag) {
        const brandTag = document.querySelector('.brand-tag');
        if (brandTag) brandTag.textContent = cloudData.brandTag;
      }
      if (cloudData.homeBadge) {
        const homeBadge = document.querySelector('.home-badge-tag');
        if (homeBadge) homeBadge.textContent = cloudData.homeBadge;
      }
      if (cloudData.homeDesc) {
        const homeDesc = document.querySelector('.home-desc');
        if (homeDesc) homeDesc.textContent = cloudData.homeDesc;
      }
      if (cloudData.startButtonText) {
        const startBtn = document.getElementById('start-adventure-btn');
        if (startBtn) startBtn.textContent = cloudData.startButtonText;
      }
      if (cloudData.timelineTitle) {
        const timelineH2 = document.querySelector('.timeline-header h2');
        if (timelineH2) timelineH2.textContent = cloudData.timelineTitle;
      }

      // 2. 覆寫全域關卡資料 (供 data/eras.js 原本的變數名稱使用)
      if (Array.isArray(cloudData.eras)) {
        if (typeof ERAS_DATA !== 'undefined') {
          ERAS_DATA.length = 0;
          ERAS_DATA.push(...cloudData.eras);
        }
        window.ERAS_DATA = cloudData.eras;
      }

      // 3. 覆寫證書資料 (供 data/cert_data.js 原本的變數名稱使用)
      if (typeof CERT_DATA !== 'undefined') {
        if (cloudData.issuer) CERT_DATA.issuer = cloudData.issuer;
        if (cloudData.certTitle) CERT_DATA.certTitle = cloudData.certTitle;
        if (cloudData.certSub) CERT_DATA.certSub = cloudData.certSub;
        if (cloudData.certTextLines) CERT_DATA.certTextLines = cloudData.certTextLines;
      }

      // 4. 覆寫比較表內容
      if (cloudData.comparisonTable && cloudData.comparisonTable.markdown) {
        const compCard = document.querySelector('#comparison-modal .comparison-card');
        if (compCard && typeof parseMarkdown === 'function') {
          compCard.innerHTML = `
            ${parseMarkdown(cloudData.comparisonTable.markdown)}
            <div style="text-align: center; margin-top: 20px;">
              <button type="button" id="close-comparison-btn" class="primary-btn" onclick="document.getElementById('comparison-modal').classList.add('hidden')">關閉比較表</button>
            </div>
          `;
        }
      }

      console.log(`✅ 雲端課程 [${courseId}] 載入成功！`);
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

// 供領取證書時呼叫：自動將學生姓名與過關狀態寫回 Google 試算表
async function uploadStudentScoreToSheet(studentName, scoreInfo = "全關卡探索與測驗通過") {
  if (!GAS_API_URL || GAS_API_URL.includes("https://script.google.com/macros/s/AKfycbyfm3WRGTbeNBfPg5nnMBWfPi19rDKjEj4CAOtg0LP1_U-GeSJl-l0LfklelviL5zUT/exec")) return;
  try {
    await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submitScore',
        course_id: window.CURRENT_COURSE_ID || 'default_prehistoric',
        class_name: '',
        seat_no: '',
        student_name: studentName || '未填寫姓名',
        score_info: scoreInfo
      })
    });
    console.log("✅ 學生過關成績已自動同步至 Google 試算表！");
  } catch (e) {
    console.error("成績同步失敗：", e);
  }
}
