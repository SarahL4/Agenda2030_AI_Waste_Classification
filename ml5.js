// 引入 ml5.js
class Ml5Classifier {
	constructor() {
		this.model = null;
		this.categories = [
			'glass',
			'paper',
			'cardboard',
			'plastic',
			'metal',
			'trash',
		];
		this.classifier = null; // Initialize the classifier here
		this.setupEventListeners();
		this.initializeClassifier(); // Call the method to initialize the classifier
	}

	async initializeClassifier() {
		// Initialize the image classifier
		this.classifier = await ml5.imageClassifier('MobileNet', () => {
			console.log('模型加载完成！MobileNet model loaded!');
		});
	}
	setupEventListeners() {
		// 绑定分类按钮的点击事件
		const uploadBtn = document.getElementById('uploadBtn');
		const imageInput = document.getElementById('imageInput');
		const classifyButton = document.getElementById('classifyButton');

		uploadBtn.addEventListener('click', () => {
			imageInput.click();
		});

		let img;
		imageInput.addEventListener('change', (e) => {
			if (e.target.files.length > 0) {
				const file = e.target.files[0];
				this.processImage(file).then((processImg) => (img = processImg));
			}
		});

		// classifyButton.addEventListener('click', function () {
		// 	console.log('Button clicked');
		// 	// Your classification logic here
		// });

		if (!classifyButton) {
			console.error('classifyButton not found!');
			return;
		}
		classifyButton.addEventListener('click', () => {
			if (img) {
				this.classifyImage(img);
			} else {
				console.warn('No image to classifty');
			}
		});
	}

	async processImage(file) {
		try {
			const img = await this.loadImage(file);
			this.displayImage(img);
			return img;
		} catch (error) {
			console.error('Error processing image:', error);
		}
	}

	loadImage(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = e.target.result;
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	displayImage(img) {
		const preview = document.getElementById('imagePreview');
		preview.innerHTML = '';
		preview.appendChild(img);
	}

	// 分类图像的函数
	async classifyImage(img) {
		if (!img) {
			console.error('未找到图像元素');
			return;
		}

		// 使用分类器对图像进行分类
		if (this.classifier) {
			this.classifier.classify(img, (err, results) => {
				if (results) {
					console.error('分类出错:', results);
					return;
				}
				console.log('分类结果:', err);
				this.getMostLikelyCategory(err);

				// 在页面上显示分类结果
				const resultElement = document.getElementById('result');
				if (resultElement) {
					resultElement.innerHTML = err
						.map(
							(result) =>
								`<p>${result.label} (置信度: ${result.confidence.toFixed(
									4
								)})</p>`
						)
						.join('');
				}
			});
		} else {
			console.warn('Classifier not initialized');
		}

		// Find the category with the highest confidence
	}

	getMostLikelyCategory(results) {
		if (results && Array.isArray(results) && results.length > 0) {
			let highestConfidence = 0;
			let category = null;

			results.forEach((result) => {
				if (result.confidence > highestConfidence) {
					highestConfidence = result.confidence;
					category = result.label;
				}
			});

			if (category) {
				this.displayResults(category, highestConfidence);
			} else {
				console.warn('No category found with sufficient confidence.');
			}
		} else {
			console.warn('No results to display.');
		}
	}

	displayResults(category, confidence) {
		const resultSection = document.createElement('div');
		resultSection.className = 'result-section';

		const { binType, guide } = this.getDisposalGuide(category);

		resultSection.innerHTML = `
			<div class="result-container">
				<div class="result-left">
					<div class="result-card">
						<h3 class="result-title">分类结果</h3>
						<div class="result-details">
							<p>识别类别: <span class="label-tag">${category}</span></p>
							<p>置信度: ${(confidence * 100).toFixed(2)}%</p>
						</div>
					</div>
					<div class="result-card">
						<h3 class="result-title">处理指南</h3>
						<div class="result-details">
							<p>${guide}</p>
						</div>
					</div>
				</div>
				<div class="result-right">
					<div class="bin-image">
						<img src="${binType}" alt="推荐垃圾桶" />
					</div>
				</div>
			</div>
		`;

		const existingResults = document.querySelector('.result-section');
		if (existingResults) {
			existingResults.remove();
		}

		document.querySelector('.container').appendChild(resultSection);
	}

	getDisposalGuide(category) {
		const guides = {
			glass: {
				bin: './src/glass.jpg',
				guide:
					'玻璃制品应放入玻璃回收箱。请确保清洗干净并去除任何非玻璃部件。建议使用专门的玻璃回收容器，避免破碎造成危险。',
			},
			paper: {
				bin: './src/paper.jpg',
				guide:
					'纸张应放入纸类回收箱。请确保纸张干净，无污染。报纸、杂志和办公用纸可以叠放整齐后回收。',
			},
			cardboard: {
				bin: './src/other.jpg',
				guide:
					'纸板应折叠后放入纸类回收箱。请去除所有胶带和金属扣件。大型纸箱建议压扁以节省空间。',
			},
			plastic: {
				bin: './src/plastic.jpg',
				guide:
					'塑料制品应放入塑料回收箱。请确保清洗干净并压扁以节省空间。注意检查塑料制品上的回收标志。',
			},
			metal: {
				bin: './src/metall.jpg',
				guide:
					'金属制品应放入金属回收箱。易拉罐和罐头盒请清洗干净。大型金属物品请送至专门回收点。',
			},
			trash: {
				bin: './src/others.jpg',
				guide:
					'无法回收的垃圾请放入其他垃圾箱。请确保安全处理，如有害垃圾需要特殊处理。',
			},
		};

		return {
			binType: guides[category].bin,
			guide: guides[category].guide,
		};
	}
}
// 页面加载完成后初始化分类器
document.addEventListener('DOMContentLoaded', () => {
	// 初始化 MobileNet 图像分类器
	new Ml5Classifier();
});
