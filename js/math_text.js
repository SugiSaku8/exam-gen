/** Convert common Japanese entrance-exam geometry notation into MathJax TeX.
 * The input is plain text (not trusted HTML); the result is safe HTML with TeX delimiters.
 */
export function formatMathText(value) {
  let text = escapeHtml(String(value ?? ''));
  const protectedTex = [];
  // Preserve TeX already supplied by templates, avoiding double conversion.
  text = text.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, match => {
    const token = `@@MATHJAX_TEX_${protectedTex.length}@@`;
    protectedTex.push(match);
    return token;
  });

  // Translate known English geometry statements before math tokenization.
  text = text
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*)\s+are on circle\s+([A-Z])/gi,
      (_, points, circle) => `${points.split(/\s*,\s*/).join('、')}は円${circle}の円周上にある`)
    .replace(/\b([A-Z])\s+lies on arc\s+([A-Z]{2})\b/gi, (_, point, arc) => `${point}は弧${arc}上にある`)
    .replace(/\barc\s+([A-Z]{2})\s*:\s*arc\s+([A-Z]{2})\s*[=＝]\s*(\d+)\s*:\s*(\d+)/gi,
      (_, first, second, a, b) => `弧${first}と弧${second}の長さの比は\\(${a}:${b}\\)`)
    .replace(/\barc\s+([A-Z]{2})/gi, '弧$1')
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*)\s+are collinear\b/gi,
      (_, points) => `${points.split(/\s*,\s*/).join('、')}は一直線上にある`)
    .replace(/△([A-Z]{3})\s+is isosceles,\s*so\s*(∠[A-Z]{3}\s*[=＝]\s*∠[A-Z]{3})/gi,
      (_, triangle, equality) => `△${triangle}は二等辺三角形なので、${equality}`)
    .replace(/\b([A-Z]{2})\s+is a diameter of circle\s+([A-Z])\b/gi, (_, segment, circle) => `${segment}は円${circle}の直径である`)
    .replace(/\bradius\s+([A-Z])\s*[=＝]\s*(\d+(?:\.\d+)?)\s*(cm)?\b/gi,
      (_, circle, radius, unit) => `円${circle}の半径は${radius}${unit ? ' cm' : ''}`)
    .replace(/angle_角度の名前/gi, '角度')
    .replace(/\bangle_([A-Z]{3})\b/g, '∠$1')
    .replace(/\btriangle_([A-Z]{3})\b/gi, '△$1')
    .replace(/\bdiameter_([A-Z]{2})\b/gi, '$1は直径')
    .replace(/\bcircle_([A-Z])\b/gi, '円$1')
    .replace(/\bangle_([A-Za-z][A-Za-z0-9_]*)\b/g, (_, label) => `角${label.replace(/_/g, ' ')}`);

  // Keep arc-length equalities together as one complete mathematical expression.
  text = text.replace(/弧\s*([A-Z]{2})\s*[=＝]\s*(\d+)\s*π(?:\s*\/\s*(\d+))?(?:\s*(cm))?/g,
    (_, arc, numerator, denominator, unit) => `\\(\\widehat{${arc}}=${denominator ? `\\frac{${numerator}\\pi}{${denominator}}` : `${numerator}\\pi`}${unit ? '\\,\\mathrm{cm}' : ''}\\)`);

  // Exact multiples of pi, including fractional arc lengths such as 46π/5.
  text = text.replace(/(\d+(?:\.\d+)?)\s*π\s*\/\s*(\d+)(?:\s*(cm))?/g,
    (_, numerator, denominator, unit) => `\\(\\displaystyle \\frac{${numerator}\\pi}{${denominator}}${unit ? '\\,\\mathrm{cm}' : ''}\\)`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*π(?![A-Za-z])/g, (_, n) => `\\(${n}\\pi\\)`);
  text = text.replace(/π\s*\/\s*(\d+)/g, (_, denominator) => `\\(\\displaystyle \\frac{\\pi}{${denominator}}\\)`);

  // Whole radical fraction, e.g. (7+4√(AD²+16AE²))/23.
  text = text.replace(/\(([^()\n]*√\([^()\n]*\)[^()\n]*)\)\s*\/\s*(\d+)/g,
    (_, numerator, denominator) => `\\[\\displaystyle \\frac{${toTexExpression(numerator)}}{${denominator}}\\]`);
  // Radical with a parenthesized expression, including superscripts.
  text = text.replace(/√\(((?:[^()]|\([^()]*\))*)\)/g, (_, inside) => `\\(\\sqrt{${toTexExpression(inside)}}\\)`);
  // Equality of two angles/arcs is kept in one TeX span, rather than splitting around '='.
  text = text.replace(/∠\s*([A-Z]{3})\s*[＝=]\s*∠\s*([A-Z]{3})/g, (_, a, b) => {
    const token = `@@MATHJAX_TEX_${protectedTex.length}@@`;
    protectedTex.push(`\\(\\angle ${a}=\\angle ${b}\\)`);
    return token;
  });
  text = text.replace(/弧\s*([A-Z]{2})\s*[＝=]\s*弧\s*([A-Z]{2})/g, (_, a, b) => {
    const token = `@@MATHJAX_TEX_${protectedTex.length}@@`;
    protectedTex.push(`弧\\(\\widehat{${a}}=\\widehat{${b}}\\)`);
    return token;
  });
  // Similarity / congruence statements must be converted as one math span.
  text = text.replace(/△\s*([A-Z]{3})\s*(?:∽|∼|≃|≅|≡)\s*△\s*([A-Z]{3})/g,
    (_, a, b) => `\\(\\triangle ${a}\\sim\\triangle ${b}\\)`);
  text = text.replace(/△\s*([A-Z]{3})/g, (_, a) => `\\(\\triangle ${a}\\)`);
  text = text.replace(/∠\s*([A-Z]{3})/g, (_, a) => `\\(\\angle ${a}\\)`);
  text = text.replace(/弧\s*([A-Z]{2})/g, (_, a) => `弧\\(\\widehat{${a}}\\)`);

  // Common equalities and geometric operators. Keep chained equalities together.
  text = text.replace(/([A-Z]{2,3}(?:\s*[＝=]\s*(?:[A-Z]{2,3}|\d+(?:\.\d+)?(?:\s*cm)?)){2,})/g, expression => {
    const token = `@@MATHJAX_TEX_${protectedTex.length}@@`;
    protectedTex.push(`\\(${expression.replace(/＝/g, '=').replace(/\s*cm/g, '\\,\\mathrm{cm}')}\\)`);
    return token;
  });
  text = text.replace(/(?<!angle )([A-Z]{2,3})\s*[＝=]\s*([A-Z]{2,3})/g, (_, a, b) => `\\(${a}=${b}\\)`);
  text = text.replace(/([A-Z]{2,3})\s*[＝=]\s*(\d+(?:\.\d+)?)(?:\s*cm)?/g, (_, segment, length) => `\\(${segment}=${length}\\)`);
  text = text.replace(/([A-Z]{2,3})\s*⟂\s*([A-Z]{2,3})/g, (_, a, b) => `\\(${a}\\perp ${b}\\)`);
  text = text.replace(/([A-Z]{2,3})\s*∥\s*([A-Z]{2,3})/g, (_, a, b) => `\\(${a}\\parallel ${b}\\)`);
  text = text.replace(/√(\d+)/g, (_, n) => `\\(\\sqrt{${n}}\\)`);
  text = text.replace(/([A-Z]{1,3})²/g, (_, x) => `\\(${x}^2\\)`);
  text = text.replace(/(\d+(?:\.\d+)?)°/g, (_, n) => `\\(${n}^\\circ\\)`);
  text = text.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_, n, d) => `\\(\\displaystyle \\frac{${n}}{${d}}\\)`);
  text = text.replace(/∽|∼/g, '\\(\\sim\\)')
    .replace(/≡|≅/g, '\\(\\cong\\)')
    .replace(/⟂/g, '\\(\\perp\\)')
    .replace(/∥/g, '\\(\\parallel\\)');

  text = text.replace(/@@MATHJAX_TEX_(\d+)@@/g, (_, i) => protectedTex[Number(i)] ?? '');
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
