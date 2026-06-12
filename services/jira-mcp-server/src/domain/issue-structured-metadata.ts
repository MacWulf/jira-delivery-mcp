import {
  buildIssueDescriptionWithExecutionMetadata,
  parseIssueExecutionMetadataFromDescription,
  stripExecutionMetadataSection,
  toIssueExecutionMetadataInput,
  type IssueExecutionMetadata,
  type IssueExecutionMetadataInput
} from "./issue-execution-metadata.js";
import {
  buildIssueDescriptionWithArchitectureMetadata,
  parseIssueArchitectureMetadataFromDescription,
  stripArchitectureMetadataSection,
  toArchitectIssueMetadataInput,
  type ArchitectIssueMetadata,
  type ArchitectIssueMetadataInput
} from "./issue-architecture-metadata.js";

export type IssueStructuredMetadataInput = {
  executionMetadata?: IssueExecutionMetadataInput;
  architectureMetadata?: ArchitectIssueMetadataInput;
};

export type ParsedIssueStructuredMetadata = {
  descriptionText: string;
  executionMetadata?: IssueExecutionMetadata;
  architectureMetadata?: ArchitectIssueMetadata;
};

export function buildIssueDescriptionWithStructuredMetadata(
  description: string | undefined,
  metadata: IssueStructuredMetadataInput
): string | undefined {
  const baseText = stripArchitectureMetadataSection(
    stripExecutionMetadataSection(description ?? "")
  ).trim();
  let nextDescription = baseText || undefined;

  if (metadata.executionMetadata) {
    nextDescription = buildIssueDescriptionWithExecutionMetadata(
      nextDescription,
      metadata.executionMetadata
    );
  }

  if (metadata.architectureMetadata) {
    nextDescription = buildIssueDescriptionWithArchitectureMetadata(
      nextDescription,
      metadata.architectureMetadata
    );
  }

  return nextDescription;
}

export function parseIssueStructuredMetadataFromDescription(
  description: unknown
): ParsedIssueStructuredMetadata {
  const executionData = parseIssueExecutionMetadataFromDescription(description);
  const architectureData = parseIssueArchitectureMetadataFromDescription(
    executionData.descriptionText
  );

  return {
    descriptionText: architectureData.descriptionText,
    ...(executionData.executionMetadata
      ? { executionMetadata: executionData.executionMetadata }
      : {}),
    ...(architectureData.architectureMetadata
      ? { architectureMetadata: architectureData.architectureMetadata }
      : {})
  };
}

export function toStructuredMetadataInput(input: {
  executionMetadata?: IssueExecutionMetadata;
  architectureMetadata?: ArchitectIssueMetadata;
}): IssueStructuredMetadataInput {
  const executionMetadata = input.executionMetadata
    ? toIssueExecutionMetadataInput(input.executionMetadata)
    : undefined;
  const architectureMetadata = input.architectureMetadata
    ? toArchitectIssueMetadataInput(input.architectureMetadata)
    : undefined;

  return {
    ...(executionMetadata ? { executionMetadata } : {}),
    ...(architectureMetadata ? { architectureMetadata } : {})
  };
}
