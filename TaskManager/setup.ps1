# Chạy MỘT LẦN sau khi clone repo, trong thư mục TaskManager:
#     cd TaskManager
#     .\setup.ps1
#
# Script sẽ: (1) tạo các thư mục nền tảng (android, ios, web, windows) bằng "flutter create",
# (2) cho phép app gọi API HTTP tới máy tính khi chạy trên máy ảo Android, (3) chạy "flutter pub get".
# Mã nguồn trong lib/ và test/ được giữ nguyên.

$ErrorActionPreference = 'Stop'

flutter create --project-name task_manager --org com.example --platforms android,ios,web,windows .

$manifest = Join-Path (Get-Location) 'android\app\src\main\AndroidManifest.xml'
$text = [System.IO.File]::ReadAllText($manifest)

if ($text -notmatch 'android.permission.INTERNET') {
    $text = $text.Replace('<application', "<uses-permission android:name=`"android.permission.INTERNET`"/>`r`n    <application")
}
if ($text -notmatch 'usesCleartextTraffic') {
    # Máy ảo Android gọi API qua http://10.0.2.2:3000 (không có HTTPS) nên cần cho phép HTTP.
    $text = $text.Replace('<application', '<application android:usesCleartextTraffic="true"')
}
[System.IO.File]::WriteAllText($manifest, $text, (New-Object System.Text.UTF8Encoding $false))

flutter pub get
Write-Host 'Xong. Bật API (cd ..\api; npm start), bật máy ảo rồi chạy: flutter run' -ForegroundColor Green
