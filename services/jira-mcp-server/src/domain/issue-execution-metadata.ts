import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { adfToPlainText } from "./adf.js";

export type IssueExecutionMetadataInput = {
  requiredSkills?: string[];
  optionalSkills?: string[];
  executionMode?: string;
  notes?: string[];
};

export type IssueSkillReference = {
  value: string;
  kind: "path" | "local-skill" | "namespaced-skill" | "unknown";
  resolvedPath?: string;
  exists?: boolean;
};

export type IssueExecutionMetadata = {
  requiredSkills: IssueSkillReference[];
  optionalSkills: IssueSkillReference[];
  executionMode?: string;
  notes: string[];
  source: "markdown-section" | "yaml-code-block";
};

export type ParsedIssueExecutionData = {
  descriptionText: string;
  executionMetadata?: IssueExecutionMetadata;
};

export function buildIssueDescriptionWithExecutionMetadata(
  description: string | undefined,
  metadata: IssueExecutionMetadataInput | undefined
): string | undefined {
  const baseText = stripExecutionMetadataSection(description ?? "").trim();

  if (!metadata || !hasExecutionMetadataContent(metadata)) {
    return baseText || undefined;
  }

  const metadataBlock = renderExecutionMetadataBlock(metadata);

  if (!baseText) {
    return metadataBlock;
  }

  return `${baseText}\n\n${metadataBlock}`;
}

export function parseIssueExecutionMetadataFromDescription(
  description: unknown
): ParsedIssueExecutionData {
  const descriptionText =
    typeof description === "string" ? description : adfToPlainText(description);
  const metadata = parseIssueExecutionMetadataFromText(descriptionText);

  return {
    descriptionText: stripExecutionMetadataSection(descriptionText).trim(),
    ...(metadata ? { executionMetadata: metadata } : {})
  };
}

export function renderExecutionMetadataBlock(
  metadata: IssueExecutionMetadataInput
): string {
  const lines = ["## Execution metadata", "", "```yaml", "codex:"];

  if (metadata.requiredSkills?.length) {
    lines.push("  required_skills:");
    lines.push(...metadata.requiredSkills.map((skill) => `    - ${skill}`));
  }

  if (metadata.optionalSkills?.length) {
    lines.push("  optional_skills:");
    lines.push(...metadata.optionalSkills.map((skill) => `    - ${skill}`));
  }

  if (metadata.executionMode) {
    lines.push(`  execution_mode: ${metadata.executionMode}`);
  }

  if (metadata.notes?.length === 1) {
    const firstNote = metadata.notes[0];

    if (firstNote) {
      lines.push(`  notes: ${quoteYamlScalar(firstNote)}`);
    }
  } else if (metadata.notes?.length) {
    lines.push("  notes:");
    lines.push(...metadata.notes.map((note) => `    - ${note}`));
  }

  lines.push("```");

  return lines.join("\n");
}

export function stripExecutionMetadataSection(text: string): string {
  const normalized = normalizeLineEndings(text);
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^#{1,6}\s+execution metadata\s*$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return normalized.trim();
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const nextLine = lines[index];

    if (nextLine && /^#{1,6}\s+/.test(nextLine.trim())) {
      endIndex = index;
      break;
    }
  }

  const before = lines.slice(0, startIndex).join("\n").trimEnd();
  const after = lines.slice(endIndex).join("\n").trimStart();

  return [before, after].filter(Boolean).join("\n\n").trim();
}

function parseIssueExecutionMetadataFromText(
  text: string
): IssueExecutionMetadata | undefined {
  const normalized = normalizeLineEndings(text);
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^#{1,6}\s+execution metadata\s*$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return undefined;
  }

  const sectionLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index];

    if (!currentLine) {
      continue;
    }

    const trimmed = currentLine.trim();

    if (/^#{1,6}\s+/.test(trimmed)) {
      break;
    }

    sectionLines.push(currentLine);
  }

  const yamlMetadata = parseYamlExecutionMetadata(sectionLines);

  if (yamlMetadata) {
    return yamlMetadata;
  }

  return parseMarkdownExecutionMetadata(sectionLines);
}

function resolveSkillReference(value: string): IssueSkillReference {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: trimmed, kind: "unknown" };
  }

  if (looksLikePath(trimmed)) {
    return {
      value: trimmed,
      kind: "path",
      resolvedPath: trimmed,
      exists: existsSync(trimmed)
    };
  }

  if (trimmed.includes(":")) {
    return {
      value: trimmed,
      kind: "namespaced-skill"
    };
  }

  const localSkillPath = path.join(
    homedir(),
    ".codex",
    "skills",
    trimmed,
    "SKILL.md"
  );

  return {
    value: trimmed,
    kind: "local-skill",
    resolvedPath: localSkillPath,
    exists: existsSync(localSkillPath)
  };
}

function looksLikePath(value: string): boolean {
  if (path.isAbsolute(value)) {
    return true;
  }

  return /[\\/].+\.md$/i.test(value) || value.endsWith("SKILL.md");
}

