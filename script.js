function transpose(matrix) {
	return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}
function multiplyMatrices(a, b) {
	const isAVector = !Array.isArray(a[0]);
	const isBVector = !Array.isArray(b[0]);
	const A = isAVector ? [a] : a;
	const B = isBVector ? b.map(row => [row]) : b;

	const result = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
	for (let i = 0; i < A.length; i++) {
		for (let k = 0; k < B.length; k++) {
			for (let j = 0; j < B[0].length; j++) {
				result[i][j] += A[i][k] * B[k][j];
			}
		}
	}

	if (isAVector && isBVector) {
		return result[0][0];
	} else if (isAVector) {
		return result[0];
	} else if (isBVector) {
		return result.map(row => row[0]);
	} else {
		return result;
	}
}
function gaussianSolve(A, b) {
	const n = A.length;
	const M = A.map((row, i) => [...row, b[i]]);

	for (let i = 0; i < n; i++) {
		let maxRow = i;
		for (let k = i + 1; k < n; k++) {
			if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
		}
		[M[i], M[maxRow]] = [M[maxRow], M[i]];

		const pivot = M[i][i];
		for (let j = i; j <= n; j++) M[i][j] /= pivot;

		for (let k = 0; k < n; k++) {
			if (k === i) continue;
			const factor = M[k][i];
			for (let j = i; j <= n; j++) {
				M[k][j] -= factor * M[i][j];
			}
		}
	}

	return M.map(row => row[n]);
}


class Ellipse {
	// 楕円の一般形: A x^2 + B x y + C y^2 + D x + E y + F = 0
	// パラメータ形: 中心(h, k), 長軸a, 短軸b, 回転角theta
	constructor(points) {
		this.points = points; // 5点
		this.generalForm = null; // {A, B, C, D, E, F}
		this.params = null;      // {h, k, a, b, theta}
		this.cos = null;
		this.sin = null;
	}
	get isValid() {
		// パラメータが未計算ならfalse
		if (!this.params) return false;
		const { a, b } = this.params;
		// a, bが正であること
		if (!(a > 0 && b > 0)) return false;
		// 一般形の判別式が負であること
		if (!this.generalForm) return false;
		const { A, B, C } = this.generalForm;
		const discriminant = B * B - 4 * A * C;
		if (discriminant >= 0) return false;
		return true;
	}

	fit() {
		if (!this.points || this.points.length !== 5) {
			this.generalForm = null;
			this.params = null;
			return;
		}
		// 係数計算
		const X = this.points.map(p => [p.x ** 2, p.x * p.y, p.y ** 2, p.x, p.y]);
		const Y = Array(5).fill(-1);
		const At = transpose(X);
		const AtA = multiplyMatrices(At, X);
		const Atb = multiplyMatrices(At, Y);
		const coeffs = gaussianSolve(AtA, Atb).flat();
		const [A, B, C, D, E] = coeffs;
		const F = 1;
		this.generalForm = { A, B, C, D, E, F };

		// パラメータ形へ
		const discriminant = B * B - 4 * A * C;
		if (discriminant >= 0 || A * C <= 0) {
			this.params = null;
			return;
		}
		const h = (2 * C * D - B * E) / discriminant;
		const k = (2 * A * E - B * D) / discriminant;
		const theta = B === 0 ? 0 : 0.5 * Math.atan2(B, A - C);
		const F0 = A * h * h + B * h * k + C * k * k + D * h + E * k + 1;
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		const Aprime = A * cos * cos + B * cos * sin + C * sin * sin;
		const Cprime = A * sin * sin - B * cos * sin + C * cos * cos;
		const a = Math.sqrt(Math.abs(F0 / Aprime));
		const b = Math.sqrt(Math.abs(F0 / Cprime));
		this.sin = sin;
		this.cos = cos;
		this.params = { h, k, a, b, theta };
	}


