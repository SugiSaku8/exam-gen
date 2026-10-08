import { logger } from './logger.js';
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
    const finish = logger.time('GEN', `過去問ロード ${year}`);
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
    finish({ year, subproblems: this.getSubproblems().length });
    logger.info('GEN', '過去問ロード完了', this.data.metadata);
    return this.data;
  }

  generate(options = {}) {
    const finish = logger.time('GEN', '類題生成');
    logger.info('GEN', '生成オプション', options);
    this.data = normalizeProblem(this.problemGenerator.generate(options));
    this.analysis = analyzeProblem(this.data);
    this.currentYear = null;
    this.currentSubproblem = null;
    this.mode = 'generated';
    finish({ template: this.data.generation?.template_id, seed: this.data.generation?.seed });
    logger.info('GEN', '類題生成完了', this.data.generation);
    return this.data;
  }

  loadData(data, mode = 'generated') {
    logger.info('GEN', '保存データを読み込み', { mode, year: data?.metadata?.year });
    this.data = normalizeProblem(structuredClone(data ?? {}));
    this.analysis = analyzeProblem(this.data);
    this.currentYear = this.data.metadata?.year ?? null;
    this.currentSubproblem = null;
    this.mode = mode;
    return this.data;
  }

  initializeCanvas(container) {
    logger.info('CANVAS', 'Canvasを初期化');
    this.canvasManager = new CanvasManager(container);
    this.canvasManager.create(900, 620);
    this.drawer = new Drawer(this.canvasManager);
  }

  draw() {
    if (!this.drawer || !this.data) { logger.warn('DRAW', '描画対象がありません'); return; }
    logger.debug('DRAW', '図形描画を開始');
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
