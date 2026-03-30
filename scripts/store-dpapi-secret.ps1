param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$Prompt = "Enter secret",

  [switch]$FromClipboard
)

$resolvedPath = [Environment]::ExpandEnvironmentVariables($Path)
$parent = Split-Path -Parent $resolvedPath

if ($parent) {
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
}

$secret = $null

if ($FromClipboard) {
  $clipboardValue = Get-Clipboard -Raw

  if ([string]::IsNullOrWhiteSpace($clipboardValue)) {
    throw "Clipboard is empty."
  }

  $secret = ConvertTo-SecureString -String $clipboardValue.Trim() -AsPlainText -Force
}
else {
  $secret = Read-Host -Prompt $Prompt -AsSecureString
}

$secret | ConvertFrom-SecureString | Set-Content -LiteralPath $resolvedPath -Encoding ascii

Write-Host "Stored DPAPI-protected secret at $resolvedPath"