	// yが最大・最小となる2点
	findYExtrema() {
		if (!this.params) return null;
		const { h, k, a, b, theta } = this.params;
		const sin = this.sin;
		const cos = this.cos;

		const tMax = Math.atan2((b / a), Math.tan(theta));
		const tMin = tMax + Math.PI;   

		const pointFromT = (t) => {
			const a_cos_t = a * Math.cos(t);
			const b_sin_t = b * Math.sin(t);
			const x = h + a_cos_t * cos - b_sin_t * sin;
			const y = k + a_cos_t * sin + b_sin_t * cos;
			return { x, y };
		};

		const p1 = pointFromT(tMax);
		const p2 = pointFromT(tMin);

		// yが大きい方を先頭に
		return p1.y < p2.y ? [p1, p2] : [p2, p1];
	}

	// 任意のy座標での楕円上の2点
	findPointsAtY(y) {
		if (!this.generalForm) return null;
		const {A, B, C, D, E, F} = this.generalForm;
		const a = A;
		const b = B * y + D;
		const c = C * y * y + E * y + F;
		const discriminant = b * b - 4 * a * c;
		if (discriminant < 0) return null;
		const sqrtD = Math.sqrt(discriminant);
		const x1 = (-b + sqrtD) / (2 * a);
		const x2 = (-b - sqrtD) / (2 * a);
		return [{ x: x1, y: y }, { x: x2, y: y }];
	}


	// 楕円上の点p={x, y}での接線の直線式を返す
	tangentLineAt(p) {
		if (!this.generalForm) return null;
		const { A, B, C, D, E } = this.generalForm;
		// ∂F/∂x = 2A x0 + B y0 + D
		// ∂F/∂y = 2C y0 + B x0 + E
		const dx = 2 * A * p.x + B * p.y + D;
		const dy = 2 * C * p.y + B * p.x + E;
		const c = dx * p.x + dy * p.y;
		return { dx, dy, c };
	}

	// 楕円外の点p={x, y}を通る楕円の接線（2本）の直線式を返す
	tangentLinesThrough(p) {
		if (!this.generalForm) return [null,null];
		const { A, B, C, D, E, F } = this.generalForm;
		const x0 = p.x, y0 = p.y;

		const a = A * x0 * x0 + B * x0 * y0 + C * y0 * y0 + D * x0 + E * y0 + F;
		if (a <= 0) return [null, null];

		if (!this.params) return [null, null];
		const { h, k, a: aa, b: bb, theta } = this.params;
		const cos = Math.cos(-theta);
		const sin = Math.sin(-theta);
		// 楕円中心・回転補正後の座標
		const X0 = (x0 - h) * cos - (y0 - k) * sin;
		const Y0 = (x0 - h) * sin + (y0 - k) * cos;

		const px = X0 / aa; // 楕円中心・回転補正後のX座標をaで割る
		const py = Y0 / bb; // 楕円中心・回転補正後のY座標をbで割る

		const S = (X0 * X0) / (aa * aa) + (Y0 * Y0) / (bb * bb);

		const r = Math.sqrt(S);
		const angle = Math.atan2(py, px);
		const alpha = Math.acos(1 / r);

		// 接点座標（回転・平行移動を戻す）
		const contact = t => {
			const x_ = aa * Math.cos(t);
			const y_ = bb * Math.sin(t);
			return {
				x: h + x_ * this.cos - y_ * this.sin,
				y: k + x_ * this.sin + y_ * this.cos
			};
		};

		const tangent1 = this.tangentLineAt(contact(angle + alpha));
		const tangent2 = this.tangentLineAt(contact(angle - alpha));

		return [tangent1, tangent2];
	}
}

class CanvasLayer {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.w = canvas.width;
		this.h = canvas.height;
		this.bgCanvas = document.createElement('canvas');
		this.bgCanvas.width = this.w;
		this.bgCanvas.height = this.h;
		this.bgCtx = this.bgCanvas.getContext('2d');
	}
	clear() {
		this.ctx.clearRect(0, 0, this.w, this.h);
	}
	clearBG() {
		this.bgCtx.clearRect(0, 0, this.w, this.h);
	}
	drawCircle(x, y, color = 'black') {
		this.ctx.beginPath();
		this.ctx.arc(x, y, 6, 0, Math.PI * 2);
		this.ctx.fillStyle = color;
		this.ctx.fill();
		this.ctx.closePath();
	}
 }

