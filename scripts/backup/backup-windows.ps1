<#
  Sao lưu database SQL Server (cài trên Windows) + thư mục uploads (CV, logo).
  - Lưu vào D:\job-portal-backups\<ngày-giờ>\ (đổi bằng -BackupRoot)
  - Giữ lại các bản trong N ngày gần nhất (-KeepDays, mặc định 14)
  Chạy thử:   powershell -ExecutionPolicy Bypass -File scripts\backup\backup-windows.ps1
  Đặt lịch:   powershell -ExecutionPolicy Bypass -File scripts\backup\register-task.ps1   (chạy bằng quyền Administrator)
#>
param(
  [string]$Server = "localhost\SQLEXPRESS",
  [string]$Database = "job_portal",
  [string]$BackupRoot = "D:\job-portal-backups",
  [string]$UploadsDir = "$PSScriptRoot\..\..\api\uploads",
  [int]$KeepDays = 14
)
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Force -Path $target | Out-Null

# Tài khoản dịch vụ SQL Server phải ghi được vào thư mục này
$acl = Get-Acl $target
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.AddAccessRule($rule); Set-Acl $target $acl

$bak = Join-Path $target "$Database.bak"
Write-Host "[$(Get-Date -f T)] Sao lưu database $Database -> $bak"
# -E: dùng tài khoản Windows hiện tại (cần quyền sysadmin hoặc db_backupoperator)
sqlcmd -S $Server -E -b -Q "BACKUP DATABASE [$Database] TO DISK = N'$bak' WITH INIT, CHECKSUM, NAME = N'$Database $stamp'"
if ($LASTEXITCODE -ne 0) { throw "BACKUP DATABASE thất bại" }
sqlcmd -S $Server -E -b -Q "RESTORE VERIFYONLY FROM DISK = N'$bak' WITH CHECKSUM"
if ($LASTEXITCODE -ne 0) { throw "Kiểm tra file backup thất bại" }

if (Test-Path $UploadsDir) {
  Write-Host "[$(Get-Date -f T)] Nén thư mục uploads"
  Compress-Archive -Path (Join-Path (Resolve-Path $UploadsDir) "*") -DestinationPath (Join-Path $target "uploads.zip") -Force
}

# Xóa bản cũ
Get-ChildItem $BackupRoot -Directory | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$KeepDays) } | ForEach-Object {
  Write-Host "Xóa bản cũ: $($_.Name)"; Remove-Item $_.FullName -Recurse -Force
}
Write-Host "[$(Get-Date -f T)] Xong: $target"

<# KHÔI PHỤC (tham khảo):
   sqlcmd -S localhost\SQLEXPRESS -E -Q "ALTER DATABASE [job_portal] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [job_portal] FROM DISK = N'D:\job-portal-backups\<ngày>\job_portal.bak' WITH REPLACE; ALTER DATABASE [job_portal] SET MULTI_USER"
   Giải nén uploads.zip vào api\uploads
#>
