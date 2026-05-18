import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const keyVersion =
  process.argv.find((arg) => arg.startsWith("--key-version="))?.split("=")[1] ??
  `orca-ed25519-${new Date().toISOString().slice(0, 10)}`;

const keys = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

const escapedPrivateKey = keys.privateKey.trim().replaceAll("\n", "\\n");
const escapedPublicKey = keys.publicKey.trim().replaceAll("\n", "\\n");
const outputPath = resolve(process.cwd(), ".env.license.local");
const output = [
  "# Generated Orca backend secrets. Do not commit.",
  `ORCA_LICENSE_KEY_VERSION=${keyVersion}`,
  `ORCA_LICENSE_PRIVATE_KEY_PEM="${escapedPrivateKey}"`,
  `ORCA_LICENSE_PUBLIC_KEY_PEM="${escapedPublicKey}"`,
  "",
].join("\n");

writeFileSync(outputPath, output, { mode: 0o600, flag: "wx" });
chmodSync(outputPath, 0o600);
console.log(`Wrote backend signing env to ${outputPath}`);
console.log("The file is ignored by git. Move the values into your deployment secret store.");
console.log("# Copy only this public key material to the Orca CLI repo");
console.log(`ORCA_LICENSE_KEY_VERSION=${keyVersion}`);
console.log(keys.publicKey.trim());
