import { readDpapiSecretFile } from "./dpapi.js";

type SecretResolverInput = {
  secretName: string;
  directValue: string | undefined;
  dpapiFilePath: string | undefined;
  required?: false;
};

type RequiredSecretResolverInput = Omit<SecretResolverInput, "required"> & {
  required: true;
};

export function resolveSecretValue(input: RequiredSecretResolverInput): string;
export function resolveSecretValue(
  input: SecretResolverInput
): string | undefined;
export function resolveSecretValue(
  input: RequiredSecretResolverInput | SecretResolverInput
): string | undefined {
  if (input.dpapiFilePath) {
    return readDpapiSecretFile(input.dpapiFilePath);
  }

  if (input.directValue) {
    return input.directValue;
  }

  if (input.required) {
    throw new Error(
      `Missing ${input.secretName}. Provide ${input.secretName} or ${input.secretName}_DPAPI_FILE.`
    );
  }

  return undefined;
}
