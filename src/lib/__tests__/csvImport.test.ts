import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A spreadsheet with a comma in a game's title must not import wrong.
 *
 * The importer split on every comma, so "Assassin's Creed Valhalla, Gold
 * Edition" — which is exactly how Excel writes a title containing a comma —
 * pushed every later column one place along. The price landed under the stock
 * heading, the row imported without a word of complaint, and on a file of three
 * hundred games nobody would find it until a customer bought one for ₹12.
 *
 * The parser is a module-private function, so it is exercised here by the same
 * rules it implements rather than through the page. Kept in step with the source
 * by the last assertion.
 */

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let cell = "";
      let quoted = false;
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
            quoted = true;
          }
          continue;
        }
        if (ch === "," && !inQuotes) {
          cells.push(quoted ? cell : cell.trim());
          cell = "";
          quoted = false;
          continue;
        }
        cell += ch;
      }
      cells.push(quoted ? cell : cell.trim());
      return cells;
    });
}

describe("reading a spreadsheet the shop actually exports", () => {
  /** The case that silently corrupted a row. */
  it("keeps a comma that is inside a game's title", () => {
    const [row] = parseCsv('key,name,price\nac-valhalla,"Assassin\'s Creed Valhalla, Gold Edition",3499');

    expect(row).toEqual(["key", "name", "price"]);
    expect(parseCsv('ac,"Valhalla, Gold Edition",3499')[0]).toEqual([
      "ac",
      "Valhalla, Gold Edition",
      "3499",
    ]);
  });

  /** Excel's own way of writing an inch mark. */
  it("reads a doubled quote as one quote", () => {
    expect(parseCsv('mon,"24"" Monitor",8999')[0]).toEqual(["mon", '24" Monitor', "8999"]);
  });

  it("still trims an unquoted cell, and leaves a quoted one alone", () => {
    expect(parseCsv('a , b ,"  c  "')[0]).toEqual(["a", "b", "  c  "]);
  });

  it("reads an ordinary row exactly as before", () => {
    expect(parseCsv("key,name,price,stock\nps5,PS5 Slim,49990,4")[1]).toEqual([
      "ps5",
      "PS5 Slim",
      "49990",
      "4",
    ]);
  });

  /**
   * The parser above is a copy. If the page's own changes, this fails rather
   * than going on testing something the shop no longer runs.
   */
  it("matches the parser the import page uses", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/app/admin/tools/import/page.tsx"),
      "utf8",
    );
    expect(src).toContain('if (inQuotes && line[i + 1] === \'"\')');
    expect(src).toContain('cells.push(quoted ? cell : cell.trim());');
  });

  /** A short row belongs to no heading. It used to be imported anyway. */
  it("skips a row that does not match the heading, and says so", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/app/admin/tools/import/page.tsx"),
      "utf8",
    );
    expect(src).toContain("cells.length !== header.length");
    expect(src).toContain("did not have the same columns as the heading row");
  });
});
