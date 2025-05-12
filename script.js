const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const ctxIn = inputCanvas.getContext('2d');
const ctxOut = outputCanvas.getContext('2d');

let image = null;
let points = [];
let draggingPoint = null;
let imageScale = 1;
let imageOffsetX = 0;
let imageOffsetY = 0;
let isDragging = false; // ドラッグ中かどうかを判定
let animationFrameId = null; // requestAnimationFrame の ID

const colors = ['red', 'red', 'green', 'green', 'blue', 'blue', 'orange', 'orange'];

inputCanvas.addEventListener('dragover', e => e.preventDefault());
inputCanvas.addEventListener('drop', handleDrop);

function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(600 / img.width, 600 / img.height);
            imageScale = scale;
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            imageOffsetX = (600 - newWidth) / 2;
            imageOffsetY = (600 - newHeight) / 2;

            ctxIn.clearRect(0, 0, 600, 600);
            ctxIn.drawImage(img, imageOffsetX, imageOffsetY, newWidth, newHeight);
            image = img;

            // 初期の8つの点を配置
            points = [
                { x: imageOffsetX + newWidth * 0.2, y: imageOffsetY + newHeight * 0.3 }, // 左上
                { x: imageOffsetX + newWidth * 0.2, y: imageOffsetY + newHeight * 0.7 }, // 右上
                { x: imageOffsetX + newWidth * 0.3, y: imageOffsetY + newHeight * 0.2 }, // 右下
                { x: imageOffsetX + newWidth * 0.7, y: imageOffsetY + newHeight * 0.2 }, // 左下
                { x: imageOffsetX + newWidth * 0.8, y: imageOffsetY + newHeight * 0.3 }, // 内側左上
                { x: imageOffsetX + newWidth * 0.8, y: imageOffsetY + newHeight * 0.7 }, // 内側右上
                { x: imageOffsetX + newWidth * 0.7, y: imageOffsetY + newHeight * 0.8 }, // 内側右下
                { x: imageOffsetX + newWidth * 0.3, y: imageOffsetY + newHeight * 0.8 }  // 内側左下
            ];

            drawPoints();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

inputCanvas.addEventListener('mousedown', handleMouseDown);
inputCanvas.addEventListener('mousemove', handleMouseMove);
inputCanvas.addEventListener('mouseup', handleMouseUp);

function handleMouseDown(e) {
    const rect = inputCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const found = points.find(p => Math.hypot(p.x - x, p.y - y) < 10);
    if (found) {
        draggingPoint = found;
        isDragging = true; // ドラッグ開始
    } else if (points.length < 8) {
        points.push({ x, y });
    }
    drawPoints();
}

function handleMouseMove(e) {
    if (!draggingPoint) return;
    const rect = inputCanvas.getBoundingClientRect();
    draggingPoint.x = e.clientX - rect.left;
    draggingPoint.y = e.clientY - rect.top;
    drawPoints();

    // ドラッグ中に画像を更新
    if (isDragging && !animationFrameId) {
        animationFrameId = requestAnimationFrame(() => {
            applyPerspectiveTransform();
            animationFrameId = null; // アニメーションフレームをリセット
        });
    }
}

function handleMouseUp() {
    draggingPoint = null;
    isDragging = false; // ドラッグ終了
    drawPoints();
    applyPerspectiveTransform();
}

let outputPoints = [
    { x: 100, y: 100 }, // 初期位置の点1
    { x: 200, y: 200 }  // 初期位置の点2
];
let draggingOutputPoint = null; // ドラッグ中の点

// 出力キャンバスにイベントを追加
outputCanvas.addEventListener('mousedown', handleOutputMouseDown);
outputCanvas.addEventListener('mousemove', handleOutputMouseMove);
outputCanvas.addEventListener('mouseup', handleOutputMouseUp);

function handleOutputMouseDown(e) {
    const rect = outputCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // クリックされた点を判定
    draggingOutputPoint = outputPoints.find(p => Math.hypot(p.x - x, p.y - y) < 10);
}

function handleOutputMouseMove(e) {
    if (!draggingOutputPoint) return;

    const rect = outputCanvas.getBoundingClientRect();
    draggingOutputPoint.x = e.clientX - rect.left;
    draggingOutputPoint.y = e.clientY - rect.top;

    drawOutputPoints(); // 点を再描画
    calculateOutputDistance(); // 距離を再計算
}

function handleOutputMouseUp() {
    draggingOutputPoint = null; // ドラッグ終了
}

