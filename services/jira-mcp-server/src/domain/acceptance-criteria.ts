export type ParsedAcceptanceCriteria = {
  items: string[];
  source: "section" | "checklist" | "none";
};

export function parseAcceptanceCriteriaFromText(
  text: string | undefined
): ParsedAcceptanceCriteria {
  const normalized = normalizeLineEndings(text ?? "");

  if (!normalized.trim()) {
    return {
      items: [],
      source: "none"
    };
  }

  const sectionCriteria = parseAcceptanceCriteriaSection(normalized);

  if (sectionCriteria.length > 0) {
    return {
      items: dedupe(sectionCriteria),
      source: "section"
    };
  }

  const checklistCriteria = parseChecklistCriteria(normalized);

  if (checklistCriteria.length > 0) {
    return {
      items: dedupe(checklistCriteria),
      source: "checklist"
    };
  }

  return {
    items: [],
    source: "none"
  };
}

function parseAcceptanceCriteriaSection(text: string): string[] {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^acceptance criteria\s*:?\s*(.*)$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return [];
  }

  const items: string[] = [];
  const startLine = lines[startIndex]?.trim() ?? "";
  const inlineValue = startLine.replace(/^acceptance criteria\s*:?\s*/i, "").trim();

  if (inlineValue) {
    items.push(normalizeCriterion(inlineValue));
  }

  let hasStartedCollecting = items.length > 0;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index] ?? "";
    const trimmed = currentLine.trim();

    if (!trimmed) {
      if (hasStartedCollecting) {
        break;
      }

      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      break;
    }

    const bulletValue = readBulletValue(trimmed);

    if (bulletValue) {
      items.push(normalizeCriterion(bulletValue));
      hasStartedCollecting = true;
      continue;
    }

    if (hasStartedCollecting) {
      break;
    }

    items.push(normalizeCriterion(trimmed));
    hasStartedCollecting = true;
  }

  return items.filter(Boolean);
}

function parseChecklistCriteria(text: string): string[] {
  return text
    .split("\n")
    .map((line) => readBulletValue(line.trim()))
    .filter((value): value is string => Boolean(value))
    .map(normalizeCriterion)
    .filter(Boolean);
}

function readBulletValue(line: string): string | undefined {
  const match = line.match(
    /^(?:[-*]\s+|\d+\.\s+|\[\s?[xX ]\]\s+)(.+)$/
  );

  return match?.[1]?.trim();
}

function normalizeCriterion(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value.trim());
  }

  return deduped;
}
