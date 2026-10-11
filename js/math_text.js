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
