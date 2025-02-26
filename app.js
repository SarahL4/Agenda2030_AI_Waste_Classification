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
					temperature: 0.4,
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
				'Can you classify this picture to waste classification? Is it a metal, plastic, paper or other material? Please respond with only 1-2 words.';

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
			recyclable: 'This is recyclable waste',
			hazardous: 'This is hazardous waste',
			food: 'This is food waste',
			other: 'This is other waste',
		};

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
