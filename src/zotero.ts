// zotero.ts
import * as vscode from "vscode";
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

function fetchAndAppendBib(
  host: string,
  port: number,
  citekeys: string[],
  bibFile: string
) {
  // build JSON‑RPC call with ONLY the two required params
  const rpcReq = {
    jsonrpc: "2.0",
    method: "item.export",
    params: [
      citekeys, // [ "key1", "key2", ... ]
      "Better BibTeX", // translator name
    ],
    id: 1,
  };
  const body = JSON.stringify(rpcReq);

  const req = http.request(
    {
      hostname: host,
      port: port,
      path: "/better-bibtex/json-rpc",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      let bibData = "";
      res.on("data", (chunk) => (bibData += chunk));
      res.on("end", () => {
        // … same parsing & appending logic …
      });
    }
  );

  req.on("error", (err) =>
    vscode.window.showErrorMessage(`JSON‑RPC request failed: ${err.message}`)
  );
  req.write(body);
  req.end();
}