function drawOutputPoints() {
    ctxOut.clearRect(0, 0, 600, 600); // 出力キャンバスをクリア

    // 出力画像を再描画
    applyPerspectiveTransform();

    // ドラッグ可能な点を描画
    outputPoints.forEach((p, i) => {
        ctxOut.beginPath();
        ctxOut.arc(p.x, p.y, 7, 0, Math.PI * 2); // 点の円
        ctxOut.fillStyle = i === 0 ? 'red' : 'blue'; // 点の色
        ctxOut.fill();
    });
}

function calculateOutputDistance() {
    const sideLengthInput = document.getElementById('sideLengthInput');
    const distanceDisplay = document.getElementById('distanceDisplay');

    // 画像の一辺の長さを取得
    const sideLength = parseFloat(sideLengthInput.value);
    if (isNaN(sideLength) || sideLength <= 0) {
        distanceDisplay.textContent = '-';
        return;
    }

    // 2点間のピクセル距離を計算
    const [p1, p2] = outputPoints;
    const pixelDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    // ピクセル距離をメートルに変換
    const metersPerPixel = sideLength / 600; // 600はキャンバスの幅（ピクセル）
    const distanceInMeters = pixelDistance * metersPerPixel;

    // 距離を表示
    distanceDisplay.textContent = distanceInMeters.toFixed(2);
}

// 初期描画
drawOutputPoints();

let circle = { x: 300, y: 300, radius: 50 }; // 円の初期状態

// 出力キャンバスにイベントを追加
outputCanvas.addEventListener('mousemove', handleOutputMouseMoveForCircle);
outputCanvas.addEventListener('wheel', handleOutputMouseWheel);

function handleOutputMouseMoveForCircle(e) {
    const rect = outputCanvas.getBoundingClientRect();
    circle.x = e.clientX - rect.left;
    circle.y = e.clientY - rect.top;

    drawOutputPointsAndCircle(); // 円を再描画
}

function handleOutputMouseWheel(e) {
    e.preventDefault(); // デフォルトのスクロール動作を無効化

    // ホイールのスクロール量に応じて半径を変更
    circle.radius += e.deltaY > 0 ? -5 : 5;

    // 半径の最小値と最大値を制限
    circle.radius = Math.max(10, Math.min(300, circle.radius));

    drawOutputPointsAndCircle(); // 円を再描画
    updateCircleRadiusDisplay(); // 半径を更新
}

function drawOutputPointsAndCircle() {
    ctxOut.clearRect(0, 0, 600, 600); // 出力キャンバスをクリア

    // 出力画像を再描画
    applyPerspectiveTransform();

    // ドラッグ可能な点を描画
    outputPoints.forEach((p, i) => {
        ctxOut.beginPath();
        ctxOut.arc(p.x, p.y, 7, 0, Math.PI * 2); // 点の円
        ctxOut.fillStyle = i === 0 ? 'red' : 'blue'; // 点の色
        ctxOut.fill();
    });

    // マウスカーソルを中心とした円を描画
    ctxOut.beginPath();
    ctxOut.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctxOut.strokeStyle = 'green'; // 円の色
    ctxOut.lineWidth = 2;
    ctxOut.stroke();
}

// 初期描画
drawOutputPointsAndCircle();
function updateCircleRadiusDisplay() {
    const sideLengthInput = document.getElementById('sideLengthInput');
    const circleRadiusDisplay = document.getElementById('circleRadiusDisplay');

    // 画像の一辺の長さを取得
    const sideLength = parseFloat(sideLengthInput.value);
    if (isNaN(sideLength) || sideLength <= 0) {
        circleRadiusDisplay.textContent = '-';
        return;
    }

    // 半径をメートルに変換
    const metersPerPixel = sideLength / 600; // 600はキャンバスの幅（ピクセル）
    const radiusInMeters = circle.radius * metersPerPixel;

    // 半径を表示
    circleRadiusDisplay.textContent = radiusInMeters.toFixed(2);
}

// 初期描画時に半径を表示
updateCircleRadiusDisplay();

function drawPoints() {
    if (!image) return;
    ctxIn.clearRect(0, 0, 600, 600);
    ctxIn.drawImage(image, imageOffsetX, imageOffsetY, image.width * imageScale, image.height * imageScale);

    ctxIn.setLineDash([5, 5]);
    for (let i = 0; i < 4; i++) {
        if (points.length > i * 2 + 1) {
            ctxIn.strokeStyle = colors[i * 2];
            ctxIn.beginPath();
            ctxIn.moveTo(points[i * 2].x, points[i * 2].y);
            ctxIn.lineTo(points[i * 2 + 1].x, points[i * 2 + 1].y);
            ctxIn.stroke();
        }
    }
    ctxIn.setLineDash([]);

    points.forEach((p, i) => {
        // 縁取りを描画
        ctxIn.beginPath();
        ctxIn.arc(p.x, p.y, 7, 0, Math.PI * 2); // 縁取りの半径を点より少し大きく
        ctxIn.fillStyle = 'black'; // 縁取りの色
        ctxIn.fill();

        // 点を描画
        ctxIn.fillStyle = colors[i];
        ctxIn.fillRect(p.x - 5, p.y - 5, 10, 10);
    });

    if (points.length === 8) {
        const intersections = calculateIntersections();
        intersections.forEach(p => {
            if (p) {
                const px = p.x * imageScale + imageOffsetX;
                const py = p.y * imageScale + imageOffsetY;
                ctxIn.strokeStyle = 'cyan';
                ctxIn.beginPath();
                ctxIn.arc(px, py, 8, 0, Math.PI * 2);
                ctxIn.stroke();
            }
        });
    }
}

