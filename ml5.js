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
				/*{
					"label": "ashcan, trash can, garbage can, wastebin, ash bin, ash-bin, ashbin, dustbin, trash barrel, trash bin",
					"confidence": 0.5448657274246216
				}*/
				this.getMostLikelyCategory(err);

				// 在页面上显示分类结果
				const resultElement = document.getElementById('result');
				const resultprobability = document.getElementById('resultprobability');
				resultprobability.style.display = 'block';
				if (resultElement) {
					resultElement.innerHTML = err
						.map((result) => {
							const confidencePercentage = result.confidence * 100;
							return `
							<div class="resultElement-row">
								<div class="resultElement-left">
									<span class="label-tag">${result.label}</span>
								</div>
								<div class="resultElement-right">
									<div class="label-container">
										<div class="confidence-bar" style="width: ${confidencePercentage}%;"></div>
										<span style="margin-left: 5px;">${result.confidence * 100}</span>
									</div>
								</div>
							</div>
						`;
						})
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
			let labels = null;

			results.forEach((result) => {
				if (result.confidence > highestConfidence) {
					highestConfidence = result.confidence;
					labels = result.label;
					//ashcan, trash can, garbage can, wastebin, ash bin, ash-bin, ashbin, dustbin, trash barrel, trash bin
				}
			});

			if (labels) {
				this.processResults(labels);
			} else {
				console.warn('No category found with sufficient confidence.');
			}
		} else {
			console.warn('No results to display.');
		}
	}

	processResults(labels) {
		// const { binType, guide } = this.determineWasteCategory(category);
		let wasteCategory = this.determineWasteCategory(labels);
		console.log(labels);
		this.displayResults(wasteCategory, labels);
	}

	determineWasteCategory(labels) {
		console.log(labels);

		// Check if "deposit" is directly detected
		if (labels.includes('deposit')) {
			console.log('Direct deposit detection');
			return 'deposit';
		}

		// Check if it's hazardous waste
		const hazardousKeywords = config.wasteCategories.hazardous;
		// const isHazardous = labels.some((label) =>
		// 	hazardousKeywords.some(
		// 		(keyword) => label.includes(keyword) || keyword.includes(label)
		// 	)
		// );

		const isHazardous = hazardousKeywords.some((keyword) =>
			labels.includes(keyword)
		);

		if (isHazardous || labels.includes('hazardous')) {
			console.log('Classified as hazardous waste');
			return 'hazardous';
		}

		// Check if it's food or organic waste
		const foodKeywords = config.wasteCategories.food;
		// const isFood = labels.some((label) =>
		// 	foodKeywords.some(
		// 		(keyword) => label.includes(keyword) || keyword.includes(label)
		// 	)
		// );

		const isFood = foodKeywords.some((keyword) => labels.includes(keyword));

		if (isFood || labels.includes('food')) {
			console.log('Classified as food waste');
			return 'food';
		}

		// First check if item is deposit-returnable
		const depositKeywords = config.wasteCategories.deposit;
		// const isDeposit = labels.some((label) =>
		// 	depositKeywords.some(
		// 		(keyword) => label.includes(keyword) || keyword.includes(label)
		// 	)
		// );
		const isDeposit = depositKeywords.some((keyword) =>
			labels.includes(keyword)
		);
		// If it's a bottle or can, check if it's likely a deposit item
		if (
			isDeposit &&
			(labels.includes('bottle') ||
				labels.includes('can') ||
				labels.includes('container'))
		) {
			console.log('Classified as deposit item');
			return 'deposit';
		}

		// First check if item is reusable
		const reusableKeywords = config.wasteCategories.reuse;
		// if (
		// 	labels.some((label) =>
		// 		reusableKeywords.some(
		// 			(keyword) => label.includes(keyword) || keyword.includes(label)
		// 		)
		// 	)
		// ) {
		// 	return 'reuse';
		// }

		const isReusable = reusableKeywords.some((keyword) =>
			labels.includes(keyword)
		);
		if (isReusable) {
			return 'reuse';
		}

		for (const [category, keywords] of Object.entries(config.wasteCategories)) {
			// Skip reuse and deposit as we already checked them
			if (category === 'reuse' || category === 'deposit') continue;
			console.log('category' + category);
			console.log(keywords);

			if (keywords.some((keyword) => labels.includes(keyword))) {
				return category;
			}
		}

		return 'other';
	}

	displayResults(wasteCategory, labels) {
		const resultSection = document.getElementById('resultSection');
		const resultContent = document.getElementById('resultContent');
		const binImage = document.getElementById('binImage');
		const disposalGuide = document.getElementById('disposalGuide');

		resultSection.style.display = 'block';

		console.log('Displaying results for category:', wasteCategory); // Debug log

		const categoryMessages = {
			deposit: 'This is a deposit-return item', // Move deposit to top
			recyclable: 'This is recyclable waste',
			hazardous: 'This is hazardous waste',
			food: 'This is food waste',
			other: 'This is other waste',
			reuse: 'This item can be reused',
		};

		console.log('Category message:', categoryMessages[wasteCategory]); // Debug log

		resultContent.innerHTML = `
		<div class="result-card">
			<div class="result-icon ${wasteCategory}"></div>
			<h3 class="result-title">${categoryMessages[wasteCategory]}</h3>
			
			<p class="result-details">Detected features: ${labels
				.split(',')
				.map((label) => `<span class="label-tag">${label}</span>`)
				.join('')}</p>

		</div>
		`;

		binImage.innerHTML = `
		<div class="bin-image">
			<img src="${config.binImages[wasteCategory]}" alt="${wasteCategory} bin">
		</div>
		`;

		disposalGuide.innerHTML = this.getDisposalGuide(wasteCategory);
	}

	getDisposalGuide(wasteCategory) {
		const guides = {
			recyclable:
				'Please ensure items are clean and dry before placing in recycling bin',
			hazardous:
				'Please package properly and take to a specialized hazardous waste collection point',
			food: 'Please drain excess water before placing in food waste bin',
			other: 'Please place in general waste bin',
			reuse:
				'Please take this item to a reuse center or donate it if in good condition',
			deposit:
				'Please return this item to a deposit-return machine or store first to get your deposit back. If not accepted, then place it in the recycling bin.',
		};

		return `<div class="disposal-guide">
			<h3>Disposal Guide</h3>
			<p>${guides[wasteCategory]}</p>
		</div>`;
	}
}
// 页面加载完成后初始化分类器
document.addEventListener('DOMContentLoaded', () => {
	// 初始化 MobileNet 图像分类器
	new Ml5Classifier();
});
