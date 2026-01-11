/* eslint-disable no-console */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const { spawnSync } = require("node:child_process");

function repoRoot() {
  return process.cwd();
}

function isWindows() {
  return process.platform === "win32";
}

function normalizeProxyPrefix(raw) {
  const p = String(raw || "").trim();
  if (!p) return "";
  // Support both "https://gh-proxy.com/" and "https://gh-proxy.com"
  return p.endsWith("/") ? p : p + "/";
}

function withProxy(url) {
  const prefix = normalizeProxyPrefix(process.env.XCODING_GH_PROXY || process.env.GH_PROXY || "");
  if (!prefix) return url;
  // prefix style: <proxy>/<full-url>
  return prefix + url;
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(withProxy(url), { headers: { "User-Agent": "xcoding (fetch-firacode-nerd-font)" } }, (res) => {
      // Follow redirects (GitHub does this a lot).
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(() => {
          fs.rmSync(destPath, { force: true });
          download(res.headers.location, destPath).then(resolve, reject);
        });
        return;
      }

      if (res.statusCode !== 200) {
        file.close(() => {
          fs.rmSync(destPath, { force: true });
          reject(new Error(`download_failed:${res.statusCode}`));
        });
        return;
      }

      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });

    request.on("error", (err) => {
      file.close(() => {
        fs.rmSync(destPath, { force: true });
        reject(err);
      });
    });
  });
}

function extractZip(archivePath, outDir) {
  if (!isWindows()) {
    const r = spawnSync("unzip", ["-o", archivePath, "-d", outDir], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("zip_extract_failed");
    return;
  }

  // Windows runner fallback: PowerShell Expand-Archive
  const r = spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Path "${archivePath}" -DestinationPath "${outDir}" -Force`], {
    stdio: "inherit"
  });
  if (r.status !== 0) throw new Error("zip_extract_failed");
}

function readTextFile(p) {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return null;
  }
}

function usageAndExit(message) {
  if (message) console.error(`[fetch:fonts] ${message}`);
  console.error("Usage:");
  console.error("  pnpm -s run setup:fonts");
  console.error("Options (env):");
  console.error("  XCODING_FIRACODE_NERD_FONT_VERSION  Optional. Override pinned version (no 'v' prefix).");
  console.error("  XCODING_SKIP_FONTS_SETUP           Optional. Set to 1 to skip downloading fonts.");
  console.error("  XCODING_GH_PROXY / GH_PROXY        Optional. Prefix-style GitHub proxy URL.");
  process.exit(1);
}

async function main() {
  const skip = String(process.env.XCODING_SKIP_FONTS_SETUP || "").trim().toLowerCase() === "1";
  if (skip) {
    console.log("[fetch:fonts] Skipped (XCODING_SKIP_FONTS_SETUP=1).");
    return;
  }

  const outDir = path.join(repoRoot(), "src", "renderer", "assets", "fonts", "firacode-nerd-font");
  const pinnedVersionFile = path.join(outDir, "version.txt");
  const installedVersionFile = path.join(outDir, "installed-version.txt");

  const pinned = (process.env.XCODING_FIRACODE_NERD_FONT_VERSION || readTextFile(pinnedVersionFile) || "").trim();
  if (!pinned) usageAndExit(`Missing pinned version file: ${pinnedVersionFile}`);
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(pinned)) usageAndExit(`Invalid version: ${pinned}`);

  const requiredFiles = [
    "FiraCodeNerdFont-Regular.ttf",
    "FiraCodeNerdFont-Medium.ttf",
    "FiraCodeNerdFont-SemiBold.ttf",
    "FiraCodeNerdFont-Bold.ttf"
  ];

  fs.mkdirSync(outDir, { recursive: true });

  const installed = readTextFile(installedVersionFile);
  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(outDir, f)));
  if (installed === pinned && missing.length === 0) {
    console.log(`[fetch:fonts] FiraCode Nerd Font v${pinned} already present.`);
    return;
  }

  console.log(`[fetch:fonts] Installing FiraCode Nerd Font v${pinned}…`);

  for (const f of requiredFiles) fs.rmSync(path.join(outDir, f), { force: true });
  fs.rmSync(installedVersionFile, { force: true });

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xcoding-firacode-nerd-font-"));
  try {
    const archivePath = path.join(tmpRoot, "FiraCode.zip");
    const extractDir = path.join(tmpRoot, "extract");
    fs.mkdirSync(extractDir, { recursive: true });

    const url = `https://github.com/ryanoasis/nerd-fonts/releases/download/v${pinned}/FiraCode.zip`;
    await download(url, archivePath);
    extractZip(archivePath, extractDir);

    for (const f of requiredFiles) {
      const src = path.join(extractDir, f);
      const dest = path.join(outDir, f);
      if (!fs.existsSync(src)) throw new Error(`missing_file_in_archive:${f}`);
      fs.copyFileSync(src, dest);
    }

    fs.writeFileSync(installedVersionFile, `${pinned}\n`, "utf8");
    console.log(`[fetch:fonts] Done. (${requiredFiles.length} files)`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`[fetch:fonts] Failed: ${err?.message || String(err)}`);
  process.exit(1);
});