function calculateIntersections() {
    const adjustedPoints = points.map(p => ({
        x: (p.x - imageOffsetX) / imageScale,
        y: (p.y - imageOffsetY) / imageScale
    }));

    return [
        lineIntersection(adjustedPoints[0], adjustedPoints[1], adjustedPoints[2], adjustedPoints[3]),
        lineIntersection(adjustedPoints[2], adjustedPoints[3], adjustedPoints[4], adjustedPoints[5]),
        lineIntersection(adjustedPoints[4], adjustedPoints[5], adjustedPoints[6], adjustedPoints[7]),
        lineIntersection(adjustedPoints[6], adjustedPoints[7], adjustedPoints[0], adjustedPoints[1])
    ];
}

function applyPerspectiveTransform() {
    if (points.length !== 8) return;
    const intersections = calculateIntersections();
    if (intersections.includes(null)) return alert('交差点が計算できませんでした');

    const src = intersections;

    const H = computeRealWorldHomography(600, 600, src);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, image.width, image.height);
    const outputData = ctxOut.createImageData(600, 600);

    for (let y = 0; y < 600; y++) {
        for (let x = 0; x < 600; x++) {
            const [srcX, srcY] = applyRealWorldHomography(H, x, y);
            const ix = Math.floor(srcX);
            const iy = Math.floor(srcY);
            if (ix >= 0 && iy >= 0 && ix < image.width && iy < image.height) {
                const srcIndex = (iy * image.width + ix) * 4;
                const dstIndex = (y * 600 + x) * 4;
                for (let i = 0; i < 4; i++) {
                    outputData.data[dstIndex + i] = imgData.data[srcIndex + i];
                }
            }
        }
    }
    ctxOut.putImageData(outputData, 0, 0);
}


function applyRealWorldHomography(h, x, y) {
    const denom = h[6] * x + h[7] * y + 1;
    const nx = (h[0] * x + h[1] * y + h[2]) / denom;
    const ny = (h[3] * x + h[4] * y + h[5]) / denom;
    return [nx, ny];
}

function lineIntersection(p1, p2, p3, p4) {
    const a1 = p2.y - p1.y;
    const b1 = p1.x - p2.x;
    const c1 = a1 * p1.x + b1 * p1.y;
    const a2 = p4.y - p3.y;
    const b2 = p3.x - p4.x;
    const c2 = a2 * p3.x + b2 * p3.y;
    const denominator = a1 * b2 - a2 * b1;
    if (denominator === 0) return null;
    const x = (b2 * c1 - b1 * c2) / denominator;
    const y = (a1 * c2 - a2 * c1) / denominator;
    return { x, y };
}

function computeRealWorldHomography(w, h, dstPoints) {
    const [p1, p2, p3, p4] = dstPoints;
    const [x1, y1] = [p1.x, p1.y];
    const [x2, y2] = [p2.x, p2.y];
    const [x3, y3] = [p3.x, p3.y];
    const [x4, y4] = [p4.x, p4.y];

    const bx = -x2 - x4 + x1 + x3;
    const by = -y2 - y4 + y1 + y3;

    const a11 = x2 - x3;
    const a12 = x4 - x3;
    const a21 = y2 - y3;
    const a22 = y4 - y3;

    const det = a11 * a22 - a12 * a21;

    if (det === 0) {
        throw new Error("解なし（台形が潰れている可能性あり）");
    }

    const h7 = (bx * a22 - a12 * by) / det;
    const h8 = (a11 * by - bx * a21) / det;

    const h1 = h7 * x2 + x2 - x1;
    const h4 = h7 * y2 + y2 - y1;
    const h2 = h8 * x4 + x4 - x1;
    const h5 = h8 * y4 + y4 - y1;
    const h3 = x1;
    const h6 = y1;

    return [h1/w, h2/h, h3, h4/w, h5/h, h6, h7/w, h8/h];
}

