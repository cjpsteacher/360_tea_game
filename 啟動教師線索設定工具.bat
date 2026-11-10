@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title 360° 互動教材創作與設定工具 - 教師端工作台
cd /d "%~dp0"

echo ========================================================
echo   360° 互動教材創作與設定工具 ── 教師端工作台
echo   功能：全域文案、360場景/線索熱點、關卡題庫、獨立單檔HTML匯出
echo ========================================================
echo.

rem ------------------------------------------------------
rem 1. 尋找系統中真實、可用的 Python（優先使用 py 啟動器）
rem    Windows 內建的虛擬 python.exe / python3.exe 捷徑只會跳出微軟商店，
rem    因此每個候選執行檔都必須實際執行指令驗證。
rem ------------------------------------------------------
set "PYEXE="

where py >nul 2>nul
if %errorlevel% equ 0 (
    set "PROBE="
    for /f "delims=" %%P in ('py -c "print(1)" 2^>nul') do set "PROBE=%%P"
    if "!PROBE!"=="1" set "PYEXE=py"
)

if "!PYEXE!"=="" (
    where python >nul 2>nul
    if !errorlevel! equ 0 (
        set "PROBE="
        for /f "delims=" %%P in ('python -c "print(1)" 2^>nul') do set "PROBE=%%P"
        if "!PROBE!"=="1" set "PYEXE=python"
    )
)

rem ------------------------------------------------------
rem 1b. 排除微軟商店 (WindowsApps) 的沙盒版 Python
rem     該版本權限受限，無法順利使用 pip 安裝相依套件。
rem ------------------------------------------------------
set "RESOLVED_PY="
if not "!PYEXE!"=="" (
    for /f "delims=" %%P in ('%PYEXE% -c "import sys;print(sys.executable)" 2^>nul') do set "RESOLVED_PY=%%P"
    echo !RESOLVED_PY! | findstr /I "WindowsApps" >nul 2>nul
    if !errorlevel! equ 0 (
        echo [INFO] 偵測到微軟商店 (Microsoft Store) 的 Python 沙盒捷徑：
        echo   !RESOLVED_PY!
        echo 該版本因沙盒限制無法正常安裝與管理 pip 套件。
        echo 系統將為您自動安裝官方正式版 Python...
        echo.
        set "PYEXE="
    )
)

rem ------------------------------------------------------
rem 1c. 未找到可用 Python ── 自動引導下載並安裝
rem     優先使用 winget；若無 winget 則自動下載官方安裝檔進行靜默安裝。
rem ------------------------------------------------------
if "!PYEXE!"=="" (
    echo [INFO] 尚未偵測到可用的 Python 環境，正在嘗試自動安裝...
    echo.
    set "INSTALL_OK=0"

    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo 正在透過 winget 安裝 Python 3.12，請稍候（需連上網際網路）...
        winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! equ 0 set "INSTALL_OK=1"
    ) else (
        echo [INFO] 本機未支援 winget 指令。
    )

    if "!INSTALL_OK!"=="0" (
        echo [INFO] 改為直接下載 python.org 官方安裝檔（需連上網際網路）...
        set "PYSETUP=%TEMP%\python-installer.exe"
        if exist "!PYSETUP!" del /f /q "!PYSETUP!" >nul 2>nul
        where curl >nul 2>nul
        if !errorlevel! equ 0 (
            curl -sSL -o "!PYSETUP!" https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe
        ) else (
            powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' -OutFile '!PYSETUP!' } catch { exit 1 }"
        )
        if exist "!PYSETUP!" (
            echo 正在安裝 Python（使用者個人目錄安裝，不需系統管理員權限）...
            "!PYSETUP!" /quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_pip=1 Include_test=0
            if !errorlevel! equ 0 set "INSTALL_OK=1"
            del /f /q "!PYSETUP!" >nul 2>nul
        ) else (
            echo [INFO] 直接下載失敗，可能是網路或防火牆連線受阻。
        )
    )

    if "!INSTALL_OK!"=="0" (
        echo.
        echo [ERROR] 自動安裝 Python 失敗。請前往官方網站手動下載並安裝：
        echo https://www.python.org/downloads/
        echo ★ 重要：安裝時請務必勾選「Add python.exe to PATH」與「pip」！
        echo 安裝完成後，請重新執行此啟動檔。
        echo.
        pause
        exit /b 1
    )

    echo.
    echo [完成] Python 已安裝完成！
    echo 請關閉此視窗，並重新雙擊執行此啟動程式。
    echo （重新開啟是為了讓 Windows 載入最新的 PATH 環境變數）
    echo.
    pause
    exit /b 0
)

