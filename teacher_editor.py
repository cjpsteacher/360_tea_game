#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
史前臺灣 360° 時光探險 - 教師線索位置視覺化設定工具伺服器
提供本機 HTTP 伺服器與 API，讓教師在 360° 畫面上點選校正熱點並直接回存至專案設定
"""

import os
import sys
import json
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from sync_pano import sync_panos, sync_cert_assets

PORT = 8088
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ERAS_JSON_PATH = os.path.join(BASE_DIR, "data", "eras.json")
ERAS_JS_PATH = os.path.join(BASE_DIR, "data", "eras.js")

class TeacherEditorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        # 根目錄重定向至 editor.html
        if self.path == "/" or self.path == "":
            self.send_response(302)
            self.send_header("Location", "/editor.html")
            self.end_headers()
            return

        # API: 讀取最新時代與線索資料
        if self.path == "/api/eras":
            try:
                with open(ERAS_JSON_PATH, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except Exception as e:
                self.send_error(500, f"Error reading eras.json: {str(e)}")
            return

        super().do_GET()

    def do_POST(self):
        # API: 回存更新後的線索座標至 eras.json 與 eras.js
        if self.path == "/api/save":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode("utf-8"))

                # 讀取原本的完整資料（保留 issuer, quiz, finalBoss 等其他內容）
                with open(ERAS_JSON_PATH, "r", encoding="utf-8") as f:
                    full_data = json.load(f)

                # 依據傳入的時代更新 hotspots
                # payload 格式範例: { "paleolithic": [ { "id": "p-cave", "yaw": 10, "pitch": -5 }, ... ] }
                # 或是完整更新後的 eras 陣列
                if "updatedHotspots" in payload:
                    hotspots_map = payload["updatedHotspots"]
                    for era in full_data.get("eras", []):
                        era_id = era.get("id")
                        if era_id in hotspots_map:
                            new_coords = {h["id"]: (round(float(h["yaw"]), 1), round(float(h["pitch"]), 1)) for h in hotspots_map[era_id]}
                            for h in era.get("hotspots", []):
                                if h.get("id") in new_coords:
                                    h["yaw"], h["pitch"] = new_coords[h["id"]]

                elif "eras" in payload:
                    full_data = payload

                # 自動檢查是否有嵌入 Base64 的全景圖，抽取儲存至 img/pano/ 並清理 eras.json 體積
                pano_dir = os.path.join(BASE_DIR, "img", "pano")
                os.makedirs(pano_dir, exist_ok=True)
                for era in full_data.get("eras", []):
                    era_id = era.get("id", "").strip()
                    if not era_id:
                        continue
                    d_uri = era.get("dataUri") or ""
                    pano_val = era.get("panorama") or ""
                    b64_str = ""
                    if isinstance(d_uri, str) and d_uri.startswith("data:image/"):
                        b64_str = d_uri
                    elif isinstance(pano_val, str) and pano_val.startswith("data:image/"):
                        b64_str = pano_val
                    
                    if b64_str and "," in b64_str:
                        try:
                            raw_b64 = b64_str.split(",", 1)[1]
                            import base64
                            import io
                            from PIL import Image
                            raw_bytes = base64.b64decode(raw_b64)
                            img = Image.open(io.BytesIO(raw_bytes))
                            dest_path = os.path.join(pano_dir, f"{era_id}.jpg")
                            img.convert("RGB").save(dest_path, "JPEG", quality=90)
                            era["panorama"] = f"img/pano/{era_id}.jpg"
                            if "dataUri" in era:
                                del era["dataUri"]
                            print(f">> [自動存圖] 已自設定回存全景圖: {dest_path}")
                        except Exception as img_err:
                            print(f">> [存圖警告] 場景 {era_id} 抽取全景圖失敗: {img_err}")

                # 1. 寫回 data/eras.json (排版整齊)
                with open(ERAS_JSON_PATH, "w", encoding="utf-8") as f:
                    json.dump(full_data, f, ensure_ascii=False, indent=2)

                # 2. 同步寫回 data/eras.js (供 file:/// 本地直接執行)
                js_content = f"// 史前臺灣 360° 時光探險 - 時代資料與題庫\n// 由教師線索設定工具自動回存更新\nwindow.ERAS_DATA = {json.dumps(full_data, ensure_ascii=False, indent=2)};\n"
                with open(ERAS_JS_PATH, "w", encoding="utf-8") as f:
                    f.write(js_content)

                # 自動同步全景圖與證書素材
                try:
                    sync_panos()
                    sync_cert_assets()
                except Exception as sync_e:
                    print(f"同步全景圖與素材警告: {sync_e}")

                # 回應成功訊息
                resp = {
                    "success": True,
                    "message": "教材設定已成功回存至 data/eras.json 與 data/eras.js！"
                }
                resp_bytes = json.dumps(resp, ensure_ascii=False).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
                print(">> [成功] 已成功回存教材設定至 data/eras.json 與 data/eras.js")

            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(err_resp)
                print(f">> [錯誤] 回存失敗: {e}")
            return

        # API: 上傳新全景圖取代原有圖
        if self.path == "/api/upload_pano":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode("utf-8"))

                era_id = payload.get("eraId", "").strip()
                b64_data = payload.get("dataBase64", "")
                if not era_id or not b64_data:
                    raise ValueError("缺少 eraId 或 dataBase64 圖片資料")

                if "," in b64_data:
                    b64_data = b64_data.split(",", 1)[1]

                import base64
                import io
                from PIL import Image

                raw_bytes = base64.b64decode(b64_data)
                img = Image.open(io.BytesIO(raw_bytes))

                pano_dir = os.path.join(BASE_DIR, "img", "pano")
                os.makedirs(pano_dir, exist_ok=True)
                dest_path = os.path.join(pano_dir, f"{era_id}.jpg")

                # 儲存高畫質等距長方投影 JPG
                img.convert("RGB").save(dest_path, "JPEG", quality=90)
                print(f">> [上傳成功] 全景圖已存入: {dest_path} ({os.path.getsize(dest_path)} bytes)")

                # 同步更新 data/pano_data.js
                sync_panos()

                # 回傳新圖片路徑與 DataURI
                with open(dest_path, "rb") as f:
                    new_b64 = base64.b64encode(f.read()).decode("ascii")

                resp = {
                    "success": True,
                    "path": f"img/pano/{era_id}.jpg",
                    "dataUri": f"data:image/jpeg;base64,{new_b64}"
                }
                resp_bytes = json.dumps(resp, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(err_resp)
                print(f">> [上傳錯誤]: {e}")
            return

        # API: 匯出獨立單檔學生版 HTML
        if self.path == "/api/export_standalone":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"
                payload = json.loads(post_data.decode("utf-8")) if post_data else {}

                # 優先使用傳入的最新資料，若無則讀取 data/eras.json
                eras_data = payload.get("erasData")
                if not eras_data:
                    with open(ERAS_JSON_PATH, "r", encoding="utf-8") as f:
                        eras_data = json.load(f)

                standalone_html = self.generate_standalone_html(eras_data)

                # 另存一份到 dist/
                dist_dir = os.path.join(BASE_DIR, "dist")
                os.makedirs(dist_dir, exist_ok=True)
                title = eras_data.get("appTitle", "360探險教材").replace(" ", "_")
                dest_file = os.path.join(dist_dir, f"{title}_學生獨立版.html")
                with open(dest_file, "w", encoding="utf-8") as f:
                    f.write(standalone_html)
                print(f">> [匯出成功] 已產生獨立版學生教材: {dest_file} ({os.path.getsize(dest_file)} bytes)")

                resp = {
                    "success": True,
                    "filename": f"{title}_學生獨立版.html",
                    "html": standalone_html,
                    "savedPath": dest_file
                }
                resp_bytes = json.dumps(resp, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(err_resp)
                print(f">> [匯出錯誤]: {e}")
            return

        self.send_error(404, "Endpoint not found")

    def generate_standalone_html(self, eras_data):
        import re
        import copy
        import base64

        # 複製一份 eras_data 避免污染原始參照
        eras_data_copy = copy.deepcopy(eras_data)

        # 讀取 index.html
        with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
            html = f.read()

        # 1. 內嵌隊長吉祥物圖片為 Base64（避免離線單檔在 dist/ 或其他電腦時找不到 img/mascot.png 導致破圖）
        mascot_path = os.path.join(BASE_DIR, "img", "mascot.png")
        if os.path.exists(mascot_path):
            try:
                with open(mascot_path, "rb") as mf:
                    mascot_b64 = "data:image/png;base64," + base64.b64encode(mf.read()).decode("ascii")
                html = html.replace('src="img/mascot.png"', f'src="{mascot_b64}"')
                print(f">> [獨立版打包] 已將首頁與引導隊長圖示 (mascot.png) 成功轉為內聯 Base64！")
            except Exception as me:
                print(f">> [警告] 內嵌吉祥物圖示失敗: {me}")

        # 2. 內嵌預設徽章圖示為 Base64
        paleo_badge = os.path.join(BASE_DIR, "img", "badges", "paleolithic.png")
        if os.path.exists(paleo_badge):
            try:
                with open(paleo_badge, "rb") as bf:
                    badge_b64 = "data:image/png;base64," + base64.b64encode(bf.read()).decode("ascii")
                html = html.replace('src="img/badges/paleolithic.png"', f'src="{badge_b64}"')
            except Exception:
                pass

        # 3. 將 eras_data 中各時代的徽章圖片轉為 Base64 DataURI
        for era in eras_data_copy.get("eras", []):
            b_path = era.get("badge", "")
            if b_path and isinstance(b_path, str) and not b_path.startswith("data:"):
                full_b_path = os.path.join(BASE_DIR, b_path.replace("/", os.sep))
                if os.path.exists(full_b_path):
                    try:
                        with open(full_b_path, "rb") as f_badge:
                            b_mime = "image/png" if full_b_path.lower().endswith(".png") else "image/jpeg"
                            era["badge"] = f"data:{b_mime};base64," + base64.b64encode(f_badge.read()).decode("ascii")
                    except Exception:
                        pass

        # 讀取 css/pannellum.css & css/style.css
        with open(os.path.join(BASE_DIR, "css", "pannellum.css"), "r", encoding="utf-8") as f:
            p_css = f.read()
        with open(os.path.join(BASE_DIR, "css", "style.css"), "r", encoding="utf-8") as f:
            s_css = f.read()

        # 讀取 data/pano_data.js & data/cert_data.js
        with open(os.path.join(BASE_DIR, "data", "pano_data.js"), "r", encoding="utf-8") as f:
            pano_js = f.read()
        with open(os.path.join(BASE_DIR, "data", "cert_data.js"), "r", encoding="utf-8") as f:
            cert_js = f.read()

        # 讀取 js 檔案
        scripts = ["pannellum.js", "markdown.js", "storage.js", "audio.js", "viewer.js", "quiz.js", "certificate.js", "app.js"]
        scripts_content = {}
        for s in scripts:
            with open(os.path.join(BASE_DIR, "js", s), "r", encoding="utf-8") as f:
                scripts_content[s] = f.read()

        # 替換 CSS
        css_bundle = f"<style>\n/* pannellum.css */\n{p_css}\n/* style.css */\n{s_css}\n</style>"
        html = html.replace('<link rel="stylesheet" href="css/pannellum.css">', '')
        html = html.replace('<link rel="stylesheet" href="css/style.css">', css_bundle)

        # 替換 JS 為內聯一體化腳本
        eras_inline_js = f"window.ERAS_DATA = {json.dumps(eras_data_copy, ensure_ascii=False, indent=2)};"
        js_bundle = f"""
