import { loadYear } from './json_loader.js';

import {
  analyzeProblem,
  normalizeProblem
} from '../../../demo/exam-gen-geometry-v1/script/proof-generator/json_analyzer.js';

import { CanvasManager } from './canvas_manager.js';

import { Drawer } from '../../../demo/exam-gen-geometry-v1/script/proof-generator/drawer.js';


export class ProofGenerator {
  constructor(options = {}) {
    this.root = options.root ?? null;

    this.data = null;
    this.analysis = null;

    this.canvasManager = null;
    this.drawer = null;

    this.currentYear = null;
    this.currentSubproblem = null;
  }

  async load(year) {
    this.data = await loadYear(year);

    this.data = normalizeProblem(this.data);

    this.analysis = analyzeProblem(this.data);

    this.currentYear = year;

    return this.data;
  }

  initializeCanvas(container) {
    this.canvasManager =
      new CanvasManager(container);

    this.canvasManager.create(
      700,
      500
    );

    this.drawer =
      new Drawer(
        this.canvasManager.getContext()
      );
  }

  draw() {
    if (!this.drawer || !this.data) {
      return;
    }

    this.drawer.drawProblem(this.data);
  }

  getSubproblems() {
    return this.data?.problem?.subproblems ?? [];
  }

  selectSubproblem(id) {
    const subproblem =
      this.getSubproblems()
        .find(problem => problem.id === id);

    this.currentSubproblem = subproblem ?? null;

    return this.currentSubproblem;
  }

  getCurrentProof() {
    return this.data?.proof ?? null;
  }

  getCurrentConditions() {
    return this.data?.given_conditions ?? [];
  }

  getCurrentDerivedFacts() {
    return this.data?.derived_facts ?? [];
  }

  getCurrentFollowUp() {
    return this.data?.follow_up?.problems ?? [];
  }
}
