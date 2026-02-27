// zotero.ts
import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: any[];
  id: number;
}
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: string;
  error?: { code: number; message: string };
}

interface ZoteroApiConfig {
  libraryType: "user" | "group";
  libraryID: string;
  apiKey: string;
}

interface AppendStats {
  outPath: string;
  requested: number;
  appended: number;
  skipped: number;
  failed: number;
}

const CITEKEY_PATTERN = /@([^\s\];,]+)/g;

function normalizeCitation(raw: string): string {
  const compact = raw.replace(/\s*;\s*/g, "; ").trim();
  return compact.startsWith("[") && compact.endsWith("]")
    ? compact
    : `[${compact}]`;
}

function extractCitekeys(citation: string): string[] {
  const keys = new Set<string>();
  for (const match of citation.matchAll(CITEKEY_PATTERN)) {
    const key = match[1]?.trim();
    if (key) {
      keys.add(key);
    }
  }
  return [...keys];
}

function readZoteroApiConfig(): ZoteroApiConfig {
  const config = vscode.workspace.getConfiguration("zoteroForQuarto");
  const apiConfig = config.get<any>("zoteroApi", {});
  return {
    libraryType: apiConfig.libraryType === "group" ? "group" : "user",
    libraryID: (apiConfig.libraryID || "").trim(),
    apiKey: (apiConfig.apiKey || "").trim(),
  };
}

function readPullExportUrl(): string {
  const config = vscode.workspace.getConfiguration("zoteroForQuarto");
  return (config.get<string>("pullExportUrl", "") || "").trim();
}

