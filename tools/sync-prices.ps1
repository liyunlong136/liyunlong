# 价格同步：抓取官方定价并写入 assets/js/data/prices.js
# 用法：右键“使用 PowerShell 运行”，或在计划任务中调用
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  node tools/sync-prices.mjs --apply
  if ($LASTEXITCODE -ne 0) { throw "sync failed with exit code $LASTEXITCODE" }
  Write-Host "[ok] prices updated at $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
} finally {
  Pop-Location
}
