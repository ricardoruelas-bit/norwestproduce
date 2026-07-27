import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

async function importTypeScriptModule(relativePath) {
  const sourcePath = new URL(`../${relativePath}`, import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
  });
  const filePath = path.join(tmpdir(), `norwest-${path.basename(relativePath, ".ts")}-${process.pid}-${Date.now()}.mjs`);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(filePath, output.outputText));
  return import(pathToFileURL(filePath).href);
}

const sellerProfit = await importTypeScriptModule("lib/seller-profit.ts");

test("reparte la utilidad disponible entre vendedor asignado, RR y GM", () => {
  const allocations = sellerProfit.calculateSellerProfitAllocations({
    saleProfit: 1000,
    norwestProfitPercentage: 16,
    assignedSeller: "Maria Seller",
    assignedSellerPercentage: 34,
    sellers: [
      { fullName: "Ricardo Ruelas", alias: "RR" },
      { fullName: "Gustavo Martinez", alias: "GM" },
    ],
  });

  assert.deepEqual(allocations, [
    { sellerName: "Maria Seller", amount: 285.6 },
    { sellerName: "Ricardo Ruelas", amount: 277.2 },
    { sellerName: "Gustavo Martinez", amount: 277.2 },
  ]);
});

test("RR es alias de Ricardo Ruelas y se acumula cuando participa en la regla", () => {
  const allocations = sellerProfit.calculateSellerProfitAllocations({
    saleProfit: 1000,
    norwestProfitPercentage: 16,
    assignedSeller: "RR",
    assignedSellerPercentage: 34,
    sellers: [
      { fullName: "Ricardo Ruelas", alias: "RR" },
      { fullName: "Gustavo Martinez", alias: "GM" },
    ],
  });

  assert.deepEqual(allocations, [
    { sellerName: "Ricardo Ruelas", amount: 562.8 },
    { sellerName: "Gustavo Martinez", amount: 277.2 },
  ]);
});

test("no genera utilidad de vendedores cuando la venta tiene perdida", () => {
  const allocations = sellerProfit.calculateSellerProfitAllocations({
    saleProfit: -100,
    norwestProfitPercentage: 16,
    assignedSeller: "Maria Seller",
    assignedSellerPercentage: 34,
  });

  assert.equal(allocations.reduce((sum, item) => sum + item.amount, 0), 0);
});
