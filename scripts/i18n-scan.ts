import process from "node:process";
import { enUS } from "../src/renderer/ui/i18n/en-US";
import { zhCN } from "../src/renderer/ui/i18n/zh-CN";

function sortedKeys(obj: Record<string, unknown>) {
  return Object.keys(obj).sort((a, b) => a.localeCompare(b));
}

function diffKeys(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));
  return sortedKeys(a).filter((k) => !bKeys.has(k));
}

function hasNonStringValues(obj: Record<string, unknown>) {
  return sortedKeys(obj).some((k) => typeof obj[k] !== "string");
}

const argv = process.argv.slice(2);
const shouldFail = argv.includes("--fail");

const missingInZh = diffKeys(enUS as any, zhCN as any);
const missingInEn = diffKeys(zhCN as any, enUS as any);

const hasNonStringEn = hasNonStringValues(enUS as any);
const hasNonStringZh = hasNonStringValues(zhCN as any);

const issues: string[] = [];
if (missingInZh.length) issues.push(`zh-CN is missing ${missingInZh.length} keys`);
if (missingInEn.length) issues.push(`en-US is missing ${missingInEn.length} keys`);
if (hasNonStringEn) issues.push("en-US contains non-string values");
if (hasNonStringZh) issues.push("zh-CN contains non-string values");

if (issues.length === 0) {
  console.log("[i18n] OK: en-US and zh-CN keys match.");
  process.exit(0);
}

console.log(`[i18n] Found issues: ${issues.join(" | ")}`);
if (missingInZh.length) {
  console.log("\nMissing in zh-CN:");
  for (const k of missingInZh) console.log(`- ${k}`);
}
if (missingInEn.length) {
  console.log("\nMissing in en-US:");
  for (const k of missingInEn) console.log(`- ${k}`);
}

process.exit(shouldFail ? 1 : 0);
