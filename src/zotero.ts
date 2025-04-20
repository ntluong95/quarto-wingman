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
          return;
        }

        // 2) Insert the in‑text citation [@key] or [@key1; @key2]
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }

        // normalize spacing around semicolons
        let raw = data.replace(/\s*;\s*/g, "; ");
        let citation =
          raw.startsWith("[") && raw.endsWith("]") ? raw : `[${raw}]`;

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
        const keys = data.split(/\s*;\s*/).map((k) => k.replace(/^@/, ""));
        fetchAndAppendBib(host, port, keys, bibFile);
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
) {
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
      return;
    }
    baseFolder = path.dirname(editor.document.uri.fsPath);
  }
  const outPath = path.isAbsolute(bibFile)
    ? bibFile
    : path.join(baseFolder, bibFile);

  // 2) Loop over each cite‑key
  for (const key of citekeys) {
    // --- Try Better BibTeX JSON‑RPC first ---
    const rpcReq = {
      jsonrpc: "2.0",
      method: "item.export",
      params: [[key], "Better BibTeX"],
      id: 1,
    };
    const body = JSON.stringify(rpcReq);

    let didLocal = await new Promise<boolean>((resolve) => {
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
              const rpc = JSON.parse(buf);
              if (rpc.result?.trim()) {
                fs.appendFileSync(outPath, `\n\n${rpc.result.trim()}\n`);
                console.log(`BBT JSON‑RPC: appended ${key}`);
                return resolve(true);
              }
            } catch {
              /* ignore parse errors */
            }
            resolve(false);
          });
        }
      );
      req.on("error", () => resolve(false));
      req.write(body);
      req.end();
    });

    if (didLocal) {
      continue; // next key
    }

    // --- Fallback: Zotero Web API v3 via HTTPS ---
    // (make sure you’ve configured libraryType, libraryID, apiKey in your settings)
    const config = vscode.workspace.getConfiguration("zoteroForQuarto");
    const apiConfig = config.get<any>("zoteroApi", {});
    const libType = apiConfig.libraryType || "user"; // “user” or “group”
    const libID = apiConfig.libraryID || "";
    const apiKey = apiConfig.apiKey || "";

    if (!libID) {
      vscode.window.showWarningMessage(
        `Skipping "${key}": not in BBT and no Zotero API ID.`
      );
      continue;
    }

    const apiPath =
      `/${libType}s/${libID}/items/${key}` +
      `?format=bibtex${apiKey ? `&key=${apiKey}` : ""}`;

    await new Promise<void>((resolve) => {
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
                fs.appendFileSync(outPath, `\n\n${bib.trim()}\n`);
                console.log(`Zotero Web API: appended ${key}`);
              } else {
                vscode.window.showWarningMessage(
                  `Zotero API ${res.statusCode}: no entry for "${key}"`
                );
              }
              resolve();
            });
          }
        )
        .on("error", (err) => {
          vscode.window.showErrorMessage(
            `Zotero API error for "${key}": ${err.message}`
          );
          resolve();
        });
    });
  }

  vscode.window.showInformationMessage(`Done appending BibTeX to ${outPath}`);
}
