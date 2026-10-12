/**
 * Convert exam geometry text and inline mathematical notation into safe HTML
 * with MathJax delimiters. All generated TeX is immediately tokenized so later
 * substitutions can never corrupt the inside of a formula (e.g. 29+17√43)/23.
 */
export function formatMathText(value) {
  let text = escapeHtml(String(value ?? ''));
  const math = [];
  const stash = (tex, display = false) => {
    const token = `@@MATHJAX_TEX_${math.length}@@`;
    math.push(display ? `\\[\\displaystyle ${tex}\\]` : `\\(${tex}\\)`);
    return token;
  };

  // Preserve existing MathJax expressions first.
  text = text.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, s => {
    const token = `@@MATHJAX_TEX_${math.length}@@`;
    math.push(s);
    return token;
  });

  // Capture complete parenthesized numerators BEFORE any notation replacement.
  // Otherwise a radical pass can convert only the numerator and leave `)/23`.
  text = protectParenthesizedFractions(text, stash);

  // Normalize common English labels/conditions from imported templates.
  text = text
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*)\s+are on circle\s+([A-Z])/gi,
      (_, points, circle) => `${points.split(/\s*,\s*/).join('、')}は円${circle}の円周上にある`)
    .replace(/\b([A-Z])\s+lies on arc\s+([A-Z]{2})\b/gi, (_, p, a) => `${p}は弧${a}上にある`)
    .replace(/\barc\s+([A-Z]{2})\s*:\s*arc\s+([A-Z]{2})\s*[=＝]\s*(\d+)\s*:\s*(\d+)/gi,
      (_, a, b, n, d) => `弧${a}と弧${b}の長さの比は${stash(`${n}:${d}`)}`)
    .replace(/\barc\s+([A-Z]{2})/gi, '弧$1')
    .replace(/\b([A-Z]{2})\s+is a diameter of circle\s+([A-Z])\b/gi, (_, s, c) => `${s}は円${c}の直径である`)
    .replace(/\bradius\s+([A-Z])\s*[=＝]\s*(\d+(?:\.\d+)?)\s*(cm)?\b/gi, (_, c, r, u) => `円${c}の半径は${r}${u ? ' cm' : ''}`)
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*)\s+are collinear\b/gi, (_, ps) => `${ps.split(/\s*,\s*/).join('、')}は一直線上にある`)
    .replace(/(?:△\s*)?\b([A-Z]{3})\s+is isosceles,\s*so\s*∠([A-Z]{3})\s*[=＝]\s*∠([A-Z]{3})/gi,
      (_, tri, a, b) => `${stash(`\\triangle ${tri}`)}は二等辺三角形なので、${stash(`\\angle ${a}=\\angle ${b}`)}`)
    .replace(/angle_角度の名前/gi, '角度')
    .replace(/\bangle_([A-Z]{3})\b/g, (_, a) => stash(`\\angle ${a}`))
    .replace(/\bangle_([A-Za-z][A-Za-z0-9_]*)\b/g, (_, a) => `角${a.replace(/_/g, ' ')}`)
    .replace(/\btriangle_([A-Z]{3})\b/gi, (_, a) => stash(`\\triangle ${a}`))
    .replace(/\bdiameter_([A-Z]{2})\b/gi, '$1は直径')
    .replace(/\bcircle_([A-Z])\b/gi, '円$1');

  // Arc length forms should remain one complete formula.
  text = text.replace(/(?:弧\s*)?([A-Z]{2})\s*[=＝]\s*(\d+(?:\.\d+)?)\s*π\s*\/\s*(\d+)(?:\s*(cm))?/g,
    (whole, arc, n, d, unit) => {
      const isArc = whole.trim().startsWith('弧');
      return stash(`${isArc ? `\\widehat{${arc}}=` : ''}\\frac{${n}\\pi}{${d}}${unit ? '\\,\\mathrm{cm}' : ''}`);
    });
  text = text.replace(/(?:弧\s*)?([A-Z]{2})\s*[=＝]\s*(\d+(?:\.\d+)?)\s*π(?![A-Za-z])(?:\s*(cm))?/g,
    (whole, arc, n, unit) => stash(`${whole.trim().startsWith('弧') ? `\\widehat{${arc}}=` : ''}${n}\\pi${unit ? '\\,\\mathrm{cm}' : ''}`));

  // Pi expressions and ordinary fractions are converted before any broad symbol
  // replacements. Each result is stashed, preventing partial conversion later.
  text = text.replace(/(\d+(?:\.\d+)?)\s*π\s*\/\s*(\d+)(?:\s*(cm))?/g,
    (_, n, d, u) => stash(`\\frac{${n}\\pi}{${d}}${u ? '\\,\\mathrm{cm}' : ''}`));
  text = text.replace(/π\s*\/\s*(\d+)/g, (_, d) => stash(`\\frac{\\pi}{${d}}`));
  text = text.replace(/(\d+(?:\.\d+)?)\s*π(?![A-Za-z])/g, (_, n) => stash(`${n}\\pi`));
  // Keep arithmetic expressions involving radicals together, not as isolated symbols.
  text = text.replace(/\(?[+-]?\d+(?:\s*[+-]\s*\d+\s*√(?:\([^()]*\)|\d+))+\)?/g, expr =>
    stash(toTexExpression(expr.replace(/^\(|\)$/g, ''))));
  text = text.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_, n, d) => stash(`\\frac{${n}}{${d}}`));

  // Geometry relations, preserving complete equalities as one formula.
  text = text.replace(/∠\s*([A-Z]{3})\s*[＝=]\s*∠\s*([A-Z]{3})/g, (_, a, b) => stash(`\\angle ${a}=\\angle ${b}`));
  text = text.replace(/△\s*([A-Z]{3})\s*(?:∽|∼|≃|≅|≡)\s*△\s*([A-Z]{3})/g, (_, a, b) => stash(`\\triangle ${a}\\sim\\triangle ${b}`));
  text = text.replace(/△\s*([A-Z]{3})/g, (_, a) => stash(`\\triangle ${a}`));
  text = text.replace(/∠\s*([A-Z]{3})/g, (_, a) => stash(`\\angle ${a}`));
  text = text.replace(/弧\s*([A-Z]{2})/g, (_, a) => `弧${stash(`\\widehat{${a}}`)}`);
  text = text.replace(/([A-Z]{2,3}(?:\s*[＝=]\s*(?:[A-Z]{2,3}|\d+(?:\.\d+)?(?:\s*cm)?)){2,})/g, expr =>
    stash(expr.replace(/＝/g, '=').replace(/\s*cm/g, '\\,\\mathrm{cm}')));
  text = text.replace(/([A-Z]{2,3})\s*[＝=]\s*([A-Z]{2,3})/g, (_, a, b) => stash(`${a}=${b}`));
  text = text.replace(/([A-Z]{2,3})\s*[＝=]\s*(\d+(?:\.\d+)?)(?:\s*cm)?/g, (_, a, n) => stash(`${a}=${n}`));
  text = text.replace(/([A-Z]{2,3})\s*⟂\s*([A-Z]{2,3})/g, (_, a, b) => stash(`${a}\\perp ${b}`));
  text = text.replace(/([A-Z]{2,3})\s*∥\s*([A-Z]{2,3})/g, (_, a, b) => stash(`${a}\\parallel ${b}`));
  text = text.replace(/√\(((?:[^()]|\([^()]*\))*)\)/g, (_, inside) => stash(`\\sqrt{${toTexExpression(inside)}}`));
  text = text.replace(/√(\d+)/g, (_, n) => stash(`\\sqrt{${n}}`));
  text = text.replace(/([A-Z]{1,3})²/g, (_, x) => stash(`${x}^2`));
  text = text.replace(/(\d+(?:\.\d+)?)°/g, (_, n) => stash(`${n}^\\circ`));
  text = text.replace(/∽|∼/g, () => stash('\\sim'))
    .replace(/≡|≅/g, () => stash('\\cong'))
    .replace(/⟂/g, () => stash('\\perp'))
    .replace(/∥/g, () => stash('\\parallel'));

  return text.replace(/@@MATHJAX_TEX_(\d+)@@/g, (_, i) => math[Number(i)] ?? '');
}

