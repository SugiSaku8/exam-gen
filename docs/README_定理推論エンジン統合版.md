# 入試対策証明ジェネレーター — 決定的証明・幾何検証統合版

## 実装済みの3段階

### ① 既存証明の構造化と逐次検証

- `js/proof_structure_adapter.js` が、証明中の角の等式・線分の等式・相似・合同などを記号化します。
- 問題文の明示条件だけを初期事実にし、各命題を前のステップまでに受理された事実から個別に検証します。
- 証明できた命題だけを後続ステップに追加します。未対応の命題は「未証明」として残します。
- `part: P1` / `part: P2` の条件を分離し、別の設問の条件が混ざらないようにします。
- 明示された角の二等分線の定義を推論ルールに追加しました。
- 結果は `validation.theorem_audit.symbolic_proof_audit` と `symbolic_verification_status` に記録されます。

### ② 2024〜2026年型の図形を条件から再構成

`js/templates/recent_geometry_builder.js` が、回転・拡大縮小ではなく、条件を満たすように点を計算し直します。

- 2024年型：AB=AD、円との第2交点E、PA=PCとなるP1、∠EPC=90°となるP2、各Fを再計算。
- 2025年型：CA=CD、E=AC∩BD、EF∥BC、BG=BAとなるG、AGと円の第2交点Pを再計算。
- 2026年型：AB=AC、AC∥BD、∠PCA=∠BCDとなるP、E/Fの交点を再計算。
- 条件を変えた際には、条件文・解答・弧長のπ式も連動して更新します。
- 座標は描画用の単位円に正規化し、実寸の半径は別の条件として保存します。

### ③ 独立した幾何条件・証明目標・数値答案の再検証

`js/geometry_validator.js` は、生成器自身の検証結果を参照せず、保存された座標から次を再計算します。

- 座標の有限性、三角形の非退化
- 円周上・線分の等しさ・平行・一直線・角の等しさ・直角
- 直径・弧の比・弧長・半径
- 明示された交点
- 証明目標の線分等式・相似・合同
- P2の角度答案・弧長答案

結果は `validation.independent_geometry_audit` に保存されます。条件の不成立や誤った答案を検出した場合は `valid: false` とエラー詳細を返します。

## 決定的証明エンジンの限界

- これは登録済みの規則だけを使う小規模な決定的推論器であり、任意の幾何証明を解ける汎用定理証明器ではありません。
- 過去問の文章を記号化できない場合や、円周角・点の位置関係に必要な前提が不足する場合は「未証明」と表示します。これは命題が誤りであるという意味ではありません。
- 幾何条件が座標上で成立することと、文章による証明が論理的に成立することは別々に扱います。

## テスト

Node.js を使い、CommonJSの既存テストとES Modulesの新規テストを分けて実行します。プロジェクトに `package.json` を追加する必要はありません。

```bash
# 既存のCommonJSテスト
node --test tests/theorem-foundation/geometry-relations.test.js tests/theorem-foundation/problem-data-engine.test.js tests/theorem-foundation/problem-data-format.test.js tests/theorem-foundation/proof-engine-bridge.test.js tests/theorem-foundation/proof-rules.test.js tests/theorem-foundation/theorem-catalog.test.js

# ES Modulesの構造化・図形生成・独立検証テスト
node --experimental-default-type=module --test tests/theorem-foundation/proof-structure-adapter.test.js tests/theorem-foundation/recent-geometry-builder.test.js tests/theorem-foundation/geometry-validator.test.js
```

## 参考リポジトリ

定理カタログ・推論ルール・点の順序の設計を検討する際に、ユーザー提供の `syari3/proof` リポジトリ `theorem-catalog-foundation` ブランチを参照しました。元リポジトリのライセンスがZIP内で確認できなかったため、公開・再配布前には元リポジトリのライセンス・利用条件を確認してください。
