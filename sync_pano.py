#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import base64

def sync_panos():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    pano_dir = os.path.join(base_dir, "img", "pano")
    output_js = os.path.join(base_dir, "data", "pano_data.js")

    base64_dict = {}
    if os.path.exists(pano_dir):
        for fname in sorted(os.listdir(pano_dir)):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                key = os.path.splitext(fname)[0]
                fpath = os.path.join(pano_dir, fname)
                try:
                    with open(fpath, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                        mime = "image/png" if fname.lower().endswith(".png") else "image/jpeg"
                        base64_dict[key] = f"data:{mime};base64,{b64}"
                    print(f"[同步] 已讀取 {fname} ({os.path.getsize(fpath)} bytes)")
                except Exception as e:
                    print(f"[警告] 讀取 {fname} 失敗: {e}")

    entries = []
    for k, v in base64_dict.items():
        entries.append(f'  "{k}": "{v}"')

    js_content = "// data/pano_data.js - 自動同步自 img/pano/ 的 360° 全景圖資料\n" \
                 "// 確保無論在 http:// 伺服器或 file:/// 本地檔案下，都能即時呈現 img/pano/ 內的最新圖片\n" \
                 "window.PANO_DATA = {\n" + ",\n".join(entries) + "\n};\n"

    with open(output_js, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"[完成] 已更新 {output_js}，檔案大小: {os.path.getsize(output_js)} bytes")

def sync_cert_assets():
    import io
    from PIL import Image
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_js = os.path.join(base_dir, "data", "cert_data.js")
    bg_path = os.path.join(base_dir, "img", "certificate-bg.png")

    bg_base64 = ""
    if os.path.exists(bg_path):
        bg_img = Image.open(bg_path)
        bg_buf = io.BytesIO()
        bg_img.convert("RGB").save(bg_buf, "JPEG", quality=88)
        bg_base64 = "data:image/jpeg;base64," + base64.b64encode(bg_buf.getvalue()).decode("ascii")

    # 同步隊長吉祥物圖示
    mascot_path = os.path.join(base_dir, "img", "mascot.png")
    mascot_base64 = ""
    if os.path.exists(mascot_path):
        try:
            m_img = Image.open(mascot_path)
            m_buf = io.BytesIO()
            m_img.save(m_buf, "PNG", optimize=True)
            mascot_base64 = "data:image/png;base64," + base64.b64encode(m_buf.getvalue()).decode("ascii")
            print(f"[同步] 已讀取吉祥物圖示 mascot.png ({os.path.getsize(mascot_path)} bytes)")
        except Exception as me:
            print(f"[警告] 讀取 mascot.png 失敗: {me}")

    # 動態掃描所有徽章素材
    badges_dir = os.path.join(base_dir, "img", "badges")
    badges = {}
    if os.path.exists(badges_dir):
        for fname in sorted(os.listdir(badges_dir)):
            if fname.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                key = os.path.splitext(fname)[0]
                p = os.path.join(badges_dir, fname)
                try:
                    im = Image.open(p)
                    im_resized = im.resize((256, 256), Image.Resampling.LANCZOS)
                    buf = io.BytesIO()
                    im_resized.save(buf, "PNG", optimize=True)
                    b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
                    badges[key] = b64
                except Exception as be:
                    print(f"[警告] 讀取徽章 {fname} 失敗: {be}")

    with open(output_js, "w", encoding="utf-8") as f:
        f.write("// 史前臺灣探險家證書與隊長吉祥物高畫質離線資源 (Base64免CORS，保證file:///無痛下載)\n")
        f.write("window.CERT_ASSETS = {\n")
        f.write(f'  bg: "{bg_base64}",\n')
        f.write(f'  mascot: "{mascot_base64}",\n')
        for k, b64 in badges.items():
            f.write(f'  "{k}": "{b64}",\n')
        f.write("};\n")
    print(f"[完成] 已更新 {output_js}，檔案大小: {os.path.getsize(output_js)} bytes")

if __name__ == "__main__":
    sync_panos()
    sync_cert_assets()