let srcImage = {
	image: null, // ドロップされた画像を格納
	imgData: null, // 画像データを格納
	w: 0, // 画像の幅
	h: 0 // 画像の高さ
};
const distanceDisplay = document.getElementById('distanceDisplay');
const circleRadiusDisplay = document.getElementById('circleRadiusDisplay');
const inputLayer = new CanvasLayer(document.getElementById('inputCanvas'));
const outputLayer = new CanvasLayer(document.getElementById('outputCanvas'));

const lowResSize = 200; // 低解像度サイズ（例: 200x200）
const offscreenOutputCanvasLow = document.createElement('canvas');
const offscreenOutputCtxLow = offscreenOutputCanvasLow.getContext('2d');
offscreenOutputCanvasLow.width = lowResSize;
offscreenOutputCanvasLow.height = lowResSize;

let mode = 'trapezoid'; // 'trapezoid' または 'circle'
let trapezoidPoints = [];
let circlePoints = [];
let transformPoints = [null, null, null, null];
let draggingInputPoint = null;
let draggingOutputPoint = null; // ドラッグ中の点
let outputPoints = [
	{ x: 100, y: 100 }, // 初期位置の点1
	{ x: 200, y: 200 }  // 初期位置の点2
];
let circle = { x: 300, y: 300, radius: 50 }; // 円の初期状態
let imageScale = 1;
let imageOffset = { x: 0, y: 0 }; // 画像のオフセット（初期値は0,0）
let outputRotation = 0; // ラジアンで管理（初期値0）
let metersPerPixel = 40 / outputLayer.w;
const ellipse = new Ellipse([]); // 楕円のインスタンスを初期化
const colors = ['red', 'red', 'green', 'green', 'blue', 'blue', 'orange', 'orange'];

document.getElementById('modeTrapezoid').onclick = () => {
	mode = 'trapezoid';
	updateTransformParams();
	updateTransformedImage(true);
	updateTransformedImage(false);
	drawInput();
	drawOutput();
};
document.getElementById('modeCircle').onclick = () => {
	mode = 'circle';
	updateTransformParams();
	updateTransformedImage(true);
	updateTransformedImage(false);
	drawInput();
	drawOutput();
};

document.getElementById('outputRotationSlider').addEventListener('input', function () {
	outputRotation = parseFloat(this.value) * Math.PI / 180; // ラジアンに変換
	document.getElementById('outputRotationValue').textContent = this.value;
	drawOutput();
});

document.getElementById('sideLengthSlider').addEventListener('input', function () {
	metersPerPixel = parseFloat(this.value) / outputLayer.w;
	document.getElementById('sideLengthValue').textContent = this.value;

});

inputLayer.canvas.addEventListener('dragover', e => e.preventDefault());
inputLayer.canvas.addEventListener('drop', handleDrop);

