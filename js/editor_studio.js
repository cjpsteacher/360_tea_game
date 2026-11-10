// js/editor_studio.js - 教師端 360° 互動教材創作工作台主程式
(function () {
  let erasData = null;
  let activeEraId = null;
  let selectedClueId = null;
  let viewer = null;
  let isServerConnected = false;

  // DOM 元素快取
  const currentYawEl = document.getElementById('current-yaw');
  const currentPitchEl = document.getElementById('current-pitch');
  const applyCrosshairBtn = document.getElementById('apply-crosshair-btn');
  const addHotspotAtCenterBtn = document.getElementById('add-hotspot-at-center-btn');
  const changePanoTriggerBtn = document.getElementById('change-pano-trigger-btn');
  const addClueBtn = document.getElementById('add-clue-btn');
  const addSceneBtn = document.getElementById('add-scene-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const previewStudentBtn = document.getElementById('preview-student-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonBtn = document.getElementById('import-json-btn');
  const exportStandaloneBtn = document.getElementById('export-standalone-btn');
  const newThemeBtn = document.getElementById('new-theme-btn');
  const standaloneFilePicker = document.getElementById('standalone-file-picker');
  const importJsonPicker = document.getElementById('import-json-picker');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  // ================= 1. 初始化與資料載入 =================
  async function init() {
    try {
      const resp = await fetch('/api/eras');
      if (resp.ok) {
        erasData = await resp.json();
        isServerConnected = true;
        document.getElementById('server-status').innerHTML = '🟢 本地 Python 伺服器連線正常（支援一鍵回存與全景圖同步）';
      } else {
        throw new Error('API not ok');
      }
    } catch (e) {
      console.warn('未連線至 Python 伺服器，使用本地全域變數 window.ERAS_DATA 備援', e);
      erasData = JSON.parse(JSON.stringify(window.ERAS_DATA || { eras: [] }));
      document.getElementById('server-status').innerHTML = '🟡 離線靜態模式（仍支援 JSON 匯入匯出與獨立 HTML 打包）';
    }

    // 確保 erasData 結構完整性
    ensureDataSchema(erasData);

    // 預設激活第一個場景
    if (erasData.eras && erasData.eras.length > 0) {
      activeEraId = erasData.eras[0].id;
    }

    bindGlobalEvents();
    renderAppHeaderTitle();
    renderSceneTabs();
    switchView('scene');
    switchScene(activeEraId);
    populateGlobalSettingsForm();
    populateComparisonAndBoss();
  }

  function ensureDataSchema(d) {
    if (!d.appTitle) d.appTitle = '史前臺灣時光機';
    if (!d.appSubtitle) d.appSubtitle = '360° 生存大挑戰';
    if (!d.brandTag) d.brandTag = '社會五上・第 66～75 頁';
    if (!d.homeBadge) d.homeBadge = '🌟 國小社會五上 數位 360° 互動教材';
    if (!d.homeDesc) d.homeDesc = '搭乘時光機穿越五萬年！轉動 360° 全景畫面尋找生活線索，回答生存挑戰，贏得專屬探險家證書！';
    if (!d.startButtonText) d.startButtonText = '🚀 啟動時光機';
    if (!d.timelineTitle) d.timelineTitle = '⏱️ 時光機儀表板';
    if (!d.certBannerTitle) d.certBannerTitle = '🎉 恭喜完成全時代生存挑戰！';
    if (!d.certBannerDesc) d.certBannerDesc = '你已經具備完整知識，準備好領取探險家證書了嗎？';
    if (!d.issuer) d.issuer = '新北市八里國小 五年級 社會領域教學團隊';
    if (!d.certTitle) d.certTitle = '臺灣史前時光探險家';
    if (!d.certSub) d.certSub = '🏆  闖  關  成  功  證  書  🏆';
    if (!d.certTextLines || d.certTextLines.length === 0) {
      d.certTextLines = [
        '勇敢搭乘時光機，深入探索史前時代，',
        '透過細膩觀察發現豐富生活線索，並全數克服生存大挑戰，',
        '深刻理解史前人類利用環境與開創文明的智慧與歷史延續性，',
        '表現卓絕優異，特頒發此證書，以資鼓勵！'
      ];
    }
    if (!d.comparisonTable) {
      d.comparisonTable = {
        title: '📊 臺灣三大史前時代生活比較總表',
        headers: ['比較項目', '舊石器時代（八仙洞）', '新石器時代（卑南）', '金屬器時代（十三行）'],
        rows: [
          ['代表年代', '約 50,000 ～ 5,000 年前', '約 7,000 ～ 2,000 年前', '約 2,000 ～ 400 年前'],
          ['居住方式', '住在海邊天然岩洞（遮風避雨、靠近水源）', '以竹子、茅草蓋屋，以板岩為牆與石柱，形成聚落定居', '通風涼爽、防潮防獸的架高干欄式木屋'],
          ['食物取得', '採集野果、狩獵野生動物、河海捕魚（向大自然索取）', '開始農耕（種植小米與稻米）、畜養家畜（狗、雞）', '農耕、捕魚，並與外地商人貿易獲得更多資源'],
          ['主要工具', '打製石器（用石頭敲打出尖銳邊緣）', '磨製石器（研磨石刀、石斧）、陶器、紡織器具', '鐵器（高溫煉鐵、鍛造鐵刀鐵鋤）、石器種類大幅減少'],
          ['工藝與技能', '已知用火（燒烤熟食、取暖照明、驅獸）', '製作陶器（烹煮與儲存）、雕刻精美玉器、織布做衣服', '高溫煉鐵、燒製人面陶罐與動物陶偶'],
          ['對外交流', '小範圍活動', '使用花蓮豐田玉，並與東南亞有海外交流', '以獸皮與陶器，與海外交換玻璃飾品、瑪瑙珠與銅幣'],
          ['文化核心特質', '💡 技術與技能具有深厚的「延續性」：後來的文明在前人的智慧基礎上不斷發明與進步！']
        ]
      };
    }
    if (!d.finalBoss) {
      d.finalBoss = {
        q: '【探險家終極試煉】從各個時代演進中，人類的生活技能越來越豐富，這告訴我們人類文化具有什麼特質？',
        options: ['每個時代文明必須全部歸零重新發明', '技術與技能具有深厚的「延續性」與累積性', '年代越古老的石器技術一定比鐵器更先進', '人類生活方式從未發生任何改變'],
        answer: 1,
        hint: '想想看現代科技是不是站在前人的智慧上發展起來的？',
        explain: '恭喜完全答對！人類的文明與智慧正是代代傳承、站在前人的肩膀上不斷累積延續！'
      };
    }
  }

  function showToast(text, duration = 3000) {
    toastText.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  function renderAppHeaderTitle() {
    const el = document.getElementById('app-title-display');
    if (el && erasData) {
      el.textContent = `${erasData.appTitle || '360° 互動教材'} ── 創作工作台`;
    }
  }

  // ================= 2. 視圖導覽切換 (View Tabs) =================
  function bindGlobalEvents() {
    // 頂部 4 大視圖切換
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchView(btn.dataset.view);
      });
    });

    // 關閉彈窗事件（支援多重容錯尋找與 parentModal 直接關閉）
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 1. 最優先：直接尋找該按鈕所在的父層 .modal-overlay
        const parentModal = btn.closest('.modal-overlay');
        if (parentModal) {
          parentModal.classList.remove('show');
          return;
        }

        // 2. 透過 data-close 指定的 ID 尋找
        const modalId = btn.getAttribute('data-close');
        let modal = document.getElementById(modalId);
        if (!modal) modal = document.getElementById(`modal-${modalId}`);
        if (!modal && modalId.startsWith('modal-')) modal = document.getElementById(modalId.replace('modal-', ''));
        if (modal) modal.classList.remove('show');
      });
    });

    // 點擊彈窗外側半透明黑底關閉
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });

    // 按 ESC 鍵關閉所有開啟的彈窗
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(modal => {
          modal.classList.remove('show');
        });
      }
    });

    // 準心定位按鈕
    applyCrosshairBtn.addEventListener('click', () => {
      if (!viewer || !selectedClueId) {
        alert('請先在右側清單中點選要定位的線索！');
        return;
      }
      const currentPitch = Math.round(viewer.getPitch() * 10) / 10;
      const currentYaw = Math.round(viewer.getYaw() * 10) / 10;
      updateClueCoords(selectedClueId, currentYaw, currentPitch);
      const clue = getClueById(selectedClueId);
      showToast(`已將「${clue ? clue.title : '線索'}」定位在準心 (Yaw: ${currentYaw}°, Pitch: ${currentPitch}°)`);
    });

    // 在中心準心處新增線索
    addHotspotAtCenterBtn.addEventListener('click', () => {
      addClue(true);
    });

    // 更換全景圖按鈕
    changePanoTriggerBtn.addEventListener('click', () => {
      const era = getActiveEra();
      if (!era) return;
      standaloneFilePicker.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handlePanoramaUpload(era.id, file);
      };
      standaloneFilePicker.click();
    });

    // 新增線索按鈕 (側邊欄頂部)
    addClueBtn.addEventListener('click', () => {
      addClue(false);
    });

    // 新增場景按鈕
    addSceneBtn.addEventListener('click', () => {
      openSceneModal(null, true);
    });

    // 儲存場景彈窗
    document.getElementById('modal-scene-save-btn').addEventListener('click', saveSceneModal);

    // 場景彈窗內的 Dropzone
    const dropzone = document.getElementById('modal-pano-dropzone');
    const fileInput = document.getElementById('modal-pano-file-input');
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = '#fff3e0'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.background = '#fffbf5'; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = '#fffbf5';
      if (e.dataTransfer.files.length > 0) {
        handleModalPanoUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleModalPanoUpload(e.target.files[0]);
      }
    });

    // 新增題目按鈕
    document.getElementById('add-quiz-btn').addEventListener('click', () => {
      addQuizQuestion();
    });

    // 批次匯入題庫按鈕與複製出題 Prompt
    const batchQuizBtn = document.getElementById('batch-quiz-btn');
    if (batchQuizBtn) batchQuizBtn.addEventListener('click', openBatchQuizModal);
    const copyQuizPromptBtn = document.getElementById('copy-quiz-prompt-btn');
    if (copyQuizPromptBtn) copyQuizPromptBtn.addEventListener('click', copyQuizPrompt);
    const copyQuizPromptInsideBtn = document.getElementById('copy-quiz-prompt-inside-btn');
    if (copyQuizPromptInsideBtn) copyQuizPromptInsideBtn.addEventListener('click', copyQuizPrompt);
    const batchQuizInput = document.getElementById('batch-quiz-raw-input');
    if (batchQuizInput) batchQuizInput.addEventListener('input', handleBatchQuizInput);
    const confirmBatchQuizBtn = document.getElementById('confirm-batch-quiz-btn');
    if (confirmBatchQuizBtn) confirmBatchQuizBtn.addEventListener('click', confirmBatchQuizImport);

    // 批次匯入線索按鈕與複製線索 Prompt
    const batchClueBtn = document.getElementById('batch-clue-btn');
    if (batchClueBtn) batchClueBtn.addEventListener('click', openBatchCluesModal);
    const copyCluesPromptInsideBtn = document.getElementById('copy-clues-prompt-inside-btn');
    if (copyCluesPromptInsideBtn) copyCluesPromptInsideBtn.addEventListener('click', copyCluesPrompt);
    const batchCluesInput = document.getElementById('batch-clues-raw-input');
    if (batchCluesInput) batchCluesInput.addEventListener('input', handleBatchCluesInput);
    const confirmBatchCluesBtn = document.getElementById('confirm-batch-clues-btn');
    if (confirmBatchCluesBtn) confirmBatchCluesBtn.addEventListener('click', confirmBatchCluesImport);

    // 全站 AI 教材生成按鈕與彈窗
    const btnMasterAIPrompt = document.getElementById('btn-master-ai-prompt');
    if (btnMasterAIPrompt) btnMasterAIPrompt.addEventListener('click', openMasterAIModal);
    const copyMasterAIPromptBtn = document.getElementById('copy-master-ai-prompt-btn');
    if (copyMasterAIPromptBtn) copyMasterAIPromptBtn.addEventListener('click', copyMasterAIPrompt);
    const masterAIJsonInput = document.getElementById('master-ai-json-input');
    if (masterAIJsonInput) masterAIJsonInput.addEventListener('input', handleMasterAIJsonInput);
    const applyMasterAIBtn = document.getElementById('apply-master-ai-btn');
    if (applyMasterAIBtn) applyMasterAIBtn.addEventListener('click', applyMasterAIJson);

    // 比較表功能按鈕與 Markdown 輸入監聽
    const copyComparePromptBtn = document.getElementById('copy-compare-prompt-btn');
    if (copyComparePromptBtn) copyComparePromptBtn.addEventListener('click', copyComparePrompt);
    const loadTemplateTableBtn = document.getElementById('load-template-table-btn');
    if (loadTemplateTableBtn) loadTemplateTableBtn.addEventListener('click', loadTemplateComparisonTable);
    const mdInput = document.getElementById('comparison-markdown-input');
    if (mdInput) mdInput.addEventListener('input', renderMarkdownPreview);

    document.querySelectorAll('[data-insert-md]').forEach(btn => {
      btn.addEventListener('click', () => {
        insertMarkdownSnippet(btn.getAttribute('data-insert-md'));
      });
    });

    // 頂部功能動作按鈕
    saveSettingsBtn.addEventListener('click', saveToProject);
    previewStudentBtn.addEventListener('click', () => window.open('index.html', '_blank'));
    exportJsonBtn.addEventListener('click', exportProjectJson);
    importJsonBtn.addEventListener('click', () => importJsonPicker.click());
    importJsonPicker.addEventListener('change', handleImportJson);
    exportStandaloneBtn.addEventListener('click', exportStandalonePackage);
    newThemeBtn.addEventListener('click', createNewThemeTemplate);

    // 全域文案輸入即時同步
    bindGlobalSettingsInputs();
  }

  function switchView(viewName) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
    }

    if (viewName === 'scene') {
      setTimeout(() => {
        if (!viewer) {
          initPannellumViewer();
        } else {
          try { viewer.resize(); } catch(e){}
        }
      }, 100);
    } else if (viewName === 'quiz') {
      renderQuizList();
    } else if (viewName === 'comparison') {
      populateComparisonAndBoss();
    } else if (viewName === 'settings') {
      populateGlobalSettingsForm();
    }
  }

  // ================= 3. 場景管理 (Scene Management) =================
  function getActiveEra() {
    return erasData.eras.find(e => e.id === activeEraId);
  }

  function renderSceneTabs() {
    const list = document.getElementById('scene-tabs-list');
    list.innerHTML = '';

    erasData.eras.forEach((era, idx) => {
      const tab = document.createElement('div');
      tab.className = `scene-tab ${era.id === activeEraId ? 'active' : ''}`;
      tab.innerHTML = `
        <span style="font-size: 16px;">${era.badgeEmoji || '🧭'}</span>
        <span class="scene-tab-name">${era.name}</span>
        <button type="button" class="scene-tab-action" title="編輯場景設定與換圖" data-action="edit">⚙️</button>
        <button type="button" class="scene-tab-action" title="刪除此場景" data-action="delete">✖</button>
      `;

      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.scene-tab-action')) {
          switchScene(era.id);
        }
      });

      tab.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openSceneModal(era.id, false);
      });

      tab.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteScene(era.id);
      });

      list.appendChild(tab);
    });
  }

  function switchScene(eraId) {
    activeEraId = eraId;
    renderSceneTabs();
    const era = getActiveEra();
    if (!era) return;

    document.getElementById('sidebar-scene-title').textContent = `${era.name}・生活線索（共 ${era.hotspots.length} 個）`;
    document.getElementById('quiz-scene-title').textContent = `【${era.name}】生存問答挑戰題庫`;

    // 預設選取第一個線索
    if (era.hotspots.length > 0) {
      selectedClueId = era.hotspots[0].id;
    } else {
      selectedClueId = null;
    }

    renderSidebarClues();
    initPannellumViewer();
    renderQuizList();
  }

  function openSceneModal(eraId, isNew = false) {
    const modal = document.getElementById('scene-modal');
    document.getElementById('modal-scene-is-new').value = isNew ? '1' : '0';
    document.getElementById('scene-modal-title').textContent = isNew ? '➕ 新增 360 場景' : '⚙️ 場景資訊設定';

    if (isNew) {
      const nextNum = (erasData.eras ? erasData.eras.length + 1 : 1);
      document.getElementById('modal-scene-id').value = `scene_${Date.now().toString(36)}`;
      document.getElementById('modal-scene-name').value = `第 ${nextNum} 探索場景`;
      document.getElementById('modal-scene-subtitle').value = '探索主題';
      document.getElementById('modal-scene-years').value = '自訂年代或說明';
      document.getElementById('modal-scene-site').value = '代表地點 / 遺址';
      document.getElementById('modal-scene-badge-emoji').value = '🌟';
      document.getElementById('modal-scene-badge-title').value = '探索先鋒';
      document.getElementById('modal-scene-hint').value = '轉動畫面看看四周，發光的圓點就是線索喔！';
      document.getElementById('modal-scene-intro').value = '歡迎來到這個全新的探索場景！轉動 360° 畫面，找出藏在這裡的所有生活線索吧！';
      document.getElementById('modal-scene-pano-path').value = 'img/pano/paleolithic.jpg';
      document.getElementById('modal-pano-status').textContent = '點擊或拖曳 JPG / PNG 全景圖片至此上傳';
    } else {
      const era = erasData.eras.find(e => e.id === eraId);
      if (!era) return;
      document.getElementById('modal-scene-id').value = era.id;
      document.getElementById('modal-scene-name').value = era.name || '';
      document.getElementById('modal-scene-subtitle').value = era.subtitle || '';
      document.getElementById('modal-scene-years').value = era.years || '';
      document.getElementById('modal-scene-site').value = era.site || '';
      document.getElementById('modal-scene-badge-emoji').value = era.badgeEmoji || '🏅';
      document.getElementById('modal-scene-badge-title').value = era.badgeTitle || '探險達人';
      document.getElementById('modal-scene-hint').value = era.captainHint || '';
      document.getElementById('modal-scene-intro').value = era.intro || '';
      document.getElementById('modal-scene-pano-path').value = era.panorama || '';
      document.getElementById('modal-pano-status').textContent = `目前圖片：${era.panorama || '已載入'}`;
    }

    modal.classList.add('show');
  }

  function handleModalPanoUpload(file) {
    if (!file) return;
    const statusText = document.getElementById('modal-pano-status');
    statusText.textContent = `⏳ 讀取中：${file.name}...`;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target.result;
      const eraId = document.getElementById('modal-scene-id').value.trim() || 'custom_scene';

      if (!window.PANO_DATA) window.PANO_DATA = {};
      window.PANO_DATA[eraId] = dataUri;
      const era = erasData.eras.find(e => e.id === eraId);
      if (era) {
        era.dataUri = dataUri;
      }

      // 若後端可用，上傳至伺服器
      if (isServerConnected) {
        try {
          const resp = await fetch('/api/upload_pano', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eraId, dataBase64: dataUri, fileName: file.name })
          });
          const res = await resp.json();
          if (res.success) {
            document.getElementById('modal-scene-pano-path').value = res.path;
            if (era) {
              era.panorama = res.path;
              era.dataUri = res.dataUri || dataUri;
            }
            window.PANO_DATA[eraId] = res.dataUri || dataUri;
            statusText.textContent = `✅ 已成功上傳儲存：${res.path}`;
            return;
          }
        } catch (err) {
          console.warn('伺服器上傳失敗，保留前端 DataURI', err);
        }
      }

      // 離線回退
      document.getElementById('modal-scene-pano-path').value = dataUri;
      if (era) {
        era.panorama = dataUri;
        era.dataUri = dataUri;
      }
      statusText.textContent = `✅ 已就緒（離線 Data URI，大小: ${(file.size / 1024).toFixed(0)} KB）`;
    };
    reader.readAsDataURL(file);
  }

  function saveSceneModal() {
    const isNew = document.getElementById('modal-scene-is-new').value === '1';
    const id = document.getElementById('modal-scene-id').value.trim();
    const name = document.getElementById('modal-scene-name').value.trim();

    if (!id || !name) {
      alert('請填寫場景 ID 與場景名稱！');
      return;
    }

    const panoPath = document.getElementById('modal-scene-pano-path').value || 'img/pano/paleolithic.jpg';
    const subtitle = document.getElementById('modal-scene-subtitle').value.trim();
    const years = document.getElementById('modal-scene-years').value.trim();
    const site = document.getElementById('modal-scene-site').value.trim();
    const badgeEmoji = document.getElementById('modal-scene-badge-emoji').value.trim() || '🏅';
    const badgeTitle = document.getElementById('modal-scene-badge-title').value.trim() || '探險達人';
    const captainHint = document.getElementById('modal-scene-hint').value.trim();
    const intro = document.getElementById('modal-scene-intro').value.trim();

    const cachedDataUri = (window.PANO_DATA && window.PANO_DATA[id]) ? window.PANO_DATA[id] : (panoPath.startsWith('data:') ? panoPath : null);

    if (isNew) {
      if (erasData.eras.some(e => e.id === id)) {
        alert('此場景 ID 已存在，請使用不同的 ID！');
        return;
      }
      const newEra = {
        id,
        name,
        subtitle,
        years,
        site,
        panorama: panoPath,
        dataUri: cachedDataUri,
        badge: `img/badges/${id}.png`,
        badgeTitle,
        badgeEmoji,
        intro,
        captainHint,
        hotspots: [
          {
            id: `${id}-c1`,
            yaw: 0,
            pitch: 0,
            icon: '🔍',
            title: `${name} 第一個核心線索`,
            text: '請在此輸入該線索的詳細圖文解說內容。'
          }
        ],
        quiz: [
          {
            q: `請問關於「${name}」的描述，下列何者正確？`,
            options: ['正確描述選項A', '錯誤選項B', '錯誤選項C', '錯誤選項D'],
            answer: 0,
            hint: '回想一下場景中的線索提示～',
            explain: '答對了！這正是本關卡的核心生活技能。'
          }
        ]
      };
      erasData.eras.push(newEra);
      activeEraId = id;
      showToast(`🎉 已成功新增 360 場景「${name}」！`);
    } else {
      const era = erasData.eras.find(e => e.id === id);
      if (era) {
        era.name = name;
        era.subtitle = subtitle;
        era.years = years;
        era.site = site;
        era.panorama = panoPath;
        if (cachedDataUri) {
          era.dataUri = cachedDataUri;
        }
        era.badgeEmoji = badgeEmoji;
        era.badgeTitle = badgeTitle;
        era.captainHint = captainHint;
        era.intro = intro;
        showToast(`已更新「${name}」場景設定！`);
      }
    }

    document.getElementById('scene-modal').classList.remove('show');
    renderSceneTabs();
    switchScene(activeEraId);
  }

  function deleteScene(eraId) {
    if (erasData.eras.length <= 1) {
      alert('教材至少需要保留 1 個場景！');
      return;
    }
    const era = erasData.eras.find(e => e.id === eraId);
    if (!confirm(`確定要刪除場景「${era ? era.name : eraId}」嗎？\n該場景下的所有線索與題庫將一併移除。`)) {
      return;
    }
    erasData.eras = erasData.eras.filter(e => e.id !== eraId);
    if (activeEraId === eraId) {
      activeEraId = erasData.eras[0].id;
    }
    renderSceneTabs();
    switchScene(activeEraId);
    showToast('已刪除場景。');
  }

  // ================= 4. 全景圖更換與上傳 (Pano Upload) =================
  async function handlePanoramaUpload(eraId, file) {
    const era = erasData.eras.find(e => e.id === eraId);
    if (!era) return;

    showToast(`⏳ 正在上傳全景圖：${file.name}...`, 4000);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target.result;
      era.dataUri = dataUri;
      if (!window.PANO_DATA) window.PANO_DATA = {};
      window.PANO_DATA[eraId] = dataUri;

      if (isServerConnected) {
        try {
          const resp = await fetch('/api/upload_pano', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eraId, dataBase64: dataUri, fileName: file.name })
          });
          const res = await resp.json();
          if (res.success) {
            era.panorama = res.path;
            era.dataUri = res.dataUri || dataUri;
            window.PANO_DATA[eraId] = res.dataUri || dataUri;
            showToast(`🎉 全景圖上傳成功並完成離線同步！`);
            initPannellumViewer();
            return;
          }
        } catch (err) {
          console.warn('伺服器上傳失敗，套用 Data URI 備援', err);
        }
      }

      era.panorama = dataUri;
      era.dataUri = dataUri;
      window.PANO_DATA[eraId] = dataUri;
      showToast(`🎉 全景圖已更換完成（離線預覽）！`);
      initPannellumViewer();
    };
    reader.readAsDataURL(file);
  }

  // ================= 5. 線索管理 (Hotspots Management) =================
  function getClueById(clueId) {
    const era = getActiveEra();
    return era ? era.hotspots.find(h => h.id === clueId) : null;
  }

  function addClue(atCenter = true) {
    const era = getActiveEra();
    if (!era) return;

    let yaw = 0;
    let pitch = 0;
    if (atCenter && viewer) {
      yaw = Math.round(viewer.getYaw() * 10) / 10;
      pitch = Math.round(viewer.getPitch() * 10) / 10;
    }

    const nextIdx = era.hotspots.length + 1;
    const newClue = {
      id: `${era.id}-c${Date.now().toString(36)}`,
      yaw: yaw,
      pitch: pitch,
      icon: '✨',
      title: `生活線索 ${nextIdx}`,
      text: '請在此輸入此生活線索的詳細故事與說明內容。'
    };

    era.hotspots.push(newClue);
    selectedClueId = newClue.id;
    renderSidebarClues();
    initPannellumViewer();
    showToast(`➕ 已新增生活線索「${newClue.title}」！`);
  }

  function deleteClue(clueId) {
    const era = getActiveEra();
    if (!era) return;
    const clue = getClueById(clueId);
    if (!confirm(`確定要刪除線索「${clue ? clue.title : clueId}」嗎？`)) return;

    era.hotspots = era.hotspots.filter(h => h.id !== clueId);
    if (selectedClueId === clueId) {
      selectedClueId = era.hotspots.length > 0 ? era.hotspots[0].id : null;
    }

    renderSidebarClues();
    initPannellumViewer();
    showToast('線索已刪除。');
  }

  function renderSidebarClues() {
    const era = getActiveEra();
    const container = document.getElementById('clue-list');
    if (!era || !container) return;

    container.innerHTML = '';
    document.getElementById('sidebar-scene-title').textContent = `${era.name}・生活線索（共 ${era.hotspots.length} 個）`;

    if (era.hotspots.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #8d6e63;">
          <p style="font-size: 28px; margin-bottom: 8px;">🔍</p>
          <p style="font-weight: 700;">目前場景尚未建立任何線索</p>
          <p style="font-size: 13px; margin-top: 6px;">點擊上方「➕ 在此準心新增線索」立即建立！</p>
        </div>
      `;
      return;
    }

    era.hotspots.forEach(h => {
      const isEgg = h.id.includes('egg');
      const card = document.createElement('div');
      card.className = `clue-edit-card ${h.id === selectedClueId ? 'selected' : ''}`;
      card.setAttribute('data-id', h.id);

      card.innerHTML = `
        <div class="clue-card-head">
          <div class="clue-title-input-wrap">
            <input type="text" class="icon-input" value="${h.icon}" title="點擊修改圖示 Emoji" data-field="icon">
            <input type="text" class="title-input" value="${h.title}" placeholder="線索標題" data-field="title">
          </div>
          <button type="button" class="card-btn delete-action" title="刪除此線索" data-action="delete">🗑️</button>
        </div>
        <textarea class="desc-textarea" placeholder="輸入線索介紹內容..." data-field="text">${h.text}</textarea>
        <div class="clue-options-row">
          <label class="egg-checkbox-label" title="彩蛋加分線索不計入通關必須線索中">
            <input type="checkbox" ${isEgg ? 'checked' : ''} data-field="egg"> 🥚 彩蛋加分線索
          </label>
          <span style="font-size: 11px; color: #9e9e9e; font-family: monospace;">ID: ${h.id}</span>
        </div>
        <div class="coord-inputs-row">
          <div class="input-field">
            <label>水平 Yaw (-180° ~ 180°)</label>
            <input type="number" step="0.5" min="-180" max="180" value="${h.yaw}" data-coord="yaw">
          </div>
          <div class="input-field">
            <label>垂直 Pitch (-90° ~ 90°)</label>
            <input type="number" step="0.5" min="-90" max="90" value="${h.pitch}" data-coord="pitch">
          </div>
        </div>
        <div class="clue-card-actions">
          <button type="button" class="card-btn primary-action" data-action="aim">
            🎯 轉向此處
          </button>
          <button type="button" class="card-btn" data-action="set-center">
            📍 設為當前準心
          </button>
        </div>
      `;

      // 點選卡片聚焦
      card.addEventListener('click', (e) => {
        if (!['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
          selectClue(h.id);
        }
      });

      // 內容修改監聽
      card.querySelector('input[data-field="icon"]').addEventListener('change', (e) => {
        h.icon = e.target.value.trim() || '✨';
        initPannellumViewer();
      });
      card.querySelector('input[data-field="title"]').addEventListener('change', (e) => {
        h.title = e.target.value.trim() || '未命名線索';
        initPannellumViewer();
      });
      card.querySelector('textarea[data-field="text"]').addEventListener('change', (e) => {
        h.text = e.target.value.trim();
      });
      card.querySelector('input[data-field="egg"]').addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (checked && !h.id.includes('egg')) {
          h.id = `${h.id}-egg`;
        } else if (!checked && h.id.includes('egg')) {
          h.id = h.id.replace(/-egg/g, '');
        }
      });

      // 座標手動修改監聽
      card.querySelector('input[data-coord="yaw"]').addEventListener('change', (e) => {
        updateClueCoords(h.id, parseFloat(e.target.value) || 0, h.pitch);
      });
      card.querySelector('input[data-coord="pitch"]').addEventListener('change', (e) => {
        updateClueCoords(h.id, h.yaw, parseFloat(e.target.value) || 0);
      });

      // 動作按鈕監聽
      card.querySelector('[data-action="aim"]').addEventListener('click', (e) => {
        e.stopPropagation();
        selectClue(h.id);
        if (viewer) viewer.lookAt(h.pitch, h.yaw, 75, 800);
      });

      card.querySelector('[data-action="set-center"]').addEventListener('click', (e) => {
        e.stopPropagation();
        selectClue(h.id);
        if (viewer) {
          const p = Math.round(viewer.getPitch() * 10) / 10;
          const y = Math.round(viewer.getYaw() * 10) / 10;
          updateClueCoords(h.id, y, p);
          showToast(`已將「${h.title}」定位在中心點！`);
        }
      });

      card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteClue(h.id);
      });

      container.appendChild(card);
    });
  }

  function selectClue(clueId) {
    selectedClueId = clueId;
    document.querySelectorAll('.clue-edit-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.id === clueId);
    });
    document.querySelectorAll('.editor-hotspot-pin').forEach(p => {
      p.classList.toggle('active', p.dataset.clueId === clueId);
    });
    const selectedCard = document.querySelector(`.clue-edit-card[data-id="${clueId}"]`);
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function updateClueCoords(clueId, yaw, pitch) {
    const clue = getClueById(clueId);
    if (!clue) return;

    clue.yaw = Math.round(yaw * 10) / 10;
    clue.pitch = Math.round(pitch * 10) / 10;

    const card = document.querySelector(`.clue-edit-card[data-id="${clueId}"]`);
    if (card) {
      const yIn = card.querySelector('input[data-coord="yaw"]');
      const pIn = card.querySelector('input[data-coord="pitch"]');
      if (yIn) yIn.value = clue.yaw;
      if (pIn) pIn.value = clue.pitch;
    }

    const currentPitch = viewer ? viewer.getPitch() : 0;
    const currentYaw = viewer ? viewer.getYaw() : 0;
    const currentHfov = viewer ? viewer.getHfov() : 90;

    initPannellumViewer();

    if (viewer) {
      viewer.setPitch(currentPitch);
      viewer.setYaw(currentYaw);
      viewer.setHfov(currentHfov);
    }
  }

  // ================= 6. Pannellum 檢視器渲染 =================
  function resolvePanoramaSource(era) {
    if (!era) return '';

    // 1. 若 era.dataUri 是 Data URI，優先採用（確保匯入及離線設定即時呈現）
    if (era.dataUri && typeof era.dataUri === 'string' && era.dataUri.startsWith('data:image/')) {
      return era.dataUri;
    }

    // 2. 若 era.panorama 本身為 Data URI，直接返回，嚴禁附加 ?t=... 參數
    if (era.panorama && typeof era.panorama === 'string' && era.panorama.startsWith('data:image/')) {
      return era.panorama;
    }

    // 3. 若 window.PANO_DATA 有此場景的 Base64 快取
    if (window.PANO_DATA && window.PANO_DATA[era.id] && typeof window.PANO_DATA[era.id] === 'string' && window.PANO_DATA[era.id].startsWith('data:image/')) {
      // 在 file:/// 協定下，瀏覽器安全政策禁止讀取本機相對路徑 WebGL 紋理，強制採用 Base64
      if (!location.protocol.startsWith('http')) {
        return window.PANO_DATA[era.id];
      }
    }

    // 4. 若在 http:// 或 https:// 伺服器環境下，且為一般檔案路徑
    if (location.protocol.startsWith('http') && era.panorama) {
      if (era.panorama.startsWith('data:') || era.panorama.startsWith('blob:')) {
        return era.panorama;
      }
      return `${era.panorama}?t=${Date.now()}`;
    }

    // 5. 本地 file:/// 下若有快取則返回快取，否則嘗試原路徑
    if (window.PANO_DATA && window.PANO_DATA[era.id]) {
      return window.PANO_DATA[era.id];
    }

    return era.panorama || '';
  }

  function initPannellumViewer() {
    const era = getActiveEra();
    if (!era) return;

    const container = document.getElementById('panorama-editor');
    if (!container) return;

    if (viewer) {
      try { viewer.destroy(); } catch (e) {}
      viewer = null;
    }
    container.innerHTML = '';

    const panoSrc = resolvePanoramaSource(era);
    if (!panoSrc) {
      container.innerHTML = '<div style="color:white; padding:40px; text-align:center;">尚未設定全景圖片，請點擊上方「更換全景圖」上傳。</div>';
      return;
    }

    const hotSpots = era.hotspots.map(h => ({
      id: h.id,
      pitch: h.pitch,
      yaw: h.yaw,
      cssClass: 'clue-hotspot',
      createTooltipFunc: (div) => {
        div.className = `editor-hotspot-pin ${h.id === selectedClueId ? 'active' : ''}`;
        div.setAttribute('data-clue-id', h.id);
        div.innerHTML = `
          <div class="editor-pin-circle">
            <span>${h.icon}</span>
          </div>
          <div class="editor-pin-label">${h.title}</div>
        `;
        div.onclick = (e) => {
          e.stopPropagation();
          selectClue(h.id);
        };
      },
      clickHandlerFunc: () => {
        selectClue(h.id);
      }
    }));

    try {
      viewer = pannellum.viewer('panorama-editor', {
        type: 'equirectangular',
        panorama: panoSrc,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        compass: true,
        hfov: 90,
        minHfov: 45,
        maxHfov: 120,
        pitch: 0,
        yaw: 0,
        hotSpots: hotSpots
      });
    } catch (err) {
      console.error('Failed to init pannellum', err);
      container.innerHTML = `<div style="color:white; padding:40px; text-align:center;">全景圖載入中或格式不符 (${err.message})</div>`;
    }

    // 視角座標即時監聽更新
    if (!window._coordTimer) {
      window._coordTimer = setInterval(() => {
        if (viewer) {
          try {
            const y = viewer.getYaw();
            const p = viewer.getPitch();
            if (currentYawEl) currentYawEl.textContent = (Math.round(y * 10) / 10).toFixed(1) + '°';
            if (currentPitchEl) currentPitchEl.textContent = (Math.round(p * 10) / 10).toFixed(1) + '°';
          } catch(e){}
        }
      }, 100);
    }
  }

  // ================= 7. 題庫挑戰編輯器 (Quiz Editor) =================
  function renderQuizList() {
    const era = getActiveEra();
    const container = document.getElementById('quiz-list-container');
    if (!era || !container) return;

    if (!era.quiz) era.quiz = [];
    container.innerHTML = '';

    if (era.quiz.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #8d6e63; background: #fff; border-radius: 12px; border: 2px dashed #ffb74d;">
          <p style="font-size: 28px; margin-bottom: 8px;">📝</p>
          <p style="font-weight: 700;">目前關卡尚未建立題目</p>
          <p style="font-size: 13px; margin-top: 6px;">點擊右上角「➕ 新增問答題目」開始設計關卡測驗！</p>
        </div>
      `;
      return;
    }

    era.quiz.forEach((qItem, idx) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';

      let optionsHtml = '';
      (qItem.options || ['', '', '', '']).forEach((opt, optIdx) => {
        const isCorrect = qItem.answer === optIdx;
        optionsHtml += `
          <div class="option-row ${isCorrect ? 'correct' : ''}">
            <input type="radio" name="correct-opt-${era.id}-${idx}" value="${optIdx}" class="option-radio" ${isCorrect ? 'checked' : ''} data-opt-idx="${optIdx}" title="設為正確答案">
            <span style="font-weight: bold; color: #795548; font-size: 13px;">${String.fromCharCode(65 + optIdx)}.</span>
            <input type="text" class="option-text-input" value="${opt}" placeholder="選項 ${String.fromCharCode(65 + optIdx)} 內容" data-opt-input="${optIdx}">
          </div>
        `;
      });

      card.innerHTML = `
        <div class="quiz-card-head">
          <span class="quiz-card-num">第 ${idx + 1} 題</span>
          <button type="button" class="btn btn-secondary" style="color: #c62828; border-color: #ef9a9a; padding: 4px 10px; font-size: 12px;" data-del-quiz="${idx}">
            🗑️ 刪除此題
          </button>
        </div>
        <div class="form-group">
          <label class="form-label">題目內容：</label>
          <textarea class="form-textarea" rows="2" data-field="q">${qItem.q || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">選項（點選圓鈕設定正確答案）：</label>
          <div class="options-grid">
            ${optionsHtml}
          </div>
        </div>
        <div class="grid-2col">
          <div class="form-group">
            <label class="form-label">提示文字 Hint：</label>
            <input type="text" class="form-input" value="${qItem.hint || ''}" data-field="hint">
          </div>
          <div class="form-group">
            <label class="form-label">解析文字 Explain：</label>
            <input type="text" class="form-input" value="${qItem.explain || ''}" data-field="explain">
          </div>
        </div>
      `;

      // 監聽題目修改
      card.querySelector('textarea[data-field="q"]').addEventListener('change', (e) => {
        qItem.q = e.target.value.trim();
      });
      card.querySelector('input[data-field="hint"]').addEventListener('change', (e) => {
        qItem.hint = e.target.value.trim();
      });
      card.querySelector('input[data-field="explain"]').addEventListener('change', (e) => {
        qItem.explain = e.target.value.trim();
      });

      // 監聽選項文字
      card.querySelectorAll('input[data-opt-input]').forEach(input => {
        input.addEventListener('change', (e) => {
          const oIdx = parseInt(e.target.dataset.optInput, 10);
          if (!qItem.options) qItem.options = ['', '', '', ''];
          qItem.options[oIdx] = e.target.value.trim();
        });
      });

      // 監聽正確解答單選
      card.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          qItem.answer = parseInt(e.target.value, 10);
          renderQuizList();
        });
      });

      // 刪除題目
      card.querySelector('[data-del-quiz]').addEventListener('click', () => {
        if (confirm(`確定要刪除第 ${idx + 1} 題嗎？`)) {
          era.quiz.splice(idx, 1);
          renderQuizList();
          showToast('題目已刪除。');
        }
      });

      container.appendChild(card);
    });
  }

  function addQuizQuestion() {
    const era = getActiveEra();
    if (!era) return;
    if (!era.quiz) era.quiz = [];

    const newQ = {
      q: `請問關於「${era.name}」，下列敘述何者正確？`,
      options: ['正確描述選項A', '錯誤描述選項B', '錯誤描述選項C', '錯誤描述選項D'],
      answer: 0,
      hint: '回想一下在場景中發現的金色生活線索！',
      explain: '答對了！這正是這個時代最關鍵的生活方式。'
    };
    era.quiz.push(newQ);
    renderQuizList();
    showToast('➕ 已新增題目！');
  }

  // ================= 8. 比較總表與大魔王編輯 (Markdown Comparison & Boss) =================
  function populateComparisonAndBoss() {
    if (!erasData) return;

    // 大魔王
    const boss = erasData.finalBoss || {};
    const qEl = document.getElementById('final-boss-q');
    const hintEl = document.getElementById('final-boss-hint');
    const explainEl = document.getElementById('final-boss-explain');
    const optionsContainer = document.getElementById('final-boss-options');

    if (qEl) qEl.value = boss.q || '';
    if (hintEl) hintEl.value = boss.hint || '';
    if (explainEl) explainEl.value = boss.explain || '';

    qEl.onchange = () => { boss.q = qEl.value.trim(); };
    hintEl.onchange = () => { boss.hint = hintEl.value.trim(); };
    explainEl.onchange = () => { boss.explain = explainEl.value.trim(); };

    optionsContainer.innerHTML = '';
    (boss.options || ['', '', '', '']).forEach((opt, idx) => {
      const isCorrect = boss.answer === idx;
      const row = document.createElement('div');
      row.className = `option-row ${isCorrect ? 'correct' : ''}`;
      row.innerHTML = `
        <input type="radio" name="final-boss-correct" value="${idx}" class="option-radio" ${isCorrect ? 'checked' : ''}>
        <span style="font-weight: bold; color: #795548; font-size: 13px;">${String.fromCharCode(65 + idx)}.</span>
        <input type="text" class="option-text-input" value="${opt}" placeholder="選項 ${String.fromCharCode(65 + idx)}">
      `;
      row.querySelector('input[type="radio"]').onchange = () => {
        boss.answer = idx;
        populateComparisonAndBoss();
      };
      row.querySelector('.option-text-input').onchange = (e) => {
        boss.options[idx] = e.target.value.trim();
      };
      optionsContainer.appendChild(row);
    });

    // 比較表大標題
    const tbl = erasData.comparisonTable || (erasData.comparisonTable = {});
    const titleInput = document.getElementById('comparison-table-title');
    if (titleInput) {
      titleInput.value = tbl.title || '📊 各場景生活比較總表';
      titleInput.onchange = () => { tbl.title = titleInput.value.trim(); };
    }

    // Markdown 輸入框初始化與預覽
    const mdInput = document.getElementById('comparison-markdown-input');
    if (mdInput) {
      if (tbl.markdown) {
        mdInput.value = tbl.markdown;
      } else if (tbl.headers && tbl.rows && window.MarkdownLite) {
        mdInput.value = window.MarkdownLite.toMarkdownTable(tbl.headers, tbl.rows) + '\n\n> 💡 **核心重點歸納**：各場景之間具有深厚的傳承與延續性！';
      } else {
        mdInput.value = generateDefaultComparisonMarkdown();
      }
      renderMarkdownPreview();
    }
  }

  function renderMarkdownPreview() {
    const mdInput = document.getElementById('comparison-markdown-input');
    const previewEl = document.getElementById('comparison-markdown-preview');
    if (!mdInput || !previewEl || !erasData) return;

    const rawMd = mdInput.value;
    if (window.MarkdownLite) {
      previewEl.innerHTML = window.MarkdownLite.parse(rawMd);
      const tbl = erasData.comparisonTable || (erasData.comparisonTable = {});
      tbl.markdown = rawMd;

      // 自動解析表格同步至 headers 與 rows 結構供相容
      const extracted = window.MarkdownLite.extractTable(rawMd);
      if (extracted) {
        tbl.headers = extracted.headers;
        tbl.rows = extracted.rows;
      }
    } else {
      previewEl.textContent = rawMd;
    }
  }

  function generateDefaultComparisonMarkdown(data = erasData) {
    const scenes = (data && data.eras && data.eras.length) ? data.eras.map(e => e.name) : ['舊石器時代（八仙洞）', '新石器時代（卑南）', '金屬器時代（十三行）'];
    const headers = ['比較項目', ...scenes];
    const rows = [
      ['代表年代', ...scenes.map(() => '請填寫年代或環境特徵')],
      ['居住環境', ...scenes.map(() => '請填寫居住方式')],
      ['食物取得', ...scenes.map(() => '請填寫食物取得方式')],
      ['主要工具', ...scenes.map(() => '請填寫主要工具與材質')]
    ];
    let md = window.MarkdownLite ? window.MarkdownLite.toMarkdownTable(headers, rows) : '';
    md += '\n\n> 💡 **文化核心特質**：技術與技能具有深厚的「延續性」：後來的文明在前人的智慧基礎上不斷發明與進步！';
    return md;
  }

  function loadTemplateComparisonTable() {
    if (!confirm('確定要根據目前所有場景重新建立 Markdown 表格範本嗎？現有文字將被範本取代。')) return;
    const mdInput = document.getElementById('comparison-markdown-input');
    if (mdInput) {
      mdInput.value = generateDefaultComparisonMarkdown();
      renderMarkdownPreview();
      showToast('已從現有場景載入 Markdown 表格範本！');
    }
  }

  function insertMarkdownSnippet(tool) {
    const mdInput = document.getElementById('comparison-markdown-input');
    if (!mdInput) return;

    const start = mdInput.selectionStart;
    const end = mdInput.selectionEnd;
    const selected = mdInput.value.substring(start, end);
    let snippet = '';

    switch (tool) {
      case 'table':
        snippet = `\n| 比較項目 | 場景 A | 場景 B |\n| :--- | :--- | :--- |\n| 關鍵特徵 | 特徵 1 | 特徵 2 |\n| 生活工具 | 工具 1 | 工具 2 |\n\n`;
        break;
      case 'bold':
        snippet = selected ? `**${selected}**` : `**重要內容**`;
        break;
      case 'note':
        snippet = `\n> 💡 **核心重點歸納**：${selected || '請輸入重點解析與思考總結...'}\n\n`;
        break;
      case 'list':
        snippet = `\n- ${selected || '重點項目 1'}\n- 重點項目 2\n- 重點項目 3\n`;
        break;
      default:
        snippet = selected;
    }

    mdInput.value = mdInput.value.substring(0, start) + snippet + mdInput.value.substring(end);
    mdInput.focus();
    renderMarkdownPreview();
  }

  function copyComparePrompt() {
    const eraNames = (erasData && erasData.eras) ? erasData.eras.map(e => e.name).join(' | ') : '舊石器時代 | 新石器時代 | 金屬器時代';
    const prompt = `請為主題【${erasData ? erasData.appTitle : '教材主題'}】設計一個適用於國小五年級的 Markdown 生活比較總表。
請嚴格輸出合法的 Markdown 表格格式與重點引言，結構範例如下：

# 📊 各場景生活比較總表

| 比較項目 | ${eraNames} |
| :--- | :--- | :--- |
| 代表年代 | ... | ... |
| 居住方式 | ... | ... |
| 食物取得 | ... | ... |
| 主要工具 | ... | ... |
| 工藝技能 | ... | ... |

> 💡 **文化核心特質**：技術與技能具有深厚的「延續性」── 後來的文明在前人的智慧基礎上不斷發明與進步！`;

    copyToClipboard(prompt, '已複製 AI 比較表 Prompt！可直接貼至 ChatGPT / Claude 生成！');
  }

  // ================= 7.1 題庫批次匯入 (Batch Quiz) =================
  function openBatchQuizModal() {
    const era = getActiveEra();
    if (!era) return;
    document.getElementById('batch-quiz-era-name').textContent = era.name;
    const promptText = getQuizPrompt(era);
    document.getElementById('ai-quiz-prompt-text').textContent = promptText;
    document.getElementById('batch-quiz-raw-input').value = '';
    document.getElementById('batch-quiz-parse-count').textContent = '已識別 0 題';
    document.getElementById('modal-batch-quiz').classList.add('show');
  }

  function handleBatchQuizInput() {
    const text = document.getElementById('batch-quiz-raw-input').value;
    const questions = parseQuizBatchText(text);
    const countEl = document.getElementById('batch-quiz-parse-count');
    countEl.textContent = `已識別 ${questions.length} 題`;
    countEl.style.color = questions.length > 0 ? '#2e7d32' : '#888';
  }

  function confirmBatchQuizImport() {
    const era = getActiveEra();
    if (!era) return;
    const text = document.getElementById('batch-quiz-raw-input').value;
    const questions = parseQuizBatchText(text);
    if (questions.length === 0) {
      alert('未能識別出有效的題目內容！請檢查文字格式是否符合範例格式。');
      return;
    }

    const mode = document.querySelector('input[name="batch-quiz-mode"]:checked')?.value || 'append';
    if (!Array.isArray(era.quiz)) era.quiz = [];

    if (mode === 'replace') {
      era.quiz = questions;
    } else {
      era.quiz.push(...questions);
    }

    renderQuizList();
    document.getElementById('modal-batch-quiz').classList.remove('show');
    showToast(`✅ 已成功匯入 ${questions.length} 道題目至「${era.name}」！`);
  }

  function copyQuizPrompt() {
    const era = getActiveEra();
    const prompt = getQuizPrompt(era);
    copyToClipboard(prompt, `已複製「${era ? era.name : ''}」出題 Prompt！可貼至 AI 提問！`);
  }

  // ================= 6.1 線索批次匯入 (Batch Clues) =================
  function openBatchCluesModal() {
    const era = getActiveEra();
    if (!era) return;
    document.getElementById('batch-clues-era-name').textContent = era.name;
    const promptText = getCluesPrompt(era);
    document.getElementById('ai-clues-prompt-text').textContent = promptText;
    document.getElementById('batch-clues-raw-input').value = '';
    document.getElementById('batch-clues-parse-count').textContent = '已識別 0 個線索';
    document.getElementById('modal-batch-clues').classList.add('show');
  }

  function handleBatchCluesInput() {
    const text = document.getElementById('batch-clues-raw-input').value;
    const clues = parseCluesBatchText(text);
    const countEl = document.getElementById('batch-clues-parse-count');
    countEl.textContent = `已識別 ${clues.length} 個線索`;
    countEl.style.color = clues.length > 0 ? '#e65100' : '#888';
  }

  function confirmBatchCluesImport() {
    const era = getActiveEra();
    if (!era) return;
    const text = document.getElementById('batch-clues-raw-input').value;
    const rawClues = parseCluesBatchText(text);
    if (rawClues.length === 0) {
      alert('未能識別出有效的線索內容！請檢查格式是否包含圖示、標題與說明。');
      return;
    }

    const count = rawClues.length;
    const cluesWithCoords = rawClues.map((c, idx) => {
      let yaw, pitch;
      if (c.title && c.title.includes('生圖')) {
        yaw = 0;
        pitch = 0;
        c.isBonus = true;
      } else {
        yaw = Math.round(((idx * (360 / Math.max(count, 1))) - 180 + (Math.random() * 20 - 10)) * 10) / 10;
        pitch = Math.round((Math.random() * 30 - 15) * 10) / 10;
      }
      return {
        id: `clue-${Date.now()}-${idx + 1}`,
        yaw,
        pitch,
        icon: c.icon || '🔍',
        title: c.title || `新線索 ${idx + 1}`,
        text: c.text || '',
        isBonus: !!c.isBonus
      };
    });

    const mode = document.querySelector('input[name="batch-clues-mode"]:checked')?.value || 'append';
    if (!Array.isArray(era.hotspots)) era.hotspots = [];

    if (mode === 'replace') {
      era.hotspots = cluesWithCoords;
    } else {
      era.hotspots.push(...cluesWithCoords);
    }

    renderSidebarClues();
    initPannellumViewer();
    document.getElementById('modal-batch-clues').classList.remove('show');
    showToast(`✅ 已成功匯入 ${cluesWithCoords.length} 個線索！座標已自動分散，請點選微調。`);
  }

  function copyCluesPrompt() {
    const era = getActiveEra();
    const prompt = getCluesPrompt(era);
    copyToClipboard(prompt, `已複製「${era ? era.name : ''}」生活線索 Prompt！`);
  }

  // ================= 10. 全站 AI 教材生成器 (Master AI Generator) =================
  function openMasterAIModal() {
    document.getElementById('master-ai-prompt-text').textContent = getMasterAIPrompt();
    document.getElementById('master-ai-json-input').value = '';
    document.getElementById('master-ai-json-status').textContent = '等待貼入 JSON...';
    document.getElementById('master-ai-json-status').style.color = '#888';
    document.getElementById('modal-ai-master').classList.add('show');
  }

  function copyMasterAIPrompt() {
    const prompt = getMasterAIPrompt();
    copyToClipboard(prompt, '已複製全站 AI 生成 Prompt！請貼至 ChatGPT / Claude / Gemini 提問！');
  }

  function handleMasterAIJsonInput() {
    const input = document.getElementById('master-ai-json-input');
    const statusEl = document.getElementById('master-ai-json-status');
    let raw = input.value.trim();
    if (!raw) {
      statusEl.textContent = '等待貼入 JSON...';
      statusEl.style.color = '#888';
      return;
    }

    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.eras) && parsed.eras.length > 0) {
        const eraCount = parsed.eras.length;
        let totalClues = 0;
        let totalQuiz = 0;
        parsed.eras.forEach(e => {
          totalClues += (e.hotspots || []).length;
          totalQuiz += (e.quiz || []).length;
        });
        statusEl.textContent = `✅ JSON 格式正確！包含 ${eraCount} 個場景、${totalClues} 個線索、${totalQuiz} 題測驗`;
        statusEl.style.color = '#2e7d32';
      } else {
        statusEl.textContent = '⚠️ JSON 缺少 eras 場景陣列';
        statusEl.style.color = '#e65100';
      }
    } catch(e) {
      statusEl.textContent = `❌ JSON 格式錯誤：${e.message}`;
      statusEl.style.color = '#c62828';
    }
  }

  function applyMasterAIJson() {
    const input = document.getElementById('master-ai-json-input');
    let raw = input.value.trim();
    if (!raw) {
      alert('請先貼上 AI 生成的 JSON 代碼！');
      return;
    }

    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      alert(`JSON 解析失敗，請確認代碼是否完整無誤：\n${e.message}`);
      return;
    }

    if (!applyMasterAIPromptData(parsed)) {
      return;
    }

    document.getElementById('modal-ai-master').classList.remove('show');
    showToast(`🎉 全新教材「${erasData.appTitle}」已成功套用！請點擊右上角「💾 儲存並回存專案」進行存檔。`, 5000);
  }

  function applyMasterAIPromptData(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      alert('無效的 JSON 結構！');
      return false;
    }

    if (!Array.isArray(parsed.eras) || parsed.eras.length === 0) {
      alert('JSON 缺少有效的 eras 場景陣列！');
      return false;
    }

    parsed.appTitle = parsed.appTitle || '360° 互動探險';
    parsed.appSubtitle = parsed.appSubtitle || '自主學習大挑戰';
    parsed.brandTag = parsed.brandTag || '領域主題學習';
    parsed.homeBadge = parsed.homeBadge || '🌟 數位 360° 互動教材';
    parsed.homeDesc = parsed.homeDesc || '歡迎展開沉浸式 360° 探索學習！';
    parsed.startButtonText = parsed.startButtonText || '🚀 啟動探險';
    parsed.timelineTitle = parsed.timelineTitle || '⏱️ 探險進度儀表板';
    parsed.issuer = parsed.issuer || '校本教學團隊';
    parsed.certTitle = parsed.certTitle || `${parsed.appTitle} 探險家`;
    parsed.certSub = parsed.certSub || '🏆 闖 關 成 功 證 書 🏆';
    parsed.certTextLines = parsed.certTextLines || [
      `完成「${parsed.appTitle}」全關卡數位探索學習，`,
      '成功找齊所有關鍵探索線索，並全數通過關卡挑戰，',
      '表現優異，特頒發此證書，以資鼓勵！'
    ];

    parsed.eras.forEach((era, eIdx) => {
      era.id = era.id || `scene_${eIdx + 1}`;
      era.name = era.name || `場景 ${eIdx + 1}`;
      era.subtitle = era.subtitle || '';
      era.years = era.years || '';
      era.site = era.site || '';
      era.panorama = era.panorama || (erasData && erasData.eras[eIdx] ? erasData.eras[eIdx].panorama : 'img/pano/paleolithic.jpg');
      era.badge = era.badge || 'img/badges/paleolithic.png';
      era.badgeTitle = era.badgeTitle || `${era.name}小達人`;
      era.badgeEmoji = era.badgeEmoji || '🌟';
      era.intro = era.intro || `歡迎來到${era.name}！轉動 360° 全景畫面尋找生活線索吧！`;
      era.captainHint = era.captainHint || '轉動畫面看看四周，發光的圓點就是線索喔！';

      if (!Array.isArray(era.hotspots)) era.hotspots = [];
      const hCount = era.hotspots.length;
      era.hotspots.forEach((h, hIdx) => {
        h.id = h.id || `h-${era.id}-${hIdx + 1}`;
        h.icon = h.icon || '🔍';
        h.title = h.title || `線索 ${hIdx + 1}`;
        h.text = h.text || '';
        if (h.yaw === undefined || h.pitch === undefined) {
          if (h.title && h.title.includes('生圖')) {
            h.yaw = 0;
            h.pitch = 0;
            h.isBonus = true;
          } else {
            h.yaw = Math.round(((hIdx * (360 / Math.max(hCount, 1))) - 180 + (Math.random() * 20 - 10)) * 10) / 10;
            h.pitch = Math.round((Math.random() * 30 - 15) * 10) / 10;
          }
        }
      });

      if (!Array.isArray(era.quiz)) era.quiz = [];
      era.quiz.forEach((q, qIdx) => {
        q.q = q.q || `測驗第 ${qIdx + 1} 題`;
        q.options = Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 4) : ['選項A', '選項B', '選項C', '選項D'];
        while (q.options.length < 4) q.options.push('備用選項');
        q.answer = typeof q.answer === 'number' ? q.answer : 0;
        q.hint = q.hint || '';
        q.explain = q.explain || '';
      });
    });

    if (parsed.comparisonTable) {
      if (parsed.comparisonTable.markdown && window.MarkdownLite) {
        const extracted = window.MarkdownLite.extractTable(parsed.comparisonTable.markdown);
        if (extracted) {
          parsed.comparisonTable.headers = extracted.headers;
          parsed.comparisonTable.rows = extracted.rows;
        }
      }
    } else {
      parsed.comparisonTable = {
        title: `📊 ${parsed.appTitle} 各場景重點比較總表`,
        markdown: generateDefaultComparisonMarkdown(parsed)
      };
    }

    erasData = parsed;
    activeEraId = erasData.eras[0].id;

    document.querySelectorAll('.view-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === 'scene');
    });
    switchView('scene');

    renderAppHeaderTitle();
    renderSceneTabs();
    switchScene(activeEraId);
    populateGlobalSettingsForm();
    populateComparisonAndBoss();

    return true;
  }

  // ================= 11. AI Prompt 生成與文字解析核心函式 =================
  function getMasterAIPrompt() {
    return `你是一位專業的國小數位互動教材設計專家與 360° VR 虛擬實境專家。
請為主題【[在此填寫你想製作的主題，例如：太空八大行星探索 / 臺灣國家公園生態 / 世界古代文明 / 人體奧秘大冒險]】，設計一套適用於國小五年級學生的 360° 沉浸式互動學習教材完整內容。

【輸出核心要求】：
請直接輸出合法的 JSON 代碼區塊（\`\`\`json ... \`\`\`），格式完全符合以下結構規範，不得省略任何欄位：

{
  "appTitle": "教材大標題（例如：太空八大行星時光機）",
  "appSubtitle": "360° 沉浸式探索大挑戰",
  "brandTag": "領域與年級標籤（例如：自然五下・探索太陽系）",
  "homeBadge": "🌟 國小數位 360° 自主學習教材",
  "homeDesc": "生動親切的首頁情境引導故事（約 60~80 字，引導學生透過 360 全景轉動尋找線索並克服生存挑戰）",
  "startButtonText": "🚀 啟動探險機",
  "timelineTitle": "⏱️ 探險任務進度儀表板",
  "issuer": "頒發單位（例如：太空總署教學團隊）",
  "certTitle": "小小星際探險家",
  "certSub": "🏆 闖 關 成 功 證 書 🏆",
  "certTextLines": [
    "勇敢探索神秘浩瀚的太陽系各行星，",
    "透過細緻觀察發現各星球豐富環境線索，並全數克服生存挑戰，",
    "深刻理解天體運行與宇宙奧秘，展現卓越知能與勇氣，",
    "表現卓絕優異，特頒發此證書，以資鼓勵！"
  ],
  "eras": [
    {
      "id": "scene_1",
      "name": "第一站場景名稱",
      "subtitle": "場景特色副標",
      "years": "代表年代或距離",
      "site": "地點或環境特色",
      "badgeTitle": "過關榮譽徽章名稱",
      "badgeEmoji": "🚀",
      "intro": "進入關卡時小隊長熱情引導語（約 50 字）",
      "captainHint": "轉動畫面看看四周，發光的圓點就是生活線索喔！把線索全部找出來，才能挑戰生存任務！",
      "hotspots": [
        {
          "id": "c1",
          "icon": "🪐",
          "title": "探索線索 1 標題",
          "text": "線索 1 的趣味解說，用詞淺顯生動適合小學生。"
        },
        {
          "id": "c2",
          "icon": "🔭",
          "title": "探索線索 2 標題",
          "text": "線索 2 的解說。"
        },
        {
          "id": "c3",
          "icon": "✨",
          "title": "探索線索 3 標題",
          "text": "線索 3 的解說。"
        },
        {
          "id": "c4",
          "icon": "💡",
          "title": "探索線索 4 標題",
          "text": "線索 4 的解說。"
        },
        {
          "id": "pano-prompt-clue",
          "icon": "🎨",
          "title": "【360° 全景生圖 Prompt】（點此複製）",
          "text": "【360° 無失真全景生圖指引】\\n\\n💡 推薦生成工具：\\n1. **Blockade Labs Skybox AI** (skybox.blockadelabs.com)：專為 360 VR 打造，生成即是 100% 正確等距長方球體投影，無魚眼與比例失真！\\n2. **Midjourney v6** / **Flux** / **Stable Diffusion**：請複製下方專業防失真 Prompt（已嚴格指定平視置中地平線、真實人眼尺度、防微距與防魚眼排除詞）：\\n\\n📋 複製生圖提示詞：\\n\\n360-degree equirectangular projection of [此場景詳細英文環境視覺描述，包含開闊視野、地表環境、人物活動與生活器物], centered flat eye-level horizon line, horizontal eye-level camera perspective (pitch 0 degrees), realistic human-eye scale, natural environmental proportions, wide landscape vista, straight architectural and environmental perspective, standing in the center of the environment, main subjects at natural viewing distance 2 to 5 meters away, seamless 360x180 spherical VR panorama, ultra-photorealistic, 8k resolution, cinematic natural lighting --ar 2:1 --tile --style raw --no fisheye, curved horizon, dome distortion, circular frame, tiny planet, vignette, extreme macro, tilt-shift, distorted scale, bent perspective",
          "isBonus": true
        }
      ],
      "quiz": [
        {
          "q": "問答測驗第 1 題題目內容？",
          "options": ["正確選項A", "錯誤選項B", "錯誤選項C", "錯誤選項D"],
          "answer": 0,
          "hint": "提示文字",
          "explain": "解析說明"
        },
        {
          "q": "問答測驗第 2 題題目內容？",
          "options": ["錯誤選項A", "正確選項B", "錯誤選項C", "錯誤選項D"],
          "answer": 1,
          "hint": "提示文字",
          "explain": "解析說明"
        }
      ]
    }
  ],
  "comparisonTable": {
    "title": "📊 各場景綜合比較總表",
    "markdown": "# 📊 綜合生活比較總表\\n\\n| 比較項目 | 場景1 | 場景2 | 場景3 |\\n| :--- | :--- | :--- | :--- |\\n| 環境特徵 | 特徵A | 特徵B | 特徵C |\\n| 主要工具 | 工具A | 工具B | 工具C |\\n| 生存策略 | 策略A | 策略B | 策略C |\\n\\n> 💡 **核心重點歸納**：本單元的關鍵核心觀念總結..."
  },
  "finalBoss": {
    "q": "大魔王終極綜合挑戰問題？（考驗多個場景綜合概念）",
    "options": ["錯誤選項A", "正確選項B", "錯誤選項C", "錯誤選項D"],
    "answer": 1,
    "hint": "大魔王解題提示",
    "explain": "大魔王精彩詳解"
  }
}

【關鍵注意與 360° 生圖防失真規範（極為重要，務必嚴格執行）】：
1. 每個場景請設計 4~6 個線索，且【最後一個線索】務必使用圖示「🎨」，標題「【360° 全景生圖 Prompt】（點此複製）」，內容填入生成該場景 2:1 等距長方投影全景圖的專業英文 Prompt，並設 isBonus: true！
2. 【360° 全景圖防止人物與物件比例失真核心規則】：
   - **視角與地平線必須平視置中（防止魚眼弧形與碗狀變形）**：
     Prompt 中必須明確包含 \`centered flat eye-level horizon line, horizontal eye-level camera perspective (pitch 0 degrees)\`。地平線必須水平貫穿畫面垂直 50% 正中央，嚴禁仰角、俯視或弧形地平線，否則在 360 檢視器轉動時畫面會嚴重彎曲！
   - **嚴格維持真實人眼尺度與開闊距離（防止微距特寫與物件巨大化）**：
     Prompt 中必須明確包含 \`realistic human-eye scale, natural environmental proportions, wide landscape vista, standing in the center of the environment, main subjects at natural viewing distance 2 to 5 meters away\`。場景核心物件（如捕魚陷阱、營火、房舍、工具）必須自然融入環境並維持正常距離，**絕對嚴禁極近距離特寫（extreme close-up）或微距（macro）**，避免物件在 360 投影中膨脹成畸形巨物！
   - **等距長方投影專業關鍵字**：
     必須使用 \`360-degree equirectangular projection, seamless 360x180 spherical VR panorama\`。
   - **必備負向排除詞（Negative Prompts）**：
     提示詞結尾必須附帶 \`--no fisheye, curved horizon, dome distortion, circular frame, tiny planet, vignette, extreme macro, tilt-shift, distorted scale, bent perspective\`，徹底排除魚眼彎曲、球體圓頂與微距放大！
   - **長寬比與無縫參數**：
     必須標註 \`--ar 2:1 --tile --style raw\`，以符合 360 檢視器 2:1 比例與水平左右邊界無縫銜接。
3. 每個場景請設計 3~4 道選擇題，具備題目、4個選項、正確解答索引 0~3、提示與解析。
4. 比較總表請輸出完整的 Markdown 表格與 > 💡 核心重點提示。`;
  }

  function getQuizPrompt(era) {
    const eraName = era ? era.name : '當前關卡主題';
    const clueTitles = era && era.hotspots ? era.hotspots.map(h => h.title).join('、') : '';
    return `請以繁體中文（台灣），為國小五年級學生設計【${eraName}】的 3~5 道趣味探索選擇題。
參考本關卡場景中的生活線索：${clueTitles || '本時代的居住、食物、工具與社會生活'}。

每道題目請嚴格依照下列格式輸出，包含題目、4個選項、正確答案代號、提示與解析：

Q1: [題目內容，語氣親切活潑，符合國小五年級認知]
A) [選項A]
B) [選項B]
C) [選項C]
D) [選項D]
答案: [請填 A 或 B 或 C 或 D]
提示: [趣味小提示]
解析: [知識解析說明]

Q2: [題目內容]
...`;
  }

  function getCluesPrompt(era) {
    const eraName = era ? era.name : '當前關卡主題';
    return `請以繁體中文（台灣），為國小五年級學生設計【${eraName}】的 5~6 個 360° 全景探索生活線索。
請嚴格按照以下條列格式輸出，每個線索包含最貼切的 Emoji 圖示、吸睛標題、以及適合小學生的 1~2 句生動解說：

1. [🏠] 標題名稱：用淺顯生動的語句解說這個線索的生活背景（約 30~50 字）。
2. [🔥] 標題名稱：解說內容...
3. [🪨] 標題名稱：解說內容...
4. [🐟] 標題名稱：解說內容...
5. [🎨] 【360° 全景生圖 Prompt】：請在此填入生成本場景 2:1 等距長方無失真全景圖的專業英文 Prompt（嚴格遵守：地平線平視置中、真實人眼尺度 2~5公尺開闊視野、排除魚眼/微距/曲面）：
360-degree equirectangular projection of [此場景詳細英文環境視覺描述], centered flat eye-level horizon line, horizontal eye-level camera perspective (pitch 0 degrees), realistic human-eye scale, natural environmental proportions, wide landscape vista, straight environmental perspective, seamless 360x180 spherical VR panorama, ultra-photorealistic, 8k, cinematic lighting --ar 2:1 --tile --style raw --no fisheye, curved horizon, dome distortion, circular frame, tiny planet, vignette, extreme macro, tilt-shift, distorted scale`;
  }

  function parseQuizBatchText(text) {
    if (!text || !text.trim()) return [];
    const trimmed = text.trim();

    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.map(item => {
            let ans = item.answer !== undefined ? item.answer : 0;
            if (typeof ans === 'string') {
              const up = ans.toUpperCase();
              if (up === 'A') ans = 0;
              else if (up === 'B') ans = 1;
              else if (up === 'C') ans = 2;
              else if (up === 'D') ans = 3;
              else ans = parseInt(ans, 10) || 0;
            }
            return {
              q: item.q || item.question || '未命名題目',
              options: Array.isArray(item.options) ? item.options.slice(0, 4) : ['選項A', '選項B', '選項C', '選項D'],
              answer: ans,
              hint: item.hint || '',
              explain: item.explain || item.explanation || ''
            };
          });
        }
      } catch(e) {}
    }

    const blocks = trimmed.split(/(?:^|\n)(?=(?:Q\d+|第\s*\d+\s*題|題目\s*\d*)[：:\.、\s])/i);
    const questions = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      let qText = '';
      const options = [];
      let answer = 0;
      let hint = '';
      let explain = '';

      for (const line of lines) {
        if (/^(?:Q\d+|第\s*\d+\s*題|題目\s*\d*)[：:\.、\s]/i.test(line)) {
          qText = line.replace(/^(?:Q\d+|第\s*\d+\s*題|題目\s*\d*)[：:\.、\s]*/i, '').trim();
        } else if (/^[A-D][\.\)\s、]/i.test(line) || /^選項\s*[A-D][：:\.、\s]/i.test(line)) {
          const optText = line.replace(/^[A-D][\.\)\s、]\s*/i, '').replace(/^選項\s*[A-D][：:\.、\s]*/i, '').trim();
          options.push(optText);
        } else if (/^(?:答案|正解|解答)[：:\.、\s]/i.test(line)) {
          const ansMatch = line.match(/(?:答案|正解|解答)[：:\.、\s]*([A-D0-3])/i);
          if (ansMatch) {
            const letter = ansMatch[1].toUpperCase();
            if (letter === 'A') answer = 0;
            else if (letter === 'B') answer = 1;
            else if (letter === 'C') answer = 2;
            else if (letter === 'D') answer = 3;
            else answer = parseInt(letter, 10) || 0;
          }
        } else if (/^提示[：:\.、\s]/i.test(line)) {
          hint = line.replace(/^提示[：:\.、\s]*/i, '').trim();
        } else if (/^(?:解析|說明|詳解)[：:\.、\s]/i.test(line)) {
          explain = line.replace(/^(?:解析|說明|詳解)[：:\.、\s]*/i, '').trim();
        } else if (!qText) {
          qText = line;
        }
      }

      if (qText && options.length >= 2) {
        while (options.length < 4) options.push('備用選項');
        questions.push({ q: qText, options: options.slice(0, 4), answer, hint, explain });
      }
    }

    return questions;
  }

  function parseCluesBatchText(text) {
    if (!text || !text.trim()) return [];
    const trimmed = text.trim();

    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.map(item => ({
            icon: item.icon || '🔍',
            title: item.title || '新探索線索',
            text: item.text || item.desc || item.content || '線索詳細解說...',
            isBonus: !!item.isBonus
          }));
        }
      } catch(e) {}
    }

    const clues = [];
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const m1 = line.match(/^(?:\d+[\.、\s]*|[-*+]\s*)?(?:\[([^\]]+)\])?\s*([^：:\-—]+)[：:\-—]\s*(.+)$/);
      if (m1) {
        const icon = (m1[1] || '🔍').trim();
        const title = m1[2].trim();
        const desc = m1[3].trim();
        clues.push({ icon, title, text: desc, isBonus: title.includes('生圖') });
        continue;
      }

      const m2 = line.match(/^(?:\d+[\.、\s]*|[-*+]\s*)?\[([^\]]+)\]\s*(.+)$/);
      if (m2) {
        const icon = m2[1].trim();
        const rest = m2[2].trim();
        clues.push({ icon, title: rest, text: rest, isBonus: rest.includes('生圖') });
        continue;
      }
    }

    return clues;
  }

  async function copyToClipboard(text, successMsg = '已複製到剪貼簿！') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(`📋 ${successMsg}`);
        return true;
      }
    } catch(e) {}

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(`📋 ${successMsg}`);
    } catch(err) {
      alert('複製失敗，請手動全選複製。');
    }
    document.body.removeChild(ta);
  }

  // ================= 9. 全域設定與文案 (Global Texts) =================
  function populateGlobalSettingsForm() {
    if (!erasData) return;
    document.getElementById('cfg-app-title').value = erasData.appTitle || '';
    document.getElementById('cfg-app-subtitle').value = erasData.appSubtitle || '';
    document.getElementById('cfg-brand-tag').value = erasData.brandTag || '';
    document.getElementById('cfg-home-badge').value = erasData.homeBadge || '';
    document.getElementById('cfg-home-desc').value = erasData.homeDesc || '';
    document.getElementById('cfg-start-btn').value = erasData.startButtonText || '';
    document.getElementById('cfg-timeline-title').value = erasData.timelineTitle || '';
    document.getElementById('cfg-issuer').value = erasData.issuer || '';
    document.getElementById('cfg-cert-title').value = erasData.certTitle || '';
    document.getElementById('cfg-banner-title').value = erasData.certBannerTitle || '';
    document.getElementById('cfg-banner-desc').value = erasData.certBannerDesc || '';

    const lines = erasData.certTextLines || [];
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`cfg-cert-line-${i}`);
      if (el) el.value = lines[i - 1] || '';
    }
  }

  function bindGlobalSettingsInputs() {
    const bind = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          erasData[key] = el.value.trim();
          renderAppHeaderTitle();
        });
      }
    };

    bind('cfg-app-title', 'appTitle');
    bind('cfg-app-subtitle', 'appSubtitle');
    bind('cfg-brand-tag', 'brandTag');
    bind('cfg-home-badge', 'homeBadge');
    bind('cfg-home-desc', 'homeDesc');
    bind('cfg-start-btn', 'startButtonText');
    bind('cfg-timeline-title', 'timelineTitle');
    bind('cfg-issuer', 'issuer');
    bind('cfg-cert-title', 'certTitle');
    bind('cfg-banner-title', 'certBannerTitle');
    bind('cfg-banner-desc', 'certBannerDesc');

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`cfg-cert-line-${i}`);
      if (el) {
        el.addEventListener('change', () => {
          if (!erasData.certTextLines) erasData.certTextLines = [];
          erasData.certTextLines[i - 1] = el.value.trim();
        });
      }
    }
  }

  // ================= 10. 專案儲存、匯出與新建 (Project Actions) =================
  async function saveToProject() {
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.innerHTML = '⏳ 儲存中...';

    try {
      if (isServerConnected) {
        const resp = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(erasData)
        });
        const result = await resp.json();
        if (result.success) {
          showToast('🎉 設定已成功直接回存至 data/eras.json 與 data/eras.js！', 3500);
        } else {
          alert('回存失敗: ' + (result.error || '未知錯誤'));
        }
      } else {
        exportProjectJson();
        alert('目前處於純離線靜態模式，已為您自動下載更新後的 eras_config.json！\n請替換專案中的 data/eras.json 即可生效。');
      }
    } catch (e) {
      console.error(e);
      alert('無法連線至本地 Python 伺服器，已為您自動下載備份 JSON。');
      exportProjectJson();
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.innerHTML = '💾 儲存並回存專案';
    }
  }

  function exportProjectJson() {
    if (!erasData) return;
    if (!erasData.panoData) erasData.panoData = {};

    // 確保每筆時代都同步最新 Base64 dataUri 與 panoData
    if (Array.isArray(erasData.eras)) {
      erasData.eras.forEach(era => {
        const dUri = (era.dataUri && typeof era.dataUri === 'string' && era.dataUri.startsWith('data:image/'))
          ? era.dataUri
          : (window.PANO_DATA && window.PANO_DATA[era.id] && typeof window.PANO_DATA[era.id] === 'string' && window.PANO_DATA[era.id].startsWith('data:image/'))
            ? window.PANO_DATA[era.id]
            : (era.panorama && typeof era.panorama === 'string' && era.panorama.startsWith('data:image/'))
              ? era.panorama
              : null;
        if (dUri) {
          era.dataUri = dUri;
          erasData.panoData[era.id] = dUri;
        }
      });
    }

    const filename = `${(erasData.appTitle || '360探險教材').replace(/\s+/g, '_')}_設定檔.json`;
    const blob = new Blob([JSON.stringify(erasData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
    showToast(`📥 已成功匯出設定檔：${filename}`);
  }

  function handleImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.eras || !Array.isArray(imported.eras)) {
          alert('匯入的 JSON 檔案格式不符合規範（缺少 eras 場景陣列）！');
          return;
        }

        // 1. 同步與補全記憶體中的 PANO_DATA
        if (!window.PANO_DATA) window.PANO_DATA = {};
        if (imported.panoData && typeof imported.panoData === 'object') {
          Object.assign(window.PANO_DATA, imported.panoData);
        }

        imported.eras.forEach(era => {
          if (era.dataUri && typeof era.dataUri === 'string' && era.dataUri.startsWith('data:image/')) {
            window.PANO_DATA[era.id] = era.dataUri;
          } else if (era.panorama && typeof era.panorama === 'string' && era.panorama.startsWith('data:image/')) {
            era.dataUri = era.panorama;
            window.PANO_DATA[era.id] = era.panorama;
          } else if (window.PANO_DATA[era.id]) {
            era.dataUri = window.PANO_DATA[era.id];
          }
        });

        erasData = imported;
        ensureDataSchema(erasData);
        activeEraId = erasData.eras[0].id;

        // 2. 切換導覽按鈕至 View 1 (場景與線索)
        document.querySelectorAll('.view-tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.view === 'scene');
        });
        switchView('scene');

        renderAppHeaderTitle();
        renderSceneTabs();
        switchScene(activeEraId);
        populateGlobalSettingsForm();
        populateComparisonAndBoss();

        // 3. 若有連線至伺服器，將匯入的圖片非同步上傳至後端以同步伺服器檔案
        if (isServerConnected) {
          syncImportedImagesToServer(imported.eras);
        }

        showToast('🎉 成功匯入教材主題設定！');
      } catch (err) {
        alert('解析 JSON 檔案失敗：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function syncImportedImagesToServer(eras) {
    if (!isServerConnected || !Array.isArray(eras)) return;
    for (const era of eras) {
      const dUri = era.dataUri || (era.panorama && typeof era.panorama === 'string' && era.panorama.startsWith('data:image/') ? era.panorama : null);
      if (dUri && typeof dUri === 'string' && dUri.startsWith('data:image/')) {
        try {
          const resp = await fetch('/api/upload_pano', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eraId: era.id, dataBase64: dUri, fileName: `${era.id}.jpg` })
          });
          const res = await resp.json();
          if (res.success) {
            era.panorama = res.path;
            console.log(`[自動同步] 場景 ${era.id} 全景圖已成功回存伺服器: ${res.path}`);
          }
        } catch (err) {
          console.warn(`[自動同步] 場景 ${era.id} 上傳失敗:`, err);
        }
      }
    }
  }

  // 匯出單檔獨立離線學生版 HTML (All-in-One Standalone HTML)
  async function exportStandalonePackage() {
    exportStandaloneBtn.disabled = true;
    exportStandaloneBtn.innerHTML = '⏳ 打包生成中...';

    const filename = `${(erasData.appTitle || '360探險教材').replace(/\s+/g, '_')}_學生獨立版.html`;

    // 優先使用後端 API
    if (isServerConnected) {
      try {
        const resp = await fetch('/api/export_standalone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ erasData })
        });
        const res = await resp.json();
        if (res.success && res.html) {
          triggerDownload(res.html, filename);
          showToast(`📦 成功匯出單檔獨立學生版 HTML！`);
          exportStandaloneBtn.disabled = false;
          exportStandaloneBtn.innerHTML = '📦 匯出學生獨立版';
          return;
        }
      } catch (e) {
        console.warn('後端獨立打包呼叫失敗，啟用前端內聯打包器', e);
      }
    }

    // 前端一體化完整打包（純前端靜態模式 / GitHub Pages 專用，免 Python 伺服器）
    try {
      // 1. 同時載入 index.html、樣式表與所有模組腳本
      const [indexHtml, pCss, sCss, panoJs, certJs, pJs, mdJs, stJs, auJs, vwJs, qzJs, cfJs, apJs] = await Promise.all([
        fetch('index.html').then(r => r.text()),
        fetch('css/pannellum.css').then(r => r.text()),
        fetch('css/style.css').then(r => r.text()),
        fetch('data/pano_data.js').then(r => r.text()).catch(() => ''),
        fetch('data/cert_data.js').then(r => r.text()).catch(() => ''),
        fetch('js/pannellum.js').then(r => r.text()),
        fetch('js/markdown.js').then(r => r.text()),
        fetch('js/storage.js').then(r => r.text()),
        fetch('js/audio.js').then(r => r.text()),
        fetch('js/viewer.js').then(r => r.text()),
        fetch('js/quiz.js').then(r => r.text()),
        fetch('js/certificate.js').then(r => r.text()),
        fetch('js/app.js').then(r => r.text())
      ]);

      let html = indexHtml;

      // 2. 替換 CSS 為內聯嵌入
      const cssBundle = `<style>\n/* pannellum.css */\n${pCss}\n/* style.css */\n${sCss}\n</style>`;
      html = html.replace('<link rel="stylesheet" href="css/pannellum.css">', '');
      html = html.replace('<link rel="stylesheet" href="css/style.css">', cssBundle);

      // 3. 處理全景資料：若有新上傳圖片，確保寫入 PANO_DATA
      const panoDataMerged = Object.assign({}, window.PANO_DATA || {});
      if (Array.isArray(erasData.eras)) {
        erasData.eras.forEach(era => {
          if (era.dataUri && typeof era.dataUri === 'string' && era.dataUri.startsWith('data:image/')) {
            panoDataMerged[era.id] = era.dataUri;
          }
        });
      }
      const panoDataStr = `window.PANO_DATA = ${JSON.stringify(panoDataMerged, null, 2)};`;

      // 4. 處理證書資料
      const certDataStr = `window.CERT_ASSETS = ${JSON.stringify(window.CERT_ASSETS || {}, null, 2)};`;

      // 5. 處理 erasData
      const erasDataStr = `window.ERAS_DATA = ${JSON.stringify(erasData, null, 2)};`;

      // 6. 打包所有 JS 為內聯一體化腳本
      const jsBundle = `
<script>
${pJs}
</script>
<script>
${erasDataStr}
</script>
<script>
${panoDataStr}
</script>
<script>
${certDataStr}
</script>
<script>
${mdJs}
</script>
<script>
${stJs}
</script>
<script>
${auJs}
</script>
<script>
${vwJs}
</script>
<script>
${qzJs}
</script>
<script>
${cfJs}
</script>
<script>
${apJs}
</script>
`;

      html = html.replace('<script src="js/pannellum.js"></script>', '');
      html = html.replace('<script src="data/eras.js"></script>', '');
      html = html.replace('<script src="data/pano_data.js"></script>', '');
      html = html.replace('<script src="data/cert_data.js"></script>', '');
      html = html.replace('<script src="js/markdown.js"></script>', '');
      html = html.replace('<script src="js/storage.js"></script>', '');
      html = html.replace('<script src="js/audio.js"></script>', '');
      html = html.replace('<script src="js/viewer.js"></script>', '');
      html = html.replace('<script src="js/quiz.js"></script>', '');
      html = html.replace('<script src="js/certificate.js"></script>', '');
      html = html.replace('<script src="js/app.js"></script>', jsBundle);

      // 7. 替換吉祥物隊長圖示與預設徽章為 Base64（免破圖）
      if (window.CERT_ASSETS && window.CERT_ASSETS.mascot) {
        html = html.replace(/src="img\/mascot\.png"/g, `src="${window.CERT_ASSETS.mascot}"`);
      }
      if (window.CERT_ASSETS && window.CERT_ASSETS.paleolithic) {
        html = html.replace(/src="img\/badges\/paleolithic\.png"/g, `src="${window.CERT_ASSETS.paleolithic}"`);
      }

      triggerDownload(html, filename);
      showToast(`📦 成功匯出單檔獨立學生版 HTML！`);
    } catch (err) {
      alert('純前端打包失敗：' + err.message);
    } finally {
      exportStandaloneBtn.disabled = false;
      exportStandaloneBtn.innerHTML = '📦 匯出學生獨立版';
    }
  }

  function triggerDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function createNewThemeTemplate() {
    const themeName = prompt('請輸入新教材主題名稱（例如：太陽系宇宙大探索、臺灣國家公園巡禮）：', '新主題探索大挑戰');
    if (!themeName) return;

    if (!confirm('建立新主題將清空目前的場景與題庫，開始打造全新教材。\n是否確定繼續？（建議先點擊「📥 匯出」備份當前專案）')) {
      return;
    }

    erasData = {
      appTitle: themeName,
      appSubtitle: '360° 沉浸式互動探險',
      brandTag: '主題學習・自主探索教材',
      homeBadge: '🌟 數位 360° 自主學習教材',
      homeDesc: `歡迎加入「${themeName}」！轉動 360° 全景畫面尋找關鍵線索，克服生存挑戰，領取榮譽探險家證書！`,
      startButtonText: '🚀 啟動探索之旅',
      timelineTitle: '⏱️ 探索任務進度儀表板',
      certBannerTitle: '🎉 恭喜完成全關卡探索任務！',
      certBannerDesc: '你已經通過所有考驗，快前往領取專屬榮譽證書！',
      issuer: '校本特色課程 數位學習研發團隊',
      certTitle: `${themeName} 小達人`,
      certSub: '🏆  闖  關  成  功  證  書  🏆',
      certTextLines: [
        `認真參與「${themeName}」數位沉浸式探索學習，`,
        '透過細緻觀察與思考，成功找齊所有關鍵探索線索，',
        '並在各關卡評量挑戰中展現卓越知能與敏銳洞察力，',
        '表現優異，特頒此證書，以資鼓勵！'
      ],
      comparisonTable: {
        title: `📊 ${themeName} 各場景重點比較總表`,
        headers: ['比較項目', '第一站場景', '第二站場景'],
        rows: [
          ['環境特色', '請輸入特色一', '請輸入特色二'],
          ['關鍵發現', '請輸入發現一', '請輸入發現二'],
          ['核心價值', `💡 透過多元場景對比，深入體會${themeName}的迷人之處！`]
        ]
      },
      eras: [
        {
          id: 'stage_1',
          name: '第一探索站',
          subtitle: '核心探索場景',
          years: '場景簡介說明',
          site: '探索地點 1',
          panorama: 'img/pano/paleolithic.jpg',
          badge: 'img/badges/paleolithic.png',
          badgeTitle: '探索小先鋒',
          badgeEmoji: '🚀',
          intro: '歡迎來到第一探索站！轉動 360° 全景畫面尋找線索吧！',
          captainHint: '轉動畫面看看四周，發光的圓點就是生活線索喔！',
          hotspots: [
            {
              id: 'stage1-c1',
              yaw: 0,
              pitch: 0,
              icon: '🔍',
              title: '探索線索一',
              text: '在此輸入本線索的圖文解說內容。'
            }
          ],
          quiz: [
            {
              q: '請問本場景最重要的核心知識是什麼？',
              options: ['正確描述答案', '錯誤選項B', '錯誤選項C', '錯誤選項D'],
              answer: 0,
              hint: '看看周遭發光的線索提示！',
              explain: '答對了！'
            }
          ]
        }
      ],
      finalBoss: {
        q: `【終極榮譽試煉】完成「${themeName}」的各站探索後，你認為本次探險最重要的收穫是什麼？`,
        options: ['觀察與實踐中學習到的整合知識', '只記得按鈕的位置', '沒有任何收穫', '快速猜題拿到證書'],
        answer: 0,
        hint: '想想看這趟旅程帶給你的滿滿收穫！',
        explain: '恭喜完全正確！帶著這份探索的精神，繼續邁向下一個學習挑戰吧！'
      }
    };

    activeEraId = 'stage_1';
    renderAppHeaderTitle();
    renderSceneTabs();
    switchScene(activeEraId);
    populateGlobalSettingsForm();
    populateComparisonAndBoss();
    showToast(`✨ 已成功建立全新主題範本「${themeName}」！`);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
