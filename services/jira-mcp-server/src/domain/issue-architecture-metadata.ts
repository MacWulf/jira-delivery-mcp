import { adfToPlainText } from "./adf.js";

export type ArchitectIssueMetadataInput = {
  adrUrl?: string;
  adrTitle?: string;
  adrStatus?: string;
  architectureSummary?: string;
  decisionScope?: string;
  confidenceLevel?: string;
  reviewMode?: string;
  followUpType?: string;
  migrationStyle?: string;
  qualityAttributes?: string[];
  hardConstraints?: string[];
  cleanupRequired?: boolean;
  technicalDebtFlag?: boolean;
  architectureBlockReason?: string;
  nextSkills?: string[];
};

export type ArchitectIssueMetadata = {
  adrUrl?: string;
  adrTitle?: string;
  adrStatus?: string;
  architectureSummary?: string;
  decisionScope?: string;
  confidenceLevel?: string;
  reviewMode?: string;
  followUpType?: string;
  migrationStyle?: string;
  qualityAttributes: string[];
  hardConstraints: string[];
  cleanupRequired?: boolean;
  technicalDebtFlag?: boolean;
  architectureBlockReason?: string;
  nextSkills: string[];
  source: "yaml-code-block" | "markdown-section";
};

export type ParsedIssueArchitectureData = {
  descriptionText: string;
  architectureMetadata?: ArchitectIssueMetadata;
};

export function buildIssueDescriptionWithArchitectureMetadata(
  description: string | undefined,
  metadata: ArchitectIssueMetadataInput | undefined
): string | undefined {
  const baseText = stripArchitectureMetadataSection(description ?? "").trim();

  if (!metadata || !hasArchitectureMetadataContent(metadata)) {
    return baseText || undefined;
  }

  const metadataBlock = renderArchitectureMetadataBlock(metadata);

  if (!baseText) {
    return metadataBlock;
  }

  return `${baseText}\n\n${metadataBlock}`;
}

export function parseIssueArchitectureMetadataFromDescription(
  description: unknown
): ParsedIssueArchitectureData {
  const descriptionText =
    typeof description === "string" ? description : adfToPlainText(description);
  const architectureMetadata = parseIssueArchitectureMetadataFromText(
    descriptionText
  );

  return {
    descriptionText: stripArchitectureMetadataSection(descriptionText).trim(),
    ...(architectureMetadata ? { architectureMetadata } : {})
  };
}

export function stripArchitectureMetadataSection(text: string): string {
  return stripSectionByHeading(text, "architecture metadata");
}

export function renderArchitectureMetadataBlock(
  metadata: ArchitectIssueMetadataInput
): string {
  const lines = ["## Architecture metadata", "", "```yaml", "architect:"];

  pushScalar(lines, "adr_url", metadata.adrUrl);
  pushScalar(lines, "adr_title", metadata.adrTitle);
  pushScalar(lines, "adr_status", metadata.adrStatus);
  pushScalar(lines, "architecture_summary", metadata.architectureSummary);
  pushScalar(lines, "decision_scope", metadata.decisionScope);
  pushScalar(lines, "confidence_level", metadata.confidenceLevel);
  pushScalar(lines, "review_mode", metadata.reviewMode);
  pushScalar(lines, "follow_up_type", metadata.followUpType);
  pushScalar(lines, "migration_style", metadata.migrationStyle);
  pushStringList(lines, "quality_attributes", metadata.qualityAttributes);
  pushStringList(lines, "hard_constraints", metadata.hardConstraints);
  pushBoolean(lines, "cleanup_required", metadata.cleanupRequired);
  pushBoolean(lines, "technical_debt_flag", metadata.technicalDebtFlag);
  pushScalar(
    lines,
    "architecture_block_reason",
    metadata.architectureBlockReason
  );
  pushStringList(lines, "next_skills", metadata.nextSkills);
  lines.push("```");

  return lines.join("\n");
}

