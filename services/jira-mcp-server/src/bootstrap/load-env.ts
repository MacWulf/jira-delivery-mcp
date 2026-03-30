import { config as loadDotEnv } from "dotenv";
import { fileURLToPath } from "node:url";

const envUrl = new URL("../../../../.env", import.meta.url);

loadDotEnv({
  path: fileURLToPath(envUrl),
  quiet: true
});
