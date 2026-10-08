<#
  Đăng ký Task Scheduler chạy backup-windows.ps1 mỗi ngày lúc 2:00 sáng.
  Chạy PowerShell bằng quyền Administrator:
    powershell -ExecutionPolicy Bypass -File scripts\backup\register-task.ps1
  Kiểm tra: Get-ScheduledTask -TaskName "JobPortal Backup"; chạy ngay: Start-ScheduledTask -TaskName "JobPortal Backup"
#>
param([string]$At = "02:00")
$script = Resolve-Path "$PSScriptRoot\backup-windows.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "JobPortal Backup" -Action $action -Trigger $trigger -Settings $settings `
  -User $env:USERNAME -RunLevel Highest -Description "Sao lưu database job_portal + uploads hằng ngày" -Force
Write-Host "Đã đặt lịch backup lúc $At mỗi ngày."