function handleDrop(e) {
	e.preventDefault();
	const file = e.dataTransfer.files[0];
	const reader = new FileReader();
	reader.onload = ev => {
		const img = new Image();
		img.onload = () => {
			srcImage.image = img;
			srcImage.w = img.width;
			srcImage.h = img.height;

			imageScale = Math.min(inputLayer.w / srcImage.w, inputLayer.h / srcImage.h);
			const newWidth = srcImage.w * imageScale;
			const newHeight = srcImage.h * imageScale;
			imageOffset.x = (900 - newWidth) / 2;
			imageOffset.y = (600 - newHeight) / 2;

			inputLayer.clearBG();
			inputLayer.bgCtx.drawImage(img, imageOffset.x, imageOffset.y, newWidth, newHeight);

			const srcCanvas = document.createElement('canvas');
			srcCanvas.width = srcImage.w;
			srcCanvas.height = srcImage.h;
			const srcCtx = srcCanvas.getContext('2d');
			srcCtx.drawImage(img, 0, 0);
			srcImage.imgData = srcCtx.getImageData(0, 0, srcImage.w, srcImage.h);

			// 初期の8つの点を配置
			trapezoidPoints = [
				{ x: inputLayer.w * 0.2, y: inputLayer.h * 0.3 }, 
				{ x: inputLayer.w * 0.2, y: inputLayer.h * 0.7 }, 
				{ x: inputLayer.w * 0.3, y: inputLayer.h * 0.2 }, 
				{ x: inputLayer.w * 0.7, y: inputLayer.h * 0.2 }, 
				{ x: inputLayer.w * 0.8, y: inputLayer.h * 0.3 }, 
				{ x: inputLayer.w * 0.8, y: inputLayer.h * 0.7 }, 
				{ x: inputLayer.w * 0.7, y: inputLayer.h * 0.8 }, 
				{ x: inputLayer.w * 0.3, y: inputLayer.h * 0.8 }  
			];

			circlePoints = []; // 円の点をクリア
			const cx = inputLayer.w / 2;
			const cy = inputLayer.h / 2;
			const r = inputLayer.h * 0.25;
			for (let i = 0; i < 5; i++) {
				const angle = (2 * Math.PI * i) / 5;
				circlePoints.push({
					x: cx + r * Math.cos(angle),
					y: cy + r * Math.sin(angle)
				});
			}
			ellipse.points = circlePoints; // 楕円の点を設定
			ellipse.fit(); // 楕円をフィットさせる

			updateTransformParams();
			updateTransformedImage();
			drawInput();
			drawOutput();
		};
		img.src = ev.target.result;
	};
	reader.readAsDataURL(file);
}

inputLayer.canvas.addEventListener('mousedown', handleInputMouseDown);
inputLayer.canvas.addEventListener('mousemove', handleInputMouseMove);
inputLayer.canvas.addEventListener('mouseup', handleInputMouseUp);

function handleInputMouseDown(e) {
	const rect = inputLayer.canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	let draggingPoints = null;
	if (mode === 'trapezoid') {
		draggingPoints = trapezoidPoints;
	} else if (mode === 'circle') {
		draggingPoints = circlePoints;
	}
	draggingInputPoint = draggingPoints.find(p => Math.hypot(p.x - x, p.y - y) < 10);

	drawInput();
}
function handleInputMouseMove(e) {
	if (!draggingInputPoint) return;
	const rect = inputLayer.canvas.getBoundingClientRect();
	draggingInputPoint.x = e.clientX - rect.left;
	draggingInputPoint.y = e.clientY - rect.top;
	updateTransformParams();
	updateTransformedImage(true); // 低解像度
	drawInput();
	drawOutput();
}
function handleInputMouseUp() {
	draggingInputPoint = null;
	updateTransformedImage(false); // 高解像度
	drawInput();
	drawOutput();
}

// 出力キャンバスにイベントを追加
outputLayer.canvas.addEventListener('mousedown', handleOutputMouseDown);
outputLayer.canvas.addEventListener('mousemove', handleOutputMouseMove);
outputLayer.canvas.addEventListener('mouseup', handleOutputMouseUp);
outputLayer.canvas.addEventListener('wheel', handleOutputMouseWheel);

function handleOutputMouseDown(e) {
	const rect = outputLayer.canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	draggingOutputPoint = outputPoints.find(p => Math.hypot(p.x - x, p.y - y) < 10);
	drawOutput();
}
function handleOutputMouseMove(e) {
	const rect = outputLayer.canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	if (draggingOutputPoint) {
		draggingOutputPoint.x = x;
		draggingOutputPoint.y = y;
		const [p1, p2] = outputPoints;
		const pixelDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		distanceDisplay.textContent = (pixelDistance * metersPerPixel).toFixed(2);
	}
	circle.x = x;
	circle.y = y;
	drawOutput();
}
function handleOutputMouseUp() {
	draggingOutputPoint = null;
	drawOutput();
}
function handleOutputMouseWheel(e) {
	e.preventDefault(); // デフォルトのスクロール動作を無効化
	circle.radius += e.deltaY > 0 ? -5 : 5;
	circle.radius = Math.max(10, Math.min(600, circle.radius));
	circleRadiusDisplay.textContent = (circle.radius * metersPerPixel).toFixed(2);
	drawOutput();
}