export function toArchitectIssueMetadataInput(
  metadata: ArchitectIssueMetadata | undefined
): ArchitectIssueMetadataInput | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    ...(metadata.adrUrl ? { adrUrl: metadata.adrUrl } : {}),
    ...(metadata.adrTitle ? { adrTitle: metadata.adrTitle } : {}),
    ...(metadata.adrStatus ? { adrStatus: metadata.adrStatus } : {}),
    ...(metadata.architectureSummary
      ? { architectureSummary: metadata.architectureSummary }
      : {}),
    ...(metadata.decisionScope ? { decisionScope: metadata.decisionScope } : {}),
    ...(metadata.confidenceLevel
      ? { confidenceLevel: metadata.confidenceLevel }
      : {}),
    ...(metadata.reviewMode ? { reviewMode: metadata.reviewMode } : {}),
    ...(metadata.followUpType ? { followUpType: metadata.followUpType } : {}),
    ...(metadata.migrationStyle
      ? { migrationStyle: metadata.migrationStyle }
      : {}),
    ...(metadata.qualityAttributes.length
      ? { qualityAttributes: [...metadata.qualityAttributes] }
      : {}),
    ...(metadata.hardConstraints.length
      ? { hardConstraints: [...metadata.hardConstraints] }
      : {}),
    ...(metadata.cleanupRequired !== undefined
      ? { cleanupRequired: metadata.cleanupRequired }
      : {}),
    ...(metadata.technicalDebtFlag !== undefined
      ? { technicalDebtFlag: metadata.technicalDebtFlag }
      : {}),
    ...(metadata.architectureBlockReason !== undefined
      ? { architectureBlockReason: metadata.architectureBlockReason }
      : {}),
    ...(metadata.nextSkills.length
      ? { nextSkills: [...metadata.nextSkills] }
      : {})
  };
}

function parseIssueArchitectureMetadataFromText(
  text: string
): ArchitectIssueMetadata | undefined {
  const lines = extractSectionLines(text, "architecture metadata");

  if (!lines) {
    return undefined;
  }

  const yamlMetadata = parseYamlArchitectureMetadata(lines);

  if (yamlMetadata) {
    return yamlMetadata;
  }

  return parseMarkdownArchitectureMetadata(lines);
}

function hasArchitectureMetadataContent(
  metadata: ArchitectIssueMetadataInput
): boolean {
  return Boolean(
    metadata.adrUrl ||
      metadata.adrTitle ||
      metadata.adrStatus ||
      metadata.architectureSummary ||
      metadata.decisionScope ||
      metadata.confidenceLevel ||
      metadata.reviewMode ||
      metadata.followUpType ||
      metadata.migrationStyle ||
      metadata.qualityAttributes?.length ||
      metadata.hardConstraints?.length ||
      metadata.cleanupRequired !== undefined ||
      metadata.technicalDebtFlag !== undefined ||
      metadata.architectureBlockReason !== undefined ||
      metadata.nextSkills?.length
  );
}

