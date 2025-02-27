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

		// Display image preview
		this.displayImagePreview(file);

		try {
			// Convert image to base64
			const base64Image = await this.getBase64(file);
			// Call Google Vision API
			const result = await this.analyzeImage(base64Image);
			console.log('Analysis result:', result);
			// Process analysis results
			this.processResults(result);
		} catch (error) {
			console.error('Error:', error);
			alert('Image analysis failed, please try again');
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
			// Wait for SDK to load

			// Initialize Gemini API
			const genAI = new window.GoogleGenerativeAI(config.GEMINI_API.key);
			const model = genAI.getGenerativeModel({
				model: 'gemini-2.0-flash-exp',
				generationConfig: {
					temperature: 1.8,
					topK: 32,
					topP: 1,
					maxOutputTokens: 50,
				},
			});

			// Create image data
			const imageData = {
				inlineData: {
					data: base64Image,
					mimeType: 'image/jpeg',
				},
			};

			// Create prompt
			const prompt =
				'Can you classify this picture for waste sorting? If it\'s hazardous waste (including batteries, electronics, chemicals, medicines, light bulbs), say "hazardous". If it\'s food or organic waste (including fruits, vegetables, leftovers, garden waste), say "food". If it looks reusable (like clothes, furniture, books, toys in good condition), say "reusable". If it\'s a deposit-returnable item (metal/plastic can or bottle), say "deposit". Otherwise, describe the main material (metal, plastic, paper, textile, etc). Please respond with only 1-2 words.';

			// Send request
			const result = await model.generateContent([prompt, imageData]);
			const response = await result.response;
			const text = response.text();

			console.log('API response:', text);

			// Parse Gemini text response
			const labels = text
				.split(',')
				.map((label) => label.trim())
				.filter((label) => label.length > 0);

			// Convert result format to match original processing
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
			console.error('Error analyzing image:', error.message);
			alert('Image analysis failed, please try again');
			throw error;
		}
	}

	processResults(apiResult) {
		const labels = apiResult.responses[0].labelAnnotations;
		let category = this.determineWasteCategory(labels);
		console.log(labels);
		console.log(category);
		this.displayResults(category, labels);
	}

	determineWasteCategory(labels) {
		console.log('Determining waste category/labels:', labels); // Debug log
		const labelNames = labels.map((label) => label.description.toLowerCase());
		console.log(labelNames);

		// Check if "deposit" is directly detected
		if (labelNames.includes('deposit')) {
			console.log('Direct deposit detection');
			return 'deposit';
		}

		// Check if it's hazardous waste
		const hazardousKeywords = config.wasteCategories.hazardous;
		const isHazardous = labelNames.some((label) =>
			hazardousKeywords.some(
				(keyword) => label.includes(keyword) || keyword.includes(label)
			)
		);

		if (isHazardous || labelNames.includes('hazardous')) {
			console.log('Classified as hazardous waste');
			return 'hazardous';
		}

		// Check if it's food or organic waste
		const foodKeywords = config.wasteCategories.food;
		const isFood = labelNames.some((label) =>
			foodKeywords.some(
				(keyword) => label.includes(keyword) || keyword.includes(label)
			)
		);

		if (isFood || labelNames.includes('food')) {
			console.log('Classified as food waste');
			return 'food';
		}

		// First check if item is deposit-returnable
		const depositKeywords = config.wasteCategories.deposit;
		const isDeposit = labelNames.some((label) =>
			depositKeywords.some(
				(keyword) => label.includes(keyword) || keyword.includes(label)
			)
		);

		// If it's a bottle or can, check if it's likely a deposit item
		if (
			isDeposit &&
			labelNames.some(
				(label) =>
					label.includes('bottle') ||
					label.includes('can') ||
					label.includes('container')
			)
		) {
			console.log('Classified as deposit item');
			return 'deposit';
		}

		// First check if item is reusable
		const reusableKeywords = config.wasteCategories.reuse;
		if (
			labelNames.some((label) =>
				reusableKeywords.some(
					(keyword) => label.includes(keyword) || keyword.includes(label)
				)
			)
		) {
			return 'reuse';
		}

		for (const [category, keywords] of Object.entries(config.wasteCategories)) {
			// Skip reuse and deposit as we already checked them
			if (category === 'reuse' || category === 'deposit') continue;
			console.log('category' + category);
			console.log(keywords);
			if (
				keywords.some((keyword) =>
					labelNames.some(
						(label) => label.includes(keyword) || keyword.includes(label)
					)
				)
			) {
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

		console.log('Displaying results for category:', category); // Debug log

		const categoryMessages = {
			deposit: 'This is a deposit-return item', // Move deposit to top
			recyclable: 'This is recyclable waste',
			hazardous: 'This is hazardous waste',
			food: 'This is food waste',
			other: 'This is other waste',
			reuse: 'This item can be reused',
		};

		console.log('Category message:', categoryMessages[category]); // Debug log

		resultContent.innerHTML = `
		<div class="result-card">
			<div class="result-icon ${category}"></div>
			<h3 class="result-title">${categoryMessages[category]}</h3>
			<p class="result-details">Detected features: ${labels
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
			<p>${guides[category]}</p>
		</div>`;
	}
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
	new WasteClassifier();
});
