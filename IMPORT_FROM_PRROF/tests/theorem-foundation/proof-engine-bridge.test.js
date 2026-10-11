const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const context = { console, module: undefined, globalThis: null, performance };
context.globalThis = context;
vm.createContext(context);
for (const file of ['theorem-catalog.js', 'geometry-relations.js', 'proof-rules.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context, { filename: file });
}

(async () => {
  // Run the ES-module bridge against the same deterministic global rule engine.
  globalThis.TheoremCatalog = context.TheoremCatalog;
  globalThis.GeometryRelations = context.GeometryRelations;
  globalThis.ProofRules = context.ProofRules;
  const { runProofEngine } = await import(pathToFileURL(path.join(root, 'js/proof_engine_bridge.js')).href);
  const positive = runProofEngine({ proof_engine: {
    facts: ['triangle(ABC)', 'triangle(DEF)', 'angle(A)=angle(D)', 'angle(B)=angle(E)'],
    goal: 'similar(ABC,DEF)'
  }});
  assert.equal(positive.success, true, 'complete AA premises should prove similarity');
  assert.equal(positive.status, 'proved-by-registered-rules');
  const negative = runProofEngine({ proof_engine: {
    facts: ['triangle(ABC)', 'triangle(DEF)', 'angle(A)=angle(D)'],
    goal: 'similar(ABC,DEF)'
  }});
  assert.equal(negative.success, false, 'one angle equality is insufficient for AA');
  const absent = runProofEngine({});
  assert.equal(absent.status, 'not-configured');
  console.log('proof engine bridge tests passed (positive, negative, opt-in guard)');
})().catch(error => { console.error(error); process.exitCode = 1; });
