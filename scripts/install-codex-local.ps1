param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$CodexHome = (Join-Path $env:USERPROFILE ".codex"),
  [string]$ServerName = "jiraDelivery",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Resolve-NormalizedPath {
  param([string]$Path)

  return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).Path)
}

function Assert-ChildPath {
  param(
    [string]$RootPath,
    [string]$CandidatePath
  )

  $normalizedRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd("\", "/")
  $normalizedCandidate = [System.IO.Path]::GetFullPath($CandidatePath)

  if (
    $normalizedCandidate -ne $normalizedRoot -and
    -not $normalizedCandidate.StartsWith("$normalizedRoot\", [System.StringComparison]::OrdinalIgnoreCase)
  ) {
    throw "Refusing to operate outside the expected root. Root: $normalizedRoot Candidate: $normalizedCandidate"
  }
}

function Sync-SkillDirectory {
  param(
    [string]$SourcePath,
    [string]$TargetRoot
  )

  $skillName = Split-Path -Path $SourcePath -Leaf
  $targetPath = Join-Path $TargetRoot $skillName

  Assert-ChildPath -RootPath $TargetRoot -CandidatePath $targetPath

  if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Recurse -Force
  }

  Copy-Item -LiteralPath $SourcePath -Destination $TargetRoot -Recurse -Force
}

function Upsert-McpServerConfig {
  param(
    [string]$ConfigPath,
    [string]$ServerName,
    [string[]]$BlockLines
  )

  $serverHeader = "[mcp_servers.$ServerName]"
  $newBlock = ($BlockLines -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine

  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    $newBlock | Set-Content -LiteralPath $ConfigPath -Encoding utf8
    return
  }

  $lines = Get-Content -LiteralPath $ConfigPath
  $filteredLines = New-Object System.Collections.Generic.List[string]
  $insideTargetBlock = $false

  foreach ($line in $lines) {
    $trimmedLine = $line.Trim()

    if ($trimmedLine -eq $serverHeader) {
      $insideTargetBlock = $true
      continue
    }

    if ($insideTargetBlock -and $trimmedLine -match '^\[.+\]$') {
      $insideTargetBlock = $false
    }

    if (-not $insideTargetBlock) {
      $filteredLines.Add($line)
    }
  }

  while ($filteredLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($filteredLines[$filteredLines.Count - 1])) {
    $filteredLines.RemoveAt($filteredLines.Count - 1)
  }

  if ($filteredLines.Count -gt 0) {
    $filteredLines.Add("")
  }

  $filteredLines.AddRange($BlockLines)
  $updated = ($filteredLines -join [Environment]::NewLine) + [Environment]::NewLine
  $updated | Set-Content -LiteralPath $ConfigPath -Encoding utf8
}

$resolvedRepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$resolvedCodexHome = [System.IO.Path]::GetFullPath($CodexHome)
$skillsSourceRoot = Join-Path $resolvedRepoRoot "skills"
$skillsTargetRoot = Join-Path $resolvedCodexHome "skills"
$configPath = Join-Path $resolvedCodexHome "config.toml"
$distEntrypoint = Join-Path $resolvedRepoRoot "services\jira-mcp-server\dist\index.js"
$skillNames = @(
  "jira-core",
  "jira-architect",
  "jira-business-analysis",
  "jira-project-bootstrap",
  "jira-intake-refinement",
  "jira-quality-control",
  "jira-documentation-publishing",
  "jira-execution-loop",
  "jira-workflow-admin"
)

if (-not (Test-Path -LiteralPath $skillsSourceRoot)) {
  throw "Skill source root is missing: $skillsSourceRoot"
}

if (-not (Test-Path -LiteralPath $resolvedCodexHome)) {
  throw "Codex home is missing: $resolvedCodexHome"
}

New-Item -ItemType Directory -Path $skillsTargetRoot -Force | Out-Null

if (-not $SkipBuild) {
  Push-Location $resolvedRepoRoot
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "Build failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath $distEntrypoint)) {
  throw "Built MCP entrypoint is missing: $distEntrypoint"
}

foreach ($skillName in $skillNames) {
  $sourcePath = Join-Path $skillsSourceRoot $skillName
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing skill source: $sourcePath"
  }

  Sync-SkillDirectory -SourcePath $sourcePath -TargetRoot $skillsTargetRoot
}

if (Test-Path -LiteralPath $configPath) {
  $backupPath = "$configPath.bak-" + (Get-Date -Format "yyyyMMddHHmmss")
  Copy-Item -LiteralPath $configPath -Destination $backupPath -Force
}

$tomlPath = ($distEntrypoint -replace "\\", "/")
$tomlCwd = ($resolvedRepoRoot -replace "\\", "/")
$serverBlockLines = @(
  "[mcp_servers.$ServerName]",
  'command = "node"',
  "args = [""$tomlPath""]",
  "cwd = ""$tomlCwd""",
  "startup_timeout_sec = 20",
  "tool_timeout_sec = 180",
  "enabled = true",
  "required = false"
)

Upsert-McpServerConfig -ConfigPath $configPath -ServerName $ServerName -BlockLines $serverBlockLines

Write-Host "Codex skills synced to $skillsTargetRoot"
Write-Host "MCP server '$ServerName' configured in $configPath"
Write-Host "Entrypoint: $distEntrypoint"
