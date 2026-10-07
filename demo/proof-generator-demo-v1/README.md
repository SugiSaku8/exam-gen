# 入試対策証明ジェネレーター Demo

## 構成

- `json_loader.js`
  - JSONの読み込みのみ
- `json_analyzer.js`
  - JSONをアプリ内部の数学構造へ変換
  - 条件・導出事実・証明構造を扱う
- `canvas_manager.js`
  - Canvasの管理
- `drawer.js`
  - geometryをCanvasへ描画
- `generator.js`
  - 全モジュールを統合

## データ

`data/2014.json` と `data/2015.json` を配置します。

このDemoでは2014 JSONの完全スキーマを想定しています。
2015 JSONも同じスキーマにすることで自動的に年度選択へ追加できます。

## 起動

ES Modulesとfetchを使うため、file:// で直接開かずHTTPサーバー経由で起動してください。

例:

```bash
python3 -m http.server 8000
```

その後、

```text
http://localhost:8000/
```

を開きます。

## 次の実装

1. exact_coordinatesによる正確な図形描画
2. 証明グラフによる完全な証明判定
3. generation.constraintsを利用した問題自動生成
4. ランダムな点名・弧比・角度の生成
5. 生成問題のvalidation
6. 2014〜2026全年度への拡張