<script>
{scripts_content['pannellum.js']}
</script>
<script>
{eras_inline_js}
</script>
<script>
{pano_js}
</script>
<script>
{cert_js}
</script>
<script>
{scripts_content['markdown.js']}
</script>
<script>
{scripts_content['storage.js']}
</script>
<script>
{scripts_content['audio.js']}
</script>
<script>
{scripts_content['viewer.js']}
</script>
<script>
{scripts_content['quiz.js']}
</script>
<script>
{scripts_content['certificate.js']}
</script>
<script>
{scripts_content['app.js']}
</script>
"""
        html = html.replace('<script src="js/pannellum.js"></script>', '')
        html = html.replace('<script src="data/eras.js"></script>', '')
        html = html.replace('<script src="data/pano_data.js"></script>', '')
        html = html.replace('<script src="data/cert_data.js"></script>', '')
        html = html.replace('<script src="js/markdown.js"></script>', '')
        html = html.replace('<script src="js/storage.js"></script>', '')
        html = html.replace('<script src="js/audio.js"></script>', '')
        html = html.replace('<script src="js/viewer.js"></script>', '')
        html = html.replace('<script src="js/quiz.js"></script>', '')
        html = html.replace('<script src="js/certificate.js"></script>', '')
        html = html.replace('<script src="js/app.js"></script>', js_bundle)

        return html

def run():
    # 確保 Windows 命令提示字元編碼正常，避免 CP950 遇到特殊字元報錯
    try:
        if sys.platform.startswith("win"):
            sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    # 自動同步 img/pano/ 圖片與素材至 data/pano_data.js 與 cert_data.js
    try:
        sync_panos()
        sync_cert_assets()
    except Exception as e:
        print(f"同步全景圖與素材失敗: {e}")

    port = PORT
    server = None
    for attempt in range(5):
        try:
            server = HTTPServer(("127.0.0.1", port), TeacherEditorHandler)
            break
        except OSError:
            port += 1

    if not server:
        print("無法在可用連接埠啟動伺服器，請確認權限或關閉佔用的程式。")
        sys.exit(1)

    url = f"http://127.0.0.1:{port}/editor.html"
    print("=" * 65)
    print("  史前臺灣 360 度時光探險 ── 教師線索位置設定工具")
    print("=" * 65)
    print(f"\n伺服器已就緒：{url}")
    print("正在自動開啟預設瀏覽器...")
    print("\n【操作說明】")
    print(" 1. 在畫面左側點選要調整的線索。")
    print(" 2. 轉動 360 度全景畫面到理想位置，點擊「定位在準心處」即可定位該線索。")
    print(" 3. 調整完成後，點擊右上角「儲存並回存專案」，即可直接更新專案設定！")
    print(" 4. 如欲結束工具，可在此視窗按下 Ctrl + C。\n")

    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n設定工具已關閉，感謝使用！")
        server.server_close()

if __name__ == "__main__":
    run()
