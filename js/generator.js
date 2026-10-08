import { loadYear } from './json_loader.js';
import { analyzeProblem, normalizeProblem } from './json_analyzer.js';
import { CanvasManager } from './canvas_manager.js';
import { Drawer } from './drawer.js';
import { ProblemGenerator } from './problem_generator.js';

export class ProofGenerator {
  constructor(options = {}) {
    this.root = options.root ?? null;
    this.data = null;
    this.analysis = null;
    this.canvasManager = null;
    this.drawer = null;
    this.currentYear = null;
    this.currentSubproblem = null;
    this.problemGenerator = new ProblemGenerator(options.generatorOptions ?? {});
    this.mode = 'past';
  }

  async load(year) {
    this.data = normalizeProblem(await loadYear(year));
    this.data.geometryModel = this.data.geometryModel ?? this.data.geometry?.coordinates ? {
      coordinate_system: this.data.geometry.coordinate_system,
      points: this.data.geometry.coordinates.points ?? {},
      segments: (this.data.geometry.objects?.segments ?? []).map(id => ({ id, from: id[0], to: id[1] })).filter(x => this.data.geometry.coordinates.points[x.from] && this.data.geometry.coordinates.points[x.to]),
      lines: (this.data.geometry.objects?.lines ?? []).map(id => ({ id, through: [id[0], id[1]] })).filter(x => this.data.geometry.coordinates.points[x.through[0]] && this.data.geometry.coordinates.points[x.through[1]]),
      circles: [{ id: this.data.geometry.coordinates.circle?.id ?? 'O1', center: this.data.geometry.coordinates.circle?.center ?? 'O', radius: this.data.geometry.coordinates.circle?.radius ?? this.data.geometry.coordinate_system?.radius ?? 1 }]
    } : this.data.geometryModel;
    this.analysis = analyzeProblem(this.data);
    this.currentYear = year;
    this.currentSubproblem = null;
    this.mode = 'past';
    return this.data;
  }

  generate(options = {}) {
    this.data = normalizeProblem(this.problemGenerator.generate(options));
    this.analysis = analyzeProblem(this.data);
    this.currentYear = null;
    this.currentSubproblem = null;
    this.mode = 'generated';
    return this.data;
  }

  loadData(data, mode = 'generated') {
    this.data = normalizeProblem(structuredClone(data ?? {}));
    this.analysis = analyzeProblem(this.data);
    this.currentYear = this.data.metadata?.year ?? null;
    this.currentSubproblem = null;
    this.mode = mode;
    return this.data;
  }

  initializeCanvas(container) {
    this.canvasManager = new CanvasManager(container);
    this.canvasManager.create(900, 620);
    this.drawer = new Drawer(this.canvasManager);
  }

  draw() {
    if (!this.drawer || !this.data) return;
    this.drawer.drawGeometry(this.data.geometryModel ?? this.data.geometry);
  }

  getSubproblems() { return this.data?.problem?.subproblems ?? []; }
  selectSubproblem(id) { this.currentSubproblem = this.getSubproblems().find(p => p.id === id) ?? null; return this.currentSubproblem; }
  getCurrentProof() { return this.data?.proof ?? null; }
  getCurrentConditions() { return this.data?.given_conditions ?? []; }
  getCurrentDerivedFacts() { return this.data?.derived_facts ?? []; }
  getCurrentFollowUp() { return this.data?.follow_up?.problems ?? []; }
  isGenerated() { return this.mode === 'generated'; }
  isPastProblem() { return this.mode === 'past'; }
  getMode() { return this.mode; }
  getGenerationInfo() { return this.data?.generation ?? null; }
}