async function fetchTextFromUrl(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const client = parsed.protocol === "https:" ? https : parsed.protocol === "http:" ? http : null;
  if (!client) {
    return null;
  }

  const requestPath = `${parsed.pathname}${parsed.search}` || "/";
  return await new Promise<string | null>((resolve) => {
    client
      .get(
        {
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : undefined,
          path: requestPath,
          method: "GET",
          headers: { Accept: "text/plain, application/x-bibtex;q=0.9,*/*;q=0.8" },
        },
        (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () => {
            if (res.statusCode === 200 && text.trim()) {
              return resolve(text);
            }
            resolve(null);
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

function parseBibEntriesByKey(bibText: string): Map<string, string> {
  const entries = new Map<string, string>();
  const len = bibText.length;
  let cursor = 0;

  while (cursor < len) {
    const at = bibText.indexOf("@", cursor);
    if (at < 0) {
      break;
    }

    let i = at + 1;
    while (i < len && /[a-zA-Z]/.test(bibText[i])) {
      i += 1;
    }
    while (i < len && /\s/.test(bibText[i])) {
      i += 1;
    }

    const open = bibText[i];
    if (open !== "{" && open !== "(") {
      cursor = at + 1;
      continue;
    }
    const close = open === "{" ? "}" : ")";

    i += 1;
    while (i < len && /\s/.test(bibText[i])) {
      i += 1;
    }

    const keyStart = i;
    while (i < len && bibText[i] !== "," && bibText[i] !== close) {
      i += 1;
    }
    const key = bibText.slice(keyStart, i).trim();
    if (!key || bibText[i] !== ",") {
      cursor = at + 1;
      continue;
    }

    let depth = 1;
    let inQuote = false;
    let escaped = false;
    let end = i + 1;

    while (end < len && depth > 0) {
      const ch = bibText[end];
      if (inQuote) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inQuote = false;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === open) {
          depth += 1;
        } else if (ch === close) {
          depth -= 1;
        }
      }
      end += 1;
    }

    if (depth !== 0) {
      break;
    }

    const entry = bibText.slice(at, end).trim();
    if (entry && !entries.has(key)) {
      entries.set(key, entry);
    }
    cursor = end;
  }

  return entries;
}

function appendBibEntry(outPath: string, bib: string) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.appendFileSync(outPath, `\n\n${bib.trim()}\n`);
}

async function exportViaBbtJsonRpc(
  host: string,
  port: number,
  key: string
): Promise<string | null> {
  const rpcReq: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: "item.export",
    params: [[key], "Better BibTeX"],
    id: 1,
  };
  const body = JSON.stringify(rpcReq);

  return await new Promise<string | null>((resolve) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: "/better-bibtex/json-rpc",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          try {
            const rpc = JSON.parse(buf) as JsonRpcResponse;
            resolve(rpc.result?.trim() || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function exportViaZoteroApi(
  apiConfig: ZoteroApiConfig,
  key: string
): Promise<string | null> {
  const apiPath =
    `/${apiConfig.libraryType}s/${apiConfig.libraryID}/items/${encodeURIComponent(key)}` +
    `?format=bibtex${apiConfig.apiKey ? `&key=${encodeURIComponent(apiConfig.apiKey)}` : ""}`;

  return await new Promise<string | null>((resolve) => {
    https
      .get(
        {
          hostname: "api.zotero.org",
          path: apiPath,
          method: "GET",
          headers: { Accept: "application/x-bibtex" },
        },
        (res) => {
          let bib = "";
          res.on("data", (chunk) => (bib += chunk));
          res.on("end", () => {
            if (res.statusCode === 200 && bib.trim()) {
              return resolve(bib.trim());
            }
            resolve(null);
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

export async function insertCitation(range?: vscode.Range) {
  const config = vscode.workspace.getConfiguration("zoteroForQuarto");
  const host = config.get<string>("host", "127.0.0.1")!;
  const port = config.get<number>("port", 23119)!;
  const bibFile = config.get<string>("bibFile", "references.bib")!;
  const format = "pandoc"; // always Pandoc style → "@key1; @key2"
  const caywUrl = `http://${host}:${port}/better-bibtex/cayw?format=${format}`;

  // 1) Ask BBT for cite‑keys
  http
    .get(caywUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", async () => {
        data = data.trim();
        if (!data) {
          vscode.window.showInformationMessage(
            "No citation returned by Better BibTeX."
          );
          return;
        }

        if (/no endpoint found/i.test(data)) {
          vscode.window.showErrorMessage(
            'Better BibTeX CAYW endpoint was not found. Check Zotero + Better BibTeX setup and restart Zotero.'
          );
          return;
        }

        const citation = normalizeCitation(data);
        const keys = extractCitekeys(citation);
        if (!keys.length) {
          vscode.window.showWarningMessage(
            "No citation keys were returned. In Zotero 8, make sure selected items have a non-empty Citation key (run Better BibTeX key migration/refresh if needed)."
          );
          return;
        }

        // 2) Insert the in‑text citation [@key] or [@key1; @key2]
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }

        await editor.edit((edit) => {
          if (range) {
            edit.replace(range, citation);
          } else {
            for (const sel of editor.selections) {
              edit.replace(sel, citation);
            }
          }
        });

        // 3) Now fetch the full BibTeX entry via JSON‑RPC
        await fetchAndAppendBib(host, port, keys, bibFile);
      });

      res.on("error", (err) =>
        vscode.window.showErrorMessage(
          `Could not fetch citation keys: ${err.message}`
        )
      );
    })
    .on("error", (err) =>
      vscode.window.showErrorMessage(
        `Could not connect to Zotero/BBT: ${err.message}`
      )
    );
}

async function fetchAndAppendBib(
  host: string,
  port: number,
  citekeys: string[],
  bibFile: string
): Promise<AppendStats> {
  // 1) Resolve the output .bib path once
  let baseFolder: string;
  if (vscode.workspace.workspaceFolders?.length) {
    baseFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  } else {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "Cannot resolve .bib path without workspace or editor."
      );
      return {
        outPath: bibFile,
        requested: citekeys.length,
        appended: 0,
        skipped: 0,
        failed: citekeys.length,
      };
    }
    baseFolder = path.dirname(editor.document.uri.fsPath);
  }
  const outPath = path.isAbsolute(bibFile)
    ? bibFile
    : path.join(baseFolder, bibFile);
  const keys = [...new Set(citekeys.map((key) => key.trim()).filter(Boolean))];
  const apiConfig = readZoteroApiConfig();
  const pullExportUrl = readPullExportUrl();

  let appended = 0;
  let skipped = 0;
  let failed = 0;
  let pullExportUnavailable = false;
  let pullExportEntries: Map<string, string> | null | undefined;

  const ensurePullExportEntries = async (): Promise<Map<string, string> | null> => {
    if (pullExportEntries !== undefined) {
      return pullExportEntries;
    }
    if (!pullExportUrl) {
      pullExportEntries = null;
      return pullExportEntries;
    }

    const exported = await fetchTextFromUrl(pullExportUrl);
    if (!exported) {
      pullExportUnavailable = true;
      pullExportEntries = null;
      return pullExportEntries;
    }

    pullExportEntries = parseBibEntriesByKey(exported);
    if (pullExportEntries.size === 0) {
      pullExportUnavailable = true;
    }

    return pullExportEntries;
  };

  if (!keys.length) {
    vscode.window.showWarningMessage(
      "No valid citation keys found; nothing was appended."
    );
    return {
      outPath,
      requested: 0,
      appended,
      skipped,
      failed,
    };
  }

  // 2) Loop over each cite‑key
  for (const key of keys) {
    // --- Try Better BibTeX JSON‑RPC first ---
    const localBib = await exportViaBbtJsonRpc(host, port, key);
    if (localBib) {
      appendBibEntry(outPath, localBib);
      console.log(`BBT JSON-RPC: appended ${key}`);
      appended += 1;
      continue; // next key
    }

    // --- Fallback: Better BibTeX pull export URL ---
    const pullEntries = await ensurePullExportEntries();
    if (pullEntries?.has(key)) {
      appendBibEntry(outPath, pullEntries.get(key)!);
      console.log(`BBT pull-export: appended ${key}`);
      appended += 1;
      continue;
    }

    // --- Fallback: Zotero Web API v3 via HTTPS ---
    // (configure libraryType, libraryID, apiKey in settings)
    if (!apiConfig.libraryID) {
      skipped += 1;
      continue;
    }

    const webApiBib = await exportViaZoteroApi(apiConfig, key);
    if (webApiBib) {
      appendBibEntry(outPath, webApiBib);
      console.log(`Zotero Web API: appended ${key}`);
      appended += 1;
    } else {
      failed += 1;
      vscode.window.showWarningMessage(`Zotero API: no entry for "${key}"`);
    }
  }

  if (skipped > 0 && !apiConfig.libraryID) {
    vscode.window.showWarningMessage(
      `Skipped ${skipped} citation(s): no local Better BibTeX export found for those keys and no Zotero API library ID is configured.`
    );
  }
  if (pullExportUrl && pullExportUnavailable) {
    vscode.window.showWarningMessage(
      "Better BibTeX pull export URL is configured but could not be fetched or parsed. Check zoteroForQuarto.pullExportUrl."
    );
  }

  if (appended > 0) {
    const suffix =
      failed > 0 || skipped > 0
        ? ` (${failed} failed, ${skipped} skipped)`
        : "";
    vscode.window.showInformationMessage(
      `Appended ${appended} BibTeX entr${appended === 1 ? "y" : "ies"} to ${outPath}${suffix}.`
    );
  } else {
    vscode.window.showWarningMessage(
      `No BibTeX entries were appended to ${outPath}.`
    );
  }

  return {
    outPath,
    requested: keys.length,
    appended,
    skipped,
    failed,
  };
}