function protectParenthesizedFractions(input, stash) {
  let text = input;
  const suffixPattern = /\)\s*\/\s*(\d+(?:\.\d+)?)(?![A-Za-z0-9])/g;
  const matches = [...text.matchAll(suffixPattern)];
  // Right-to-left replacement keeps earlier match offsets valid.
  for (let m = matches.length - 1; m >= 0; m--) {
    const match = matches[m];
    const close = match.index;
    let depth = 0;
    let open = -1;
    for (let i = close; i >= 0; i--) {
      if (text[i] === ')') depth++;
      else if (text[i] === '(') {
        depth--;
        if (depth === 0) { open = i; break; }
      }
    }
    if (open < 0) continue;
    const numerator = text.slice(open + 1, close).trim();
    if (!numerator || numerator.includes('@@MATHJAX_TEX_')) continue;
    const denominator = match[1];
    const end = match.index + match[0].length;
    const replacement = stash(`\\frac{${toTexExpression(numerator)}}{${denominator}}`, true);
    text = text.slice(0, open) + replacement + text.slice(end);
  }
  return text;
}

function toTexExpression(value) {
  return String(value ?? '')
    .replace(/√\(((?:[^()]|\([^()]*\))*)\)/g, (_, inside) => `\\sqrt{${toTexExpression(inside)}}`)
    .replace(/√(\d+)/g, (_, n) => `\\sqrt{${n}}`)
    .replace(/([A-Z]{1,3})²/g, (_, x) => `${x}^2`)
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/＝/g, '=');
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
