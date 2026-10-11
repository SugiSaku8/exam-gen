/*
 * 問題画面の表示内容・文字サイズ調整
 * 表示内容を変えたいときは PROBLEM_CONTENT の値だけ編集してください。
 */
(() => {
  'use strict';
  window.PROBLEM_CONTENT = {
    difficultyStars: '★★★★★★★★',
    typeFallback: '相似',
    criterionFallback: '2辺と角',
    conditionLabel: '条件',
    followupHeading: '追問',
    answerButton: 'ANSWER',
    saveButton: 'SAVE',
    pdfButton: 'PDF',
    // 自動縮小の範囲（px）。この範囲でパネル内に収まるように調節します。
    fontFit: { min: 12, max: 22, step: 0.5 }
  };

  function fitText(element) {
    if (!element || !element.isConnected || element.clientWidth < 2 || element.clientHeight < 2) return;
    const config = window.PROBLEM_CONTENT.fontFit;
    const computed = getComputedStyle(element);
    const base = Math.min(config.max, parseFloat(computed.fontSize) || config.max);
    element.style.fontSize = `${base}px`;
    let size = base;
    // まず読みやすい大きさから、はみ出す場合だけ段階的に縮小。
    while (size > config.min && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)) {
      size = Math.max(config.min, size - config.step);
      element.style.fontSize = `${size}px`;
    }
    element.classList.toggle('font-fit-minimum', size <= config.min && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1));
  }

  function fitAll() {
    document.querySelectorAll('.type-pill,.meta-pill,.difficulty-pill,.question-panel,.solution-panel,.conditions-block li,.answer-steps,.followup-block').forEach(fitText);
  }
  window.fitProblemPanelText = fitAll;
  const scheduleFit = () => requestAnimationFrame(() => requestAnimationFrame(fitAll));
  document.addEventListener('DOMContentLoaded', () => {
    scheduleFit();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scheduleFit);
      document.querySelectorAll('.problem-topline,.problem-layout,.figure-panel,.question-panel,.solution-panel').forEach(el => observer.observe(el));
    }
    window.addEventListener('resize', scheduleFit, { passive: true });
  });
})();
