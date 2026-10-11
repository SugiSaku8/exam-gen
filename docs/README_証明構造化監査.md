# 証明構造化監査（保守的な逐次検証）

`js/proof_structure_adapter.js` は、既存の証明データを記号的な命題に変換し、`ProofRules` による逐次検証を行います。

## 検証方式

1. `given_conditions` から、現在のアダプターが安全に記号化できる明示条件だけを初期事実にします。
2. 図形データに明記された三角形を構造宣言として追加します。
3. 証明ステップ内の明示的な角の等式・線分の等式・相似・合同を抽出します。
4. 各命題を、それ以前に受理された事実だけから証明エンジンで検証します。
5. 証明できた命題だけを後続ステップの事実に追加します。
6. 最終目標を別途検証します。

## 状態の意味

- `proved-from-accepted-facts`: 登録済み規則から導出できた
- `already-given-or-established`: すでに明示条件、図形構造、または前段の証明で得られている
- `not-proved-with-current-rules`: 現在の事実と推論規則では導出できない
- `unsupported-statement`: 現在の記号化規則で命題を抽出できない
- `engine-error`: 検証中にエラーが発生した

「未証明」は「数学的に誤り」を意味しません。円周角、平行線、弧、交点などの命題について、データが示す条件だけで証明できるようにするには、追加の形式化規則と点の位置関係の検証が必要です。

## 意図的に行わないこと

- `reason` の文章だけから、前提事実を自動生成しない
- 図の座標だけから、同じ側の円周角などの位置関係を推測しない
- 未検証のステップを、後続ステップの前提として採用しない
- 解答に書かれた結論を、最初から正しいと仮定しない

監査結果は `auditGeneratedProblem()` の `symbolic_proof_audit` に格納されます。

## 今回追加した対応

- `length_equality` のように `objects` がないデータでも、条件文の `AB=CD` を抽出します。
- `parallel`、`concyclic` / `incidence`、`diameter`、`angle_equality`、`angle_bisector` の一部を明示条件から記号化します。
- `part: P1` / `part: P2` の条件を分離し、P2専用条件がP1の証明へ混入しないようにします。
- 明示された角の二等分線から、定義に基づく角の等しさを証明エンジンで導出できます。
- 1つの証明ステップに複数の等式が含まれる場合、検出した各命題を別々に検証します。

## `derived_facts` の監査

`validation.theorem_audit.symbolic_proof_audit.derived_fact_audit` では、元データの `derived_facts` も別の逐次監査として処理します。`reason` や `derived_from` の文字列を正しい根拠として信頼せず、記号化できる命題だけを現在の受理済み事実から証明します。参照先IDが未受理の場合は `dependency_issues` に記録します。
