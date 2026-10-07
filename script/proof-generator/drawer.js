/**
 * GeometryModelをCanvasへ描画する。
 *
 * 数学座標:
 *   x → 右
 *   y → 上
 *
 * Canvas座標:
 *   x → 右
 *   y → 下
 *
 * Drawerでは数学座標を保持したまま、
 * Canvasへ変換するときだけY軸を反転する。
 */export class Drawer {

   constructor(canvasManager) {

     if (!canvasManager) {
       throw new Error(
         'DrawerにはCanvasManagerが必要です。'
       );
     }

     this.canvasManager =
       canvasManager;

     this.context =
       canvasManager.getContext();

     if (!this.context) {
       throw new Error(
         'Canvasの2Dコンテキストを取得できません。'
       );
     }

     this.transform = {
       scale: 100,
       offsetX: 0,
       offsetY: 0
     };

     this.style = {
       background: '#ffffff',
       lineColor: '#111111',
       pointColor: '#111111',
       labelColor: '#111111',

       lineWidth: 2,
       pointRadius: 4,

       labelFont:
         '16px sans-serif',

       auxiliaryLineWidth: 1,

       auxiliaryDash: [
         6,
         5
       ]
     };
   }


   /**
    * GeometryModel全体を描画
    */
   drawGeometry(geometry) {

     if (!geometry) {
       console.warn(
         'GeometryModelがありません。'
       );
       return;
     }

     /*
      * Map / Object の違いを
      * ここで吸収する。
      */
     const normalized =
       this.normalizeGeometry(
         geometry
       );

     if (!normalized) {
       console.warn(
         'GeometryModelの正規化に失敗しました。',
         geometry
       );
       return;
     }

     this.currentGeometry =
       normalized;

     /*
      * デバッグ用。
      *
      * 一度動作確認できたら
      * console.logは削除してよい。
      */
     console.log(
       '描画GeometryModel:',
       normalized
     );

     this.clear();

     this.fitToGeometry(
       normalized
     );

     /*
      * 描画順序
      *
      * 円
      * ↓
      * 直線
      * ↓
      * 線分
      * ↓
      * 点
      * ↓
      * ラベル
      */
     this.drawCircles(
       normalized
     );

     this.drawLines(
       normalized
     );

     this.drawSegments(
       normalized
     );

     this.drawPoints(
       normalized
     );

     this.drawLabels(
       normalized
     );
   }


   /**
    * GeometryModelの形式を統一する。
    *
    * points:
    *   Map
    *   Object
    *
    * の両方に対応。
    */
   normalizeGeometry(geometry) {

     if (!geometry) {
       return null;
     }

     /*
      * points
      */
     let points;

     if (
       geometry.points instanceof Map
     ) {
       points =
         geometry.points;
     }

     else if (
       geometry.points &&
       typeof geometry.points === 'object'
     ) {
       points =
         new Map(
           Object.entries(
             geometry.points
           )
         );
     }

     else {
       console.warn(
         'GeometryModel.points が存在しません。',
         geometry
       );

       return null;
     }


     /*
      * segments
      */
     const segments =
       Array.isArray(
         geometry.segments
       )
         ? geometry.segments
         : [];


     /*
      * lines
      */
     const lines =
       Array.isArray(
         geometry.lines
       )
         ? geometry.lines
         : [];


     /*
      * circles
      */
     const circles =
       Array.isArray(
         geometry.circles
       )
         ? geometry.circles
         : [];


     /*
      * 線分・直線側に
      * a / b が存在しない場合、
      * point IDから解決する。
      */
     const resolvedSegments =
       segments.map(segment => {
         const a =
           typeof segment.a === 'string'
             ? points.get(segment.a)
             : segment.a ??
               points.get(segment.start);

         const b =
           typeof segment.b === 'string'
             ? points.get(segment.b)
             : segment.b ??
               points.get(segment.end);

         return {
           ...segment,
           a,
           b
         };
       });

     const resolvedLines =
       lines.map(line => {
         const rawA =
           line.a ??
           line.start ??
           line.through?.[0];

         const rawB =
           line.b ??
           line.end ??
           line.through?.[1];

         const a =
           typeof rawA === 'string'
             ? points.get(rawA)
             : rawA;

         const b =
           typeof rawB === 'string'
             ? points.get(rawB)
             : rawB;

         return {
           ...line,
           a,
           b
         };
       });

     return {
       ...geometry,

       points,

       segments:
         resolvedSegments,

       lines:
         resolvedLines,

       circles
     };
   }


   /**
    * Canvasクリア
    */
   clear() {

     const width =
       this.canvasManager.getWidth();

     const height =
       this.canvasManager.getHeight();

     this.context.save();

     this.context.setTransform(
       1,
       0,
       0,
       1,
       0,
       0
     );

     this.context.clearRect(
       0,
       0,
       width,
       height
     );

     this.context.fillStyle =
       this.style.background;

     this.context.fillRect(
       0,
       0,
       width,
       height
     );

     this.context.restore();
   }


   /**
    * 図形をCanvasに収める
    */
   fitToGeometry(geometry) {

     const points =
       [...geometry.points.values()]
         .filter(
           point =>
             Number.isFinite(
               point.x
             ) &&
             Number.isFinite(
               point.y
             )
         );

     if (!points.length) {
       console.warn(
         '描画可能な座標がありません。',
         geometry.points
       );

       return;
     }

     let minX =
       Math.min(
         ...points.map(
           p => p.x
         )
       );

     let maxX =
       Math.max(
         ...points.map(
           p => p.x
         )
       );

     let minY =
       Math.min(
         ...points.map(
           p => p.y
         )
       );

     let maxY =
       Math.max(
         ...points.map(
           p => p.y
         )
       );


     /*
      * 円の範囲も含める
      */
     for (
       const circle
       of geometry.circles
     ) {

       const center =
         geometry.points.get(
           circle.center
         );

       if (!center) {
         continue;
       }

       const radius =
         Number(
           circle.radius
         );

       if (
         !Number.isFinite(radius)
       ) {
         continue;
       }

       minX =
         Math.min(
           minX,
           center.x - radius
         );

       maxX =
         Math.max(
           maxX,
           center.x + radius
         );

       minY =
         Math.min(
           minY,
           center.y - radius
         );

       maxY =
         Math.max(
           maxY,
           center.y + radius
         );
     }


     let width =
       maxX - minX;

     let height =
       maxY - minY;

     if (width <= 0) {
       width = 1;
     }

     if (height <= 0) {
       height = 1;
     }


     const canvasWidth =
       this.canvasManager.getWidth();

     const canvasHeight =
       this.canvasManager.getHeight();

     const padding = 50;

     const scaleX =
       (canvasWidth - padding * 2)
       / width;

     const scaleY =
       (canvasHeight - padding * 2)
       / height;

     const scale =
       Math.min(
         scaleX,
         scaleY
       );


     const centerX =
       (minX + maxX) / 2;

     const centerY =
       (minY + maxY) / 2;


     this.transform = {

       scale,

       offsetX:
         canvasWidth / 2 -
         centerX * scale,

       /*
        * CanvasのY軸は下向き。
        */
       offsetY:
         canvasHeight / 2 +
         centerY * scale
     };
   }


   /**
    * 数学座標 → Canvas座標
    */
   toCanvas(point) {

     return {

       x:
         this.transform.offsetX +
         point.x *
         this.transform.scale,

       y:
         this.transform.offsetY -
         point.y *
         this.transform.scale
     };
   }


   /**
    * 円
    */
   drawCircles(geometry) {

     for (
       const circle
       of geometry.circles
     ) {

       this.drawCircle(
         geometry,
         circle
       );
     }
   }


   drawCircle(
     geometry,
     circle
   ) {

     const center =
       geometry.points.get(
         circle.center
       );

     if (!center) {
       return;
     }

     const radius =
       Number(
         circle.radius
       );

     if (
       !Number.isFinite(radius)
     ) {
       return;
     }

     const p =
       this.toCanvas(
         center
       );

     this.context.save();

     this.context.strokeStyle =
       circle.style?.color ??
       this.style.lineColor;

     this.context.lineWidth =
       circle.style?.lineWidth ??
       this.style.lineWidth;

     this.context.setLineDash(
       circle.style?.dash ??
       []
     );

     this.context.beginPath();

     this.context.arc(
       p.x,
       p.y,
       radius *
         this.transform.scale,
       0,
       Math.PI * 2
     );

     this.context.stroke();

     this.context.restore();
   }


   /**
    * 直線
    */
   drawLines(geometry) {

     for (
       const line
       of geometry.lines
     ) {

       this.drawLine(
         line
       );
     }
   }


   drawLine(line) {

     if (
       !line.a ||
       !line.b
     ) {
       return;
     }

     const dx =
       line.b.x -
       line.a.x;

     const dy =
       line.b.y -
       line.a.y;

     const length =
       Math.hypot(
         dx,
         dy
       );

     if (length === 0) {
       return;
     }

     const ux =
       dx / length;

     const uy =
       dy / length;

     const extent =
       10000;

     const p1 = {
       x:
         line.a.x -
         ux * extent,

       y:
         line.a.y -
         uy * extent
     };

     const p2 = {
       x:
         line.a.x +
         ux * extent,

       y:
         line.a.y +
         uy * extent
     };

     const a =
       this.toCanvas(p1);

     const b =
       this.toCanvas(p2);

     this.context.save();

     this.context.strokeStyle =
       line.style?.color ??
       this.style.lineColor;

     this.context.lineWidth =
       line.style?.lineWidth ??
       this.style.auxiliaryLineWidth;

     this.context.setLineDash(
       line.style?.dash ??
       this.style.auxiliaryDash
     );

     this.context.beginPath();

     this.context.moveTo(
       a.x,
       a.y
     );

     this.context.lineTo(
       b.x,
       b.y
     );

     this.context.stroke();

     this.context.restore();
   }


   /**
    * 線分
    */
   drawSegments(geometry) {

     for (
       const segment
       of geometry.segments
     ) {

       this.drawSegment(
         segment
       );
     }
   }


   drawSegment(segment) {

     if (
       !segment.a ||
       !segment.b
     ) {
       return;
     }

     const a =
       this.toCanvas(
         segment.a
       );

     const b =
       this.toCanvas(
         segment.b
       );

     this.context.save();

     this.context.strokeStyle =
       segment.style?.color ??
       this.style.lineColor;

     this.context.lineWidth =
       segment.style?.lineWidth ??
       this.style.lineWidth;

     this.context.setLineDash(
       segment.style?.dash ??
       []
     );

     this.context.beginPath();

     this.context.moveTo(
       a.x,
       a.y
     );

     this.context.lineTo(
       b.x,
       b.y
     );

     this.context.stroke();

     this.context.restore();
   }


   /**
    * 点
    */
   drawPoints(geometry) {

     if (!geometry?.points) {
       return;
     }

     for (
       const point
       of geometry.points.values()
     ) {

       this.drawPoint(
         point
       );
     }
   }


   drawPoint(point) {

     if (
       !Number.isFinite(point.x) ||
       !Number.isFinite(point.y)
     ) {
       return;
     }

     const p =
       this.toCanvas(
         point
       );

     this.context.save();

     this.context.fillStyle =
       point.style?.color ??
       this.style.pointColor;

     this.context.beginPath();

     this.context.arc(
       p.x,
       p.y,
       point.style?.radius ??
       this.style.pointRadius,
       0,
       Math.PI * 2
     );

     this.context.fill();

     this.context.restore();
   }


   /**
    * ラベル
    */
   drawLabels(geometry) {

     if (!geometry?.points) {
       return;
     }

     for (
       const point
       of geometry.points.values()
     ) {

       this.drawLabel(
         point
       );
     }
   }


   drawLabel(point) {

     if (!point.id) {
       return;
     }

     const p =
       this.toCanvas(
         point
       );

     const offset =
       point.label_offset ?? {
         x: 0,
         y: -18
       };

     this.context.save();

     this.context.fillStyle =
       point.style?.labelColor ??
       this.style.labelColor;

     this.context.font =
       point.style?.labelFont ??
       this.style.labelFont;

     this.context.textAlign =
       'center';

     this.context.textBaseline =
       'middle';

     this.context.fillText(
       point.label ??
       point.id,
       p.x + offset.x,
       p.y + offset.y
     );

     this.context.restore();
   }
 }
