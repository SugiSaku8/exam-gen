# 入試対策証明ジェネレーター — 定理推論エンジン統合版

## 今回の実装

- 定理カタログ `js/theorem-catalog.js` を、推論ルールと共有するID体系として配置。
- `js/proof-rules.js` をブラウザで読み込み、明示された記号的事実から決定的に証明探索できるようにした。
- `js/geometry-relations.js` を接続。点の順序・半直線の関係は、明示された条件がある場合だけ推論する。
- `js/problem-data-engine.js` を読み込み、`proof-problem v1` 形式の問題データを安全に事実へ変換するアダプターを用意。
- `js/proof_engine_bridge.js` を追加。問題に `proof_engine: { facts, goal }` が設定された場合、生成後監査から実際の推論エンジンを呼び出す。
- 推論エンジン未設定の既存テンプレートは「未設定」と明示し、証明済みと偽装しない。
- 参考リポジトリの設計資料と、動作させられるテストを `docs/theorem-foundation/` / `tests/theorem-foundation/` に整理。

## 記号的証明エンジンの入力

```js
{
  proof_engine: {
    facts: [
      'triangle(ABC)',
      'triangle(DEF)',
      'angle(A)=angle(D)',
      'angle(B)=angle(E)'
    ],
    goal: 'similar(ABC,DEF)',
    max_steps: 100
  }
}
```

この例では、三角形の指定と2組の角の等しさが明示されている場合に限り、AA相似の規則から結論を導出する。不足する前提がある場合は証明失敗を返す。これは命題が偽であるという意味ではない。

## 現時点の限界

- 既存の2014〜2017年・2024〜2026年テンプレートの証明手順すべてを、自動的に `proof_engine.facts` へ変換して再証明するところまでは未実装。
- 座標図だけから、円周上・平行・点の順序などを推測して証明の前提にすることはしない。
- 登録済みルールで証明できたことと、座標・問題文の全条件が幾何学的に成立することは別々に検証する必要がある。
- 2024〜2026年の類題生成は、現状では構造を保った回転・拡大縮小が中心で、条件を変えて図形を再構成する生成器への改良は今後の作業。

## テスト

Node.js がある環境で、プロジェクトルートから実行する。

```bash
node tests/theorem-foundation/geometry-relations.test.js
node tests/theorem-foundation/problem-data-engine.test.js
node tests/theorem-foundation/problem-data-format.test.js
node tests/theorem-foundation/proof-rules.test.js
node tests/theorem-foundation/theorem-catalog.test.js
node tests/theorem-foundation/proof-engine-bridge.test.js
```

今回、上記6テストを実行し、すべて成功を確認した。

## 参考

定理カタログ・推論ルール・点の順序の設計を検討する際に、ユーザー提供の `syari3/proof` リポジトリ `theorem-catalog-foundation` ブランチを参照した。元リポジトリのライセンスが ZIP 内で確認できなかったため、再配布や公開前には元リポジトリのライセンス・利用条件を確認すること。
