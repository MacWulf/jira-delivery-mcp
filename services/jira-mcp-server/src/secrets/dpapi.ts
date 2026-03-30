import { execFileSync } from "node:child_process";

export function readDpapiSecretFile(filePath: string): string {
  if (process.platform !== "win32") {
    throw new Error(
      "DPAPI secret files are only supported on Windows hosts."
    );
  }

  const command = [
    "$path = [Environment]::ExpandEnvironmentVariables($env:CODEX_DPAPI_FILE)",
    'if (-not (Test-Path -LiteralPath $path)) { throw "DPAPI secret file not found: $path" }',
    "$secure = Get-Content -LiteralPath $path -ErrorAction Stop | ConvertTo-SecureString -ErrorAction Stop",
    "$plain = [System.Net.NetworkCredential]::new('', $secure).Password",
    '[Console]::Out.Write($plain)'
  ].join("; ");

  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_DPAPI_FILE: filePath
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      }
    );

    const value = output.trim();

    if (!value) {
      throw new Error(`DPAPI secret file resolved to an empty secret: ${filePath}`);
    }

    return value;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown DPAPI read error";

    throw new Error(`Failed to read DPAPI secret file ${filePath}: ${detail}`);
  }
}
