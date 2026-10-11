# 次段階：答案入力・基準照合・学習フィードバック

## 今回の実装

- 問題画面に答案入力欄を追加。1行ごとに「主張：理由」の形で入力できる。
- 「証明を確認」で年度別の登録済み証明パターンを照合し、確認できた要素と不足している要素を表示する。
- 2014・2015・2016・2017・2024・2025・2026年度型のすべてにチェック経路を用意。
- 空欄・問題未生成時の判定を安全に処理。
- 消去ボタン、読み上げ支援用の live region、モバイル向けレイアウトを追加。
- 回答欄と判定結果は、問題を切り替えると初期化される。
- 自動生成した模範答案が全7テンプレートでチェックを通る回帰試験、および近年3テンプレートの「結論だけ」の答案を拒否する試験を追加。

## 判定の読み方

これは自由記述の答案を完全に理解するAI採点ではなく、登録済みの証明要素・語句・結論を照合する決定的なルーブリック方式です。別解、記号の違い、同値な言い回しを誤判定する可能性があります。「確認基準を満たした」は登録済みの要素が見つかったという意味で、答案の全行を形式的に証明したことを意味しません。画面にもこの制限を表示します。

## テスト

ES Module tests:

```bash
node --experimental-default-type=module --test \
  tests/theorem-foundation/formal-proof-system.test.js \
  tests/theorem-foundation/independent-math-verifier.test.js \
  tests/theorem-foundation/proof-structure-adapter.test.js \
  tests/theorem-foundation/recent-geometry-builder.test.js \
  tests/theorem-foundation/geometry-validator.test.js \
  tests/theorem-foundation/all-years-generation.test.js \
  tests/theorem-foundation/answer-generator.test.js \
  tests/theorem-foundation/student-proof-checker.test.js
```

CommonJS compatibility tests are run separately without `--experimental-default-type=module`.


## 追加更新：難易度制約と厳密な数値答案

- 問題画面の「数学検証済」バッジを削除。独立検証処理自体は生成時の内部チェックとして維持。
- 難易度3〜8は近いテンプレートを選ぶ目安ではなく、生成ファミリーの制約として扱う。
  - 3：2014/2015型
  - 4：2016型
  - 5：2017/2024/2025/2026型
  - 6〜8：検証済みの2017型の幾何配置を保ち、数値追問を段階的に複雑化
- 難易度6〜8の数値追問は、厳密な線分長の和を扱う。
  - 6：`2+√3`
  - 7：`(3+2√3)/3`
  - 8：`(7+4√13)/23`
- 難易度8は分子が `a+b√c` となる分数（例：`(7+4√13)/23`）を採用。
- 最終答案は整数・分数・平方根を含む厳密表現として検査し、許容形式にできない場合は小数に丸めず生成を失敗させる。
- 補助的な内部線分値を許容形式で表せない場合も、近似小数を保存しない。
- 追加テスト `tests/theorem-foundation/difficulty-and-exact-numeric.test.js` で、難易度の厳密選択、答案形式、数学検証バッジの非表示を確認。

注意：難易度6〜8は、現時点では証明部分の構造を増やすのではなく、検証済みの幾何構成を保ったまま数値追問の厳密表現を難しくする方式です。証明そのものの段階数も今後の拡張対象です。


- 生成条件に合う問題テンプレートがない場合は、画面内モーダルで原因と対処を案内する。
- 難易度8は、線分値から `√(AD²+16AE²)` を計算し、`(7+4√13)/23` 型の厳密分数へ到達する。小数近似は使わない。
