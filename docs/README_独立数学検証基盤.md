# 独立数学検証基盤（7年度テンプレート）

## 今回実装した1〜5

1. **年度別証明の形式化** — `js/formal_proof_system.js` に2014・2015・2016・2017・2024・2025・2026年度の証明スキーマを登録。各スキーマに証明目標、必要条件、規則ID、依存順序、導出命題を定義。
2. **定理規則の拡充** — 円周角、直径に対する円周角、錯角、等しい角から平行、二等辺三角形、外角、角の推移、相似AA、合同ASA、平行四辺形、辺長の推移などを登録。一般規則は前提型・結論型を検査し、年度固有の複合規則は別名の信頼済み規則として分離。
3. **証明証明書** — 問題ごとに必須条件の一致、規則ID、参照先、導出順序、最終目標を監査。各導出命題を座標から独立に再計算し、角度・辺長・平行・直角・相似・合同・平行四辺形の不一致を拒否。
4. **証明計画先行** — 問題生成より前に`assertProofFirstPlanReady()`で登録済み証明計画を確認し、問題データに`proof_first_plan`と事前検証結果を保存。生成後は必須条件と数値結論を再検査。
5. **回帰テスト** — 7年度×30シード（210生成）を検査し、証明スキーマ・座標・追問・依存関係を監査。必須条件削除、証明目標改ざん、座標改ざんの負例テストを追加。

## 検証状態の意味

`verified`は、このアプリに登録した年度別証明スキーマの範囲で、必須条件、証明目標、依存順序、各導出結論の独立数値検査、幾何条件、追問の答えの整合性が成功したことを意味する。

これは**任意の未知の幾何問題を自動で証明できる完全な汎用定理証明器**という意味ではない。年度固有の複合規則は、登録済みの問題構造に限定した信頼済み規則である。新しい問題テンプレートを追加する際は、証明スキーマを作り、各推論規則をレビューし、正例・負例・座標改ざんテストを追加する必要がある。

自然文から抽出した補助的な`derived_facts`には、汎用規則で未証明の記述が残る場合がある。それらは証明目標の年度別証明書とは別にレポートへ記録し、未証明を隠さない。

## 関連ファイル

- `js/formal_proof_system.js` — 年度別証明スキーマ、規則カタログ、証明計画、証明書、数値検証
- `js/independent_math_verifier.js` — 幾何・証明・依存関係・解答の独立監査
- `js/geometry_validator.js` — 座標JSONとGeometryModel双方の独立幾何検査
- `tests/theorem-foundation/formal-proof-system.test.js` — 年度・規則・負例・210ケースの回帰試験
- `docs/INDEPENDENT_MATHEMATICAL_VERIFICATION.md` — 設計方針と公開API

## テスト

ES Moduleテスト:

```bash
node --experimental-default-type=module --test tests/theorem-foundation/formal-proof-system.test.js tests/theorem-foundation/independent-math-verifier.test.js tests/theorem-foundation/proof-structure-adapter.test.js tests/theorem-foundation/recent-geometry-builder.test.js tests/theorem-foundation/geometry-validator.test.js tests/theorem-foundation/all-years-generation.test.js tests/theorem-foundation/answer-generator.test.js
```

既存CommonJS互換テスト:

```bash
node --test tests/theorem-foundation/geometry-relations.test.js tests/theorem-foundation/problem-data-engine.test.js tests/theorem-foundation/problem-data-format.test.js tests/theorem-foundation/proof-engine-bridge.test.js tests/theorem-foundation/proof-rules.test.js tests/theorem-foundation/theorem-catalog.test.js
```