function hasExecutionMetadataContent(
  metadata: IssueExecutionMetadataInput
): boolean {
  return Boolean(
    metadata.requiredSkills?.length ||
      metadata.optionalSkills?.length ||
      metadata.executionMode ||
      metadata.notes?.length
  );
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function parseYamlExecutionMetadata(
  lines: string[]
): IssueExecutionMetadata | undefined {
  const startIndex = lines.findIndex((line) =>
    /^```ya?ml\s*$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return undefined;
  }

  let endIndex = -1;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const nextLine = lines[index];

    if (nextLine && /^```\s*$/.test(nextLine.trim())) {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return undefined;
  }

  const yamlLines = lines.slice(startIndex + 1, endIndex);
  const rawRequired: string[] = [];
  const rawOptional: string[] = [];
  const notes: string[] = [];
  let executionMode: string | undefined;
  let currentSection: "required" | "optional" | "notes" | undefined;

  for (const line of yamlLines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "codex:") {
      continue;
    }

    const keyMatch = trimmed.match(
      /^(required_skills|optional_skills|execution_mode|notes):\s*(.*)$/i
    );

    if (keyMatch) {
      const key = keyMatch[1]?.toLowerCase() ?? "";
      const inlineValue = keyMatch[2]?.trim() ?? "";
      currentSection = undefined;

      if (key === "required_skills") {
        currentSection = "required";
      } else if (key === "optional_skills") {
        currentSection = "optional";
      } else if (key === "notes") {
        currentSection = "notes";
      } else if (key === "execution_mode") {
        executionMode = unquoteYamlScalar(inlineValue);
      }

      if (currentSection && inlineValue) {
        pushYamlValue(
          currentSection,
          inlineValue,
          rawRequired,
          rawOptional,
          notes
        );
      }

      continue;
    }

    const bulletMatch = trimmed.match(/^- (.+)$/);
    const bulletValue = bulletMatch?.[1]?.trim();

    if (bulletValue && currentSection) {
      pushYamlValue(
        currentSection,
        bulletValue,
        rawRequired,
        rawOptional,
        notes
      );
    }
  }

  if (
    rawRequired.length === 0 &&
    rawOptional.length === 0 &&
    !executionMode &&
    notes.length === 0
  ) {
    return undefined;
  }

  return {
    requiredSkills: rawRequired.map(resolveSkillReference),
    optionalSkills: rawOptional.map(resolveSkillReference),
    notes,
    source: "yaml-code-block",
    ...(executionMode ? { executionMode } : {})
  };
}

function parseMarkdownExecutionMetadata(
  lines: string[]
): IssueExecutionMetadata | undefined {
  const rawRequired: string[] = [];
  const rawOptional: string[] = [];
  const notes: string[] = [];
  let executionMode: string | undefined;
  let currentSection: "required" | "optional" | "mode" | "notes" | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const sectionMatch = trimmed.match(
      /^(Required skills|Optional skills|Execution mode|Notes):\s*(.*)$/i
    );

    if (sectionMatch) {
      const sectionName = sectionMatch[1] ?? "";
      const inlineValue = sectionMatch[2] ?? "";
      currentSection = mapMarkdownSectionName(sectionName);

      if (inlineValue) {
        applyMarkdownSectionValue(
          currentSection,
          inlineValue,
          rawRequired,
          rawOptional,
          notes,
          (value) => {
            executionMode = value;
          }
        );
      }

      continue;
    }

    const bulletMatch = trimmed.match(/^- (.+)$/);
    const bulletValue = bulletMatch?.[1]?.trim();

    if (bulletValue && currentSection) {
      applyMarkdownSectionValue(
        currentSection,
        bulletValue,
        rawRequired,
        rawOptional,
        notes,
        (value) => {
          executionMode = value;
        }
      );
    }
  }

  if (
    rawRequired.length === 0 &&
    rawOptional.length === 0 &&
    !executionMode &&
    notes.length === 0
  ) {
    return undefined;
  }

  return {
    requiredSkills: rawRequired.map(resolveSkillReference),
    optionalSkills: rawOptional.map(resolveSkillReference),
    notes,
    source: "markdown-section",
    ...(executionMode ? { executionMode } : {})
  };
}

function pushYamlValue(
  section: "required" | "optional" | "notes",
  rawValue: string,
  required: string[],
  optional: string[],
  notes: string[]
): void {
  const value = unquoteYamlScalar(rawValue);

  if (section === "required") {
    required.push(value);
    return;
  }

  if (section === "optional") {
    optional.push(value);
    return;
  }

  notes.push(value);
}

function applyMarkdownSectionValue(
  section: "required" | "optional" | "mode" | "notes" | undefined,
  value: string,
  required: string[],
  optional: string[],
  notes: string[],
  setMode: (value: string) => void
): void {
  if (!section) {
    return;
  }

  if (section === "required") {
    required.push(value);
    return;
  }

  if (section === "optional") {
    optional.push(value);
    return;
  }

  if (section === "notes") {
    notes.push(value);
    return;
  }

  setMode(value);
}

function mapMarkdownSectionName(
  value: string
): "required" | "optional" | "mode" | "notes" | undefined {
  const normalized = value.trim().toLowerCase();

  if (normalized === "required skills") {
    return "required";
  }

  if (normalized === "optional skills") {
    return "optional";
  }

  if (normalized === "execution mode") {
    return "mode";
  }

  if (normalized === "notes") {
    return "notes";
  }

  return undefined;
}

function quoteYamlScalar(value: string): string {
  return JSON.stringify(value);
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
