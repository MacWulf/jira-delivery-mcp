export function textToAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text
          }
        ]
      }
    ]
  };
}

type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
};

const BLOCK_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "blockquote",
  "rule",
  "table",
  "tableRow",
  "tableCell"
]);

export function adfToPlainText(document: unknown): string {
  if (!document || typeof document !== "object") {
    return "";
  }

  const parts: string[] = [];

  walkAdfNode(document as AdfNode, parts);

  return parts
    .join("")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walkAdfNode(node: AdfNode, parts: string[]): void {
  if (!node || typeof node !== "object") {
    return;
  }

  if (typeof node.text === "string") {
    parts.push(node.text);
  }

  const content = Array.isArray(node.content) ? node.content : [];

  for (const child of content) {
    walkAdfNode(child, parts);
  }

  if (node.type && BLOCK_NODE_TYPES.has(node.type)) {
    parts.push("\n");
  }
}
