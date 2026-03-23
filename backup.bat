@echo off
chcp 65001 > nul
cd /d "c:\coding prodject\Jay monitor project"

echo [自動備份] 每日系統備份啟動中...

REM 新增：每天連帶複製一份最新的資料庫到個人的 Obsidian 筆記庫中
if not exist "C:\新增資料夾\obsidian" mkdir "C:\新增資料夾\obsidian"
copy /Y "data\jay_monitor.json" "C:\新增資料夾\obsidian\jay_monitor.json"
echo [自動備份] 檔案已成功拷貝至 Obsidian 資料夾！

git add "data/*"
git commit -m "Backup: Windows自動任務上傳資料庫備份"
git push origin main

echo [自動備份] 成功上傳到 GitHub！