function parseYamlArchitectureMetadata(
  lines: string[]
): ArchitectIssueMetadata | undefined {
  const startIndex = lines.findIndex((line) =>
    /^```ya?ml\s*$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return undefined;
  }

  let endIndex = -1;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^```\s*$/.test(lines[index]?.trim() ?? "")) {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return undefined;
  }

  const yamlLines = lines.slice(startIndex + 1, endIndex);
  const lists = {
    qualityAttributes: [] as string[],
    hardConstraints: [] as string[],
    nextSkills: [] as string[]
  };
  const scalarMap: Record<string, string | boolean | undefined> = {};
  let currentSection: keyof typeof lists | undefined;

  for (const line of yamlLines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "architect:") {
      continue;
    }

    const keyMatch = trimmed.match(/^([a-z_]+):\s*(.*)$/i);

    if (keyMatch) {
      const rawKey = keyMatch[1]?.toLowerCase() ?? "";
      const rawValue = keyMatch[2] ?? "";
      currentSection = mapArchitectureListKey(rawKey);

      if (currentSection) {
        if (rawValue.trim()) {
          lists[currentSection].push(unquoteYamlScalar(rawValue));
        }

        continue;
      }

      scalarMap[rawKey] = parseScalarValue(rawValue);
      continue;
    }

    const bulletMatch = trimmed.match(/^- (.+)$/);
    const bulletValue = bulletMatch?.[1]?.trim();

    if (bulletValue && currentSection) {
      lists[currentSection].push(unquoteYamlScalar(bulletValue));
    }
  }

  if (!hasParsedArchitectureContent(scalarMap, lists)) {
    return undefined;
  }

  const adrUrl = asString(scalarMap.adr_url);
  const adrTitle = asString(scalarMap.adr_title);
  const adrStatus = asString(scalarMap.adr_status);
  const architectureSummary = asString(scalarMap.architecture_summary);
  const decisionScope = asString(scalarMap.decision_scope);
  const confidenceLevel = asString(scalarMap.confidence_level);
  const reviewMode = asString(scalarMap.review_mode);
  const followUpType = asString(scalarMap.follow_up_type);
  const migrationStyle = asString(scalarMap.migration_style);
  const architectureBlockReason = asString(
    scalarMap.architecture_block_reason
  );

  return {
    ...(adrUrl ? { adrUrl } : {}),
    ...(adrTitle ? { adrTitle } : {}),
    ...(adrStatus ? { adrStatus } : {}),
    ...(architectureSummary ? { architectureSummary } : {}),
    ...(decisionScope ? { decisionScope } : {}),
    ...(confidenceLevel ? { confidenceLevel } : {}),
    ...(reviewMode ? { reviewMode } : {}),
    ...(followUpType ? { followUpType } : {}),
    ...(migrationStyle ? { migrationStyle } : {}),
    qualityAttributes: lists.qualityAttributes,
    hardConstraints: lists.hardConstraints,
    ...(typeof scalarMap.cleanup_required === "boolean"
      ? { cleanupRequired: scalarMap.cleanup_required }
      : {}),
    ...(typeof scalarMap.technical_debt_flag === "boolean"
      ? { technicalDebtFlag: scalarMap.technical_debt_flag }
      : {}),
    ...(architectureBlockReason !== undefined ? { architectureBlockReason } : {}),
    nextSkills: lists.nextSkills,
    source: "yaml-code-block"
  };
}

function parseMarkdownArchitectureMetadata(
  lines: string[]
): ArchitectIssueMetadata | undefined {
  const lists = {
    qualityAttributes: [] as string[],
    hardConstraints: [] as string[],
    nextSkills: [] as string[]
  };
  const scalarMap: Record<string, string | boolean | undefined> = {};
  let currentSection: keyof typeof lists | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const sectionMatch = trimmed.match(/^([A-Za-z /]+):\s*(.*)$/);

    if (sectionMatch) {
      const key = normalizeMarkdownKey(sectionMatch[1] ?? "");
      const rawValue = sectionMatch[2] ?? "";
      currentSection = mapArchitectureMarkdownListKey(key);

      if (currentSection) {
        if (rawValue.trim()) {
          lists[currentSection].push(rawValue.trim());
        }

        continue;
      }

      scalarMap[key] = parseScalarValue(rawValue);
      continue;
    }

    const bulletMatch = trimmed.match(/^- (.+)$/);
    const bulletValue = bulletMatch?.[1]?.trim();

    if (bulletValue && currentSection) {
      lists[currentSection].push(bulletValue);
    }
  }

  if (!hasParsedArchitectureContent(scalarMap, lists)) {
    return undefined;
  }

  const adrUrl = asString(scalarMap.adr_url);
  const adrTitle = asString(scalarMap.adr_title);
  const adrStatus = asString(scalarMap.adr_status);
  const architectureSummary = asString(scalarMap.architecture_summary);
  const decisionScope = asString(scalarMap.decision_scope);
  const confidenceLevel = asString(scalarMap.confidence_level);
  const reviewMode = asString(scalarMap.review_mode);
  const followUpType = asString(scalarMap.follow_up_type);
  const migrationStyle = asString(scalarMap.migration_style);
  const architectureBlockReason = asString(
    scalarMap.architecture_block_reason
  );

  return {
    ...(adrUrl ? { adrUrl } : {}),
    ...(adrTitle ? { adrTitle } : {}),
    ...(adrStatus ? { adrStatus } : {}),
    ...(architectureSummary ? { architectureSummary } : {}),
    ...(decisionScope ? { decisionScope } : {}),
    ...(confidenceLevel ? { confidenceLevel } : {}),
    ...(reviewMode ? { reviewMode } : {}),
    ...(followUpType ? { followUpType } : {}),
    ...(migrationStyle ? { migrationStyle } : {}),
    qualityAttributes: lists.qualityAttributes,
    hardConstraints: lists.hardConstraints,
    ...(typeof scalarMap.cleanup_required === "boolean"
      ? { cleanupRequired: scalarMap.cleanup_required }
      : {}),
    ...(typeof scalarMap.technical_debt_flag === "boolean"
      ? { technicalDebtFlag: scalarMap.technical_debt_flag }
      : {}),
    ...(architectureBlockReason !== undefined ? { architectureBlockReason } : {}),
    nextSkills: lists.nextSkills,
    source: "markdown-section"
  };
}