echo [OK] 偵測到 Python 環境：
%PYEXE% --version
echo.

rem ------------------------------------------------------
rem 2. 確認 pip 套件管理員是否就緒（若缺少則自動修復）
rem ------------------------------------------------------
set "PIP_OK=0"
%PYEXE% -m pip --version >nul 2>nul
if %errorlevel% equ 0 (
    set "PIP_OK=1"
) else (
    echo [INFO] 未偵測到 pip，正在透過 ensurepip 自動修復...
    %PYEXE% -m ensurepip --upgrade --default-pip
    %PYEXE% -m pip --version >nul 2>nul
    if !errorlevel! equ 0 (
        set "PIP_OK=1"
    )
)

if "!PIP_OK!"=="0" (
    echo [INFO] ensurepip 無法安裝 pip，改由網路下載 get-pip.py...
    set "GETPIP=%TEMP%\get-pip.py"
    if exist "!GETPIP!" del /f /q "!GETPIP!" >nul 2>nul
    where curl >nul 2>nul
    if !errorlevel! equ 0 (
        curl -sSL -o "!GETPIP!" https://bootstrap.pypa.io/get-pip.py
    ) else (
        powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '!GETPIP!' } catch { exit 1 }"
    )
    if exist "!GETPIP!" (
        %PYEXE% "!GETPIP!"
        %PYEXE% -m pip --version >nul 2>nul
        if !errorlevel! equ 0 set "PIP_OK=1"
    )
)

if "!PIP_OK!"=="0" (
    echo.
    echo [ERROR] 無法為此 Python 環境安裝 pip。
    if defined RESOLVED_PY echo   (!RESOLVED_PY!)
    echo 請至 https://www.python.org/downloads/ 重新安裝官方版本，
    echo 並確保勾選「pip」與「Add python.exe to PATH」。
    echo.
    pause
    exit /b 1
)
echo [OK] pip 套件管理員已就緒。
echo.

rem ------------------------------------------------------
rem 3. 檢查所需 Python 套件（Pillow 全景圖片/素材處理），缺少則自動安裝
rem ------------------------------------------------------
set "PKGS=Pillow"
set "IMPORTS=import PIL"
echo [CHECK] 檢查必要套件 (%PKGS%)...
%PYEXE% -c "%IMPORTS%" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INSTALL] 偵測到缺少必要套件，正在透過 pip 安裝 (%PKGS%)...
    %PYEXE% -m pip install %PKGS%
    %PYEXE% -c "%IMPORTS%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] 預設安裝未完成，改用 --user 模式重試（個人設定檔，不需管理員權限）...
        %PYEXE% -m pip install --user %PKGS%
    )
    %PYEXE% -c "%IMPORTS%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] 套件安裝失敗。請檢查網路連線或防火牆設定。
        echo 您也可以手動執行以下指令安裝：
        echo   %PYEXE% -m pip install --user %PKGS%
        echo.
        pause
        exit /b 1
    )
    echo [DONE] 套件安裝完成！
) else (
    echo [OK] 所有必要套件皆已就緒。
)
echo.

rem ------------------------------------------------------
rem 4. 啟動 teacher_editor.py 本機伺服器
rem ------------------------------------------------------
if not exist "%~dp0teacher_editor.py" (
    echo.
    echo [ERROR] 找不到 teacher_editor.py 檔案！
    echo 請確認本批次檔與 teacher_editor.py 放在同一個專案資料夾中。
    echo.
    pause
    exit /b 1
)

echo ========================================================
echo   正在啟動 360° 教師編輯器本機伺服器...
echo   （伺服器啟動後將自動為您開啟瀏覽器編輯頁面）
echo   ※ 如欲關閉伺服器，請直接關閉此視窗或按下 Ctrl + C
echo ========================================================
echo.

%PYEXE% teacher_editor.py

echo.
echo [INFO] 教師設定工具已關閉。
pause
exit /b 0
