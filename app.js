class WasteClassifier {
	constructor() {
		this.setupEventListeners();
		this.waitForSDK();
	}

	setupEventListeners() {
		const uploadBtn = document.getElementById('uploadBtn');
		const imageInput = document.getElementById('imageInput');

		uploadBtn.addEventListener('click', () => {
			imageInput.click();
		});

		imageInput.addEventListener('change', (e) => {
			this.handleImageUpload(e);
		});
	}

	waitForSDK() {
		return new Promise((resolve) => {
			if (window.GoogleGenerativeAI) {
				resolve();
			} else {
				window.addEventListener('load', () => {
					resolve();
				});
			}
		});
	}

	async handleImageUpload(event) {
		const file = event.target.files[0];
		if (!file) return;

		// 显示图片预览
		this.displayImagePreview(file);

		try {
			// 转换图片为base64
			const base64Image = await this.getBase64(file);
			// 调用Google Vision API
			const result = await this.analyzeImage(base64Image);
			// 处理分析结果
			this.processResults(result);
		} catch (error) {
			console.error('Error:', error);
			alert('图片分析失败，请重试');
		}
	}

	displayImagePreview(file) {
		const preview = document.getElementById('imagePreview');
		const img = document.createElement('img');
		img.src = URL.createObjectURL(file);
		preview.innerHTML = '';
		preview.appendChild(img);
	}

	getBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result.split(',')[1]);
			reader.onerror = (error) => reject(error);
		});
	}

	async analyzeImage(base64Image) {
		try {
			// 等待 SDK 加载完成
			await this.waitForSDK();

			// 初始化 Gemini API
			const genAI = new window.GoogleGenerativeAI(config.GEMINI_API.key);
			const model = genAI.getGenerativeModel({
				model: 'gemini-2.0-flash-exp',
				generationConfig: {
					temperature: 0.4,
					topK: 32,
					topP: 1,
					maxOutputTokens: 50,
				},
			});

			// 创建图片数据
			const imageData = {
				inlineData: {
					data: base64Image,
					mimeType: 'image/jpeg',
				},
			};

			// 创建提示
			const prompt =
				'Can you classify this picture to waste classification? Is it a metal, plastic, paper or other material? Please respond with only 1-2 words.';

			// 发送请求
			const result = await model.generateContent([prompt, imageData]);
			const response = await result.response;
			const text = response.text();

			console.log('API返回结果:', text);

			// 解析 Gemini 返回的文本结果
			const labels = text
				.split(',')
				.map((label) => label.trim())
				.filter((label) => label.length > 0);

			// 转换结果格式以匹配原来的处理方式
			return {
				responses: [
					{
						labelAnnotations: labels.map((label) => ({
							description: label,
							score: 1.0,
						})),
					},
				],
			};
		} catch (error) {
			console.error('分析图片时出错:', error.message);
			alert('图片分析失败，请重试');
			throw error;
		}
	}

	processResults(apiResult) {
		const labels = apiResult.responses[0].labelAnnotations;
		let category = this.determineWasteCategory(labels);

		this.displayResults(category, labels);
	}

	determineWasteCategory(labels) {
		const labelNames = labels.map((label) => label.description.toLowerCase());

		for (const [category, keywords] of Object.entries(config.wasteCategories)) {
			if (keywords.some((keyword) => labelNames.includes(keyword))) {
				return category;
			}
		}

		return 'other';
	}

	displayResults(category, labels) {
		const resultSection = document.getElementById('resultSection');
		const resultContent = document.getElementById('resultContent');
		const binImage = document.getElementById('binImage');
		const disposalGuide = document.getElementById('disposalGuide');

		resultSection.style.display = 'block';

		const categoryMessages = {
			recyclable: '这是可回收垃圾',
			hazardous: '这是有害垃圾',
			food: '这是厨余垃圾',
			other: '这是其他垃圾',
		};

		resultContent.innerHTML = `
		<div class="result-card">
			<div class="result-icon ${category}"></div>
			<h3 class="result-title">${categoryMessages[category]}</h3>
			<p class="result-details">识别到的特征：${labels
				.map((label) => `<span class="label-tag">${label.description}</span>`)
				.join('')}</p>
		</div>
		`;

		binImage.innerHTML = `
		<div class="bin-image">
			<img src="${config.binImages[category]}" alt="${category} bin">
		</div>
		`;

		disposalGuide.innerHTML = this.getDisposalGuide(category);
	}

	getDisposalGuide(category) {
		const guides = {
			recyclable: '请确保物品清洁干燥，投放到可回收垃圾桶',
			hazardous: '请妥善包装，送到专门的有害垃圾回收点',
			food: '请沥干水分后投放到厨余垃圾桶',
			other: '请投放到其他垃圾桶',
		};

		return `<div class="disposal-guide">
			<h3>处理建议</h3>
			<p>${guides[category]}</p>
		</div>`;
	}
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
	new WasteClassifier();
});
