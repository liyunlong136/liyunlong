# 注册 Windows 每日任务：每天 09:00 同步价格
# 右键“使用 PowerShell 运行”（首次可能需要在当前用户范围内授权）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $root 'tools\sync-prices.ps1'
if (-not (Test-Path $script)) { throw "找不到 $script" }
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $script + '"')
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00am
Register-ScheduledTask -TaskName 'ModelPick-PriceSync' -Action $action -Trigger $trigger -Description '模选 ModelPick 每日价格同步' -Force | Out-Null
Write-Host '[ok] 已注册计划任务 ModelPick-PriceSync，每天 09:00 运行'
Write-Host '查看/删除: Get-ScheduledTask ModelPick-PriceSync | Unregister-ScheduledTask -Confirm:$false'