function drawOutput() {
	if (!srcImage.image) return;
	outputLayer.clear();
	outputLayer.ctx.save();
	// キャンバス中心で回転
	outputLayer.ctx.translate(outputLayer.w / 2, outputLayer.h / 2);
	outputLayer.ctx.rotate(outputRotation);
	outputLayer.ctx.translate(-outputLayer.w / 2, -outputLayer.h / 2);

	if (draggingInputPoint || draggingOutputPoint) {
		outputLayer.ctx.drawImage(offscreenOutputCanvasLow, 0, 0, lowResSize, lowResSize, 0, 0, 600, 600);
	} else {
		outputLayer.ctx.drawImage(outputLayer.bgCanvas, 0, 0);
	}
	outputLayer.ctx.restore();

	outputPoints.forEach((p, i) => {
		outputLayer.drawCircle(p.x, p.y, i === 0 ? 'red' : 'blue');
	});

	outputLayer.ctx.beginPath();
	outputLayer.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
	outputLayer.ctx.lineWidth = 2;
	outputLayer.ctx.strokeStyle = 'green';
	outputLayer.ctx.stroke();
}

drawOutput();

function drawInput() {
	if (!srcImage.image) return;
	inputLayer.clear();
	inputLayer.ctx.drawImage(inputLayer.bgCanvas, 0, 0);

	inputLayer.ctx.setLineDash([5, 5]);
	for (let i = 0; i < 4; i++) {
		if (transformPoints[i]) {
			inputLayer.ctx.strokeStyle = colors[(i * 2 + 2) % 8];
			inputLayer.ctx.beginPath();
			inputLayer.ctx.moveTo(transformPoints[i].x, transformPoints[i].y);
			inputLayer.ctx.lineTo(transformPoints[(i + 1) % 4].x, transformPoints[(i + 1) % 4].y);
			inputLayer.ctx.stroke();
		}
	}
	inputLayer.ctx.setLineDash([]);

	if (mode === 'circle') {
		// 円モードの点を描画
		circlePoints.forEach(p => {
			inputLayer.drawCircle(p.x, p.y, 'magenta');
		});

		if (ellipse.isValid) {
			const { h, k, a, b, theta } = ellipse.params;
			inputLayer.ctx.strokeStyle = 'blue';
			inputLayer.ctx.beginPath();
			inputLayer.ctx.ellipse(h, k, a, b, theta, 0, 2 * Math.PI);
			inputLayer.ctx.stroke();
		}
	}else if (mode === 'trapezoid') {
		trapezoidPoints.forEach((p, i) => {
			inputLayer.drawCircle(p.x, p.y, colors[i]);
		});
	}

	transformPoints.forEach(p => {
		if (p) {
			inputLayer.drawCircle(p.x, p.y, 'cyan');
		}
	});
}

