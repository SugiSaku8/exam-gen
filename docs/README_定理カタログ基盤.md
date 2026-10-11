# 定理カタログ基盤の取り込み（2026-10）

`docs/theorem-foundation/` と `js/theorem-catalog.js` は、提供された `proof-theorem-catalog-foundation` リポジトリを分析し、設計資料と定理IDカタログを参照用に取り込んだものです。

## 現在の実装

- `js/proof_audit.js`：証明ステップと定理カタログの対応候補、幾何データの構造を監査。
- `js/proof_structure_adapter.js`：既存の証明を記号化し、明示条件から逐次的に検証。
- `js/proof-rules.js`：登録済みの推論規則による決定的証明探索。角の二等分線の定義も対応。
- `js/templates/recent_geometry_builder.js`：2024〜2026年型を回転・拡大縮小だけでなく、数学的条件と交点計算から再構成。
- `js/geometry_validator.js`：生成器の自己申告とは独立して、座標・条件・証明目標・数値答案を再計算。

## 読むべきドキュメント

- `README_定理推論エンジン統合版.md`：3段階の実装とテスト方法
- `README_証明構造化監査.md`：①の記号化・逐次検証
- `README_近年図形再構成.md`：②の幾何構築

## 注意点

- 定理IDを文章から推定した `catalogued-candidate` は、数学的な証明の正しさを保証しません。
- 推論規則で証明できない命題は未証明のまま残します。
- 独立幾何検証に合格しても、証明の文章が全て正しいとは限りません。幾何条件と論理証明は別々に監査します。