function hasParsedArchitectureContent(
  scalars: Record<string, string | boolean | undefined>,
  lists: {
    qualityAttributes: string[];
    hardConstraints: string[];
    nextSkills: string[];
  }
): boolean {
  return Boolean(
    Object.values(scalars).some((value) => value !== undefined) ||
      lists.qualityAttributes.length ||
      lists.hardConstraints.length ||
      lists.nextSkills.length
  );
}

function stripSectionByHeading(text: string, heading: string): string {
  const normalized = normalizeLineEndings(text);
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) =>
    new RegExp(`^#{1,6}\\s+${heading}\\s*$`, "i").test(line.trim())
  );

  if (startIndex === -1) {
    return normalized.trim();
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^#{1,6}\s+/.test(lines[index]?.trim() ?? "")) {
      endIndex = index;
      break;
    }
  }

  const before = lines.slice(0, startIndex).join("\n").trimEnd();
  const after = lines.slice(endIndex).join("\n").trimStart();

  return [before, after].filter(Boolean).join("\n\n").trim();
}

function extractSectionLines(
  text: string,
  heading: string
): string[] | undefined {
  const normalized = normalizeLineEndings(text);
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) =>
    new RegExp(`^#{1,6}\\s+${heading}\\s*$`, "i").test(line.trim())
  );

  if (startIndex === -1) {
    return undefined;
  }

  const sectionLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index];

    if (currentLine && /^#{1,6}\s+/.test(currentLine.trim())) {
      break;
    }

    if (currentLine) {
      sectionLines.push(currentLine);
    }
  }

  return sectionLines;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function pushScalar(lines: string[], key: string, value: string | undefined): void {
  if (value === undefined) {
    return;
  }

  lines.push(`  ${key}: ${quoteYamlScalar(value)}`);
}

function pushBoolean(
  lines: string[],
  key: string,
  value: boolean | undefined
): void {
  if (value === undefined) {
    return;
  }

  lines.push(`  ${key}: ${value ? "true" : "false"}`);
}

function pushStringList(
  lines: string[],
  key: string,
  values: string[] | undefined
): void {
  if (!values?.length) {
    return;
  }

  lines.push(`  ${key}:`);
  lines.push(...values.map((value) => `    - ${quoteYamlScalar(value)}`));
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

function parseScalarValue(rawValue: string): string | boolean | undefined {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }

  return unquoteYamlScalar(trimmed);
}

function normalizeMarkdownKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .replace(/\s+/g, "_");
}

function mapArchitectureListKey(
  value: string
): "qualityAttributes" | "hardConstraints" | "nextSkills" | undefined {
  if (value === "quality_attributes") {
    return "qualityAttributes";
  }

  if (value === "hard_constraints") {
    return "hardConstraints";
  }

  if (value === "next_skills") {
    return "nextSkills";
  }

  return undefined;
}

function mapArchitectureMarkdownListKey(
  value: string
): "qualityAttributes" | "hardConstraints" | "nextSkills" | undefined {
  if (value === "quality_attributes") {
    return "qualityAttributes";
  }

  if (value === "hard_constraints") {
    return "hardConstraints";
  }

  if (value === "next_skills") {
    return "nextSkills";
  }

  return undefined;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