function updateTransformParams() {
	if (mode == 'trapezoid') {
		transformPoints = [
			lineIntersection(trapezoidPoints[0], trapezoidPoints[1], trapezoidPoints[2], trapezoidPoints[3]),
			lineIntersection(trapezoidPoints[2], trapezoidPoints[3], trapezoidPoints[4], trapezoidPoints[5]),
			lineIntersection(trapezoidPoints[4], trapezoidPoints[5], trapezoidPoints[6], trapezoidPoints[7]),
			lineIntersection(trapezoidPoints[6], trapezoidPoints[7], trapezoidPoints[0], trapezoidPoints[1])
		];

	} else if (mode == 'circle') {
		//ellipse.points = circlePoints;
		ellipse.fit();
		if (ellipse.isValid === false) {
			transformPoints = [null, null, null, null];
			return;
		}

		// 1. y最大・最小点
		const extrema = ellipse.findYExtrema();
		if (!extrema) {
			transformPoints = [null, null, null, null];
			return;
		}
		const yMax = extrema[0].y;
		const yMin = extrema[1].y;

		const yA = yMax;
		const yB = yMin;

		const vp = lineIntersection(extrema[0], extrema[1], { x: inputLayer.w / 2, y: yA }, { x: inputLayer.w / 2, y: yB });

		// 3. 各y座標で楕円上の2点
		let [tangentsC, tangentsD] = ellipse.tangentLinesThrough(vp);
		if (!tangentsC || !tangentsD) {
			const [pointsC, pointsD] = ellipse.findPointsAtY(yMax * 0.5 + yMin * 0.5);
			tangentsC = ellipse.tangentLineAt(pointsC);
			tangentsD = ellipse.tangentLineAt(pointsD);
		}

		// 6. y=yA, y=yBでのx軸平行線
		const lineA = { dx: 0, dy: 1, c: yA };
		const lineB = { dx: 0, dy: 1, c: yB };

		// 8. 4点を求める
		const p0 = intersect(lineA, tangentsD);
		const p1 = intersect(lineA, tangentsC);
		const p2 = intersect(lineB, tangentsC);
		const p3 = intersect(lineB, tangentsD);

		transformPoints = [p0, p1, p2, p3];
	}

	function lineIntersection(p1, p2, p3, p4) {
		const a1 = p2.y - p1.y;
		const b1 = p1.x - p2.x;
		const c1 = a1 * p1.x + b1 * p1.y;
		const a2 = p4.y - p3.y;
		const b2 = p3.x - p4.x;
		const c2 = a2 * p3.x + b2 * p3.y;
		return intersect({ dx: a1, dy: b1, c: c1 }, { dx: a2, dy: b2, c: c2 });
	}
	function intersect(line1, line2) {
		const { dx: a1, dy: b1, c: c1 } = line1;
		const { dx: a2, dy: b2, c: c2 } = line2;
		const det = a1 * b2 - a2 * b1;
		if (Math.abs(det) < 1e-10) return null;
		const x = (c1 * b2 - c2 * b1) / det;
		const y = (a1 * c2 - a2 * c1) / det;
		return { x, y };
	}
}


function updateTransformedImage(isLowRes = false) {
	if (!srcImage.image) return;
	if (!transformPoints.every(p => p)) {
		return;
	}
	const width = isLowRes ? lowResSize : 600;
	const height = isLowRes ? lowResSize : 600;
	const ctx = isLowRes ? offscreenOutputCtxLow : outputLayer.bgCtx;

	ctx.clearRect(0, 0, width, height);
	const src = transformPoints.map(p => C2ICoord(p));
	const H = computeRealWorldHomography(width, height, src);

	const outputData = ctx.createImageData(width, height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [srcX, srcY] = applyRealWorldHomography(H, x, y);
			const ix = Math.floor(srcX);
			const iy = Math.floor(srcY);
			if (ix >= 0 && iy >= 0 && ix < srcImage.w && iy < srcImage.h) {
				const srcIndex = (iy * srcImage.w + ix) * 4;
				const dstIndex = (y * width + x) * 4;
				for (let i = 0; i < 4; i++) {
					outputData.data[dstIndex + i] = srcImage.imgData.data[srcIndex + i];
				}
			}
		}
	}
	ctx.putImageData(outputData, 0, 0);
}

function applyRealWorldHomography(h, x, y) {
	const denom = h[6] * x + h[7] * y + 1;
	const nx = (h[0] * x + h[1] * y + h[2]) / denom;
	const ny = (h[3] * x + h[4] * y + h[5]) / denom;
	return [nx, ny];
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

	return [h1 / w, h2 / h, h3, h4 / w, h5 / h, h6, h7 / w, h8 / h];
}

function C2ICoord(p) {
	return {
		x: (p.x - imageOffset.x) / imageScale,
		y: (p.y - imageOffset.y) / imageScale
	};
}
