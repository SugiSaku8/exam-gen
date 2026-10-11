# 2018–2020 templates and math rendering

## Added source years
- `data/source_templates/2018.json`, `2019.json`, and `2020.json` preserve the three uploaded source datasets.
- `js/templates/source_year_generators.js` adapts these source records to the application's problem, proof, follow-up, and geometry model.
- The new template families are available in automatic generation at difficulty 5 and in past-question mode.
- Figure layout changes use deterministic seeded rotation/reflection. The 2020 length problem also uses a uniform scale from a reviewed set and recomputes the exact fractional answer (`5/3`, `20/9`, `25/9`, `10/3` cm) without decimal approximation.
- The source-derived adapters retain the original proof statements. They are deliberately marked `verificationTier: 'source-adapter'`: they are not represented as having the same formal proof certificate and independent mathematical audit as the original seven template families. The student answer checker performs registered-step text matching for these three templates, not general theorem proving.

## Formula rendering
- MathJax 3 renders common geometry notation as TeX: triangles, angles, angle equalities, roots, fractions, similarity/congruence, parallel and perpendicular symbols.
- PDF printing waits for MathJax typesetting when the CDN is available.
- If the MathJax CDN cannot load, the app keeps the original Unicode notation readable.
- No LLM is used for template selection or problem generation.
