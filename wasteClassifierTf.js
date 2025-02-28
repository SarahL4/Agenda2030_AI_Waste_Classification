class TFWasteClassifier {
	constructor() {
		this.model = null;
		this.IMAGE_SIZE = 160;
		this.categories = [
			'glass',
			'paper',
			'cardboard',
			'plastic',
			'metal',
			'trash',
		];
		this.setupEventListeners();
		this.loadModel();
	}

	async saveModel() {
		if (!this.model) {
			alert('No model available for download. Please load a model first.');
			return;
		}
		try {
			await this.model.save('downloads://model');
			alert(
				'The model has started downloading. You can place the downloaded model in the trained_model/waste-classifier/ directory to use it as a pre-trained model.'
			);
		} catch (error) {
			console.error('Failed to download the model:', error);
			alert(
				'Failed to download the model. Please check the console for more details.'
			);
		}
	}

	async loadModel() {
		try {
			// First, try to load the pre-trained model
			try {
				this.model = await tf.loadLayersModel(
					'./trained_model/waste-classifier/model.json'
				);
				console.log('Pre-trained model loaded successfully');
				alert(
					'Pre-trained model loaded successfully! You can start uploading images for classification.'
				);
				return;
			} catch (pretrainedError) {
				console.log(
					'Pre-trained model not found, trying to load locally trained model'
				);
			}

			// If the pre-trained model does not exist, try to load the locally trained model
			this.model = await tf.loadLayersModel('indexeddb://waste-classifier');
			alert(
				'Model loaded successfully! You can start uploading images for classification.'
			);
			// this.addDownloadButton();
		} catch (error) {
			console.error('Error loading TensorFlow.js model:', error);
			alert(
				'Unable to load the model. Please train and save the model on the Train Model page first.\n\n' +
					'If you have already trained the model, it might be because:\n' +
					'1. The browser does not support IndexedDB\n' +
					'2. Browser data has been cleared\n' +
					'3. A different browser is being used\n' +
					'4. There is no pre-trained model in the trained_model folder\n\n' +
					'Please retrain the model or use the same browser.'
			);
		}
	}

	setupEventListeners() {
		const uploadBtn = document.getElementById('uploadBtn');
		const imageInput = document.getElementById('imageInput');

		uploadBtn.addEventListener('click', () => {
			imageInput.click();
		});

		imageInput.addEventListener('change', (e) => {
			if (e.target.files.length > 0) {
				const file = e.target.files[0];
				this.processImage(file);
			}
		});
	}

	async processImage(file) {
		try {
			const img = await this.loadImage(file);
			this.displayImage(img);
			await this.classifyImage(img);
		} catch (error) {
			console.error('Error processing image:', error);
		}
	}

	async classifyImage(img) {
		if (!this.model) {
			alert('模型未加载，请先训练模型');
			return;
		}

		// Preprocess the image
		const tensor = tf.tidy(() => {
			return tf.browser
				.fromPixels(img)
				.resizeNearestNeighbor([this.IMAGE_SIZE, this.IMAGE_SIZE])
				.toFloat()
				.div(255.0)
				.expandDims();
		});

		// predict
		const predictions = await this.model.predict(tensor).data();
		const categoryIndex = predictions.indexOf(Math.max(...predictions));
		const category = this.categories[categoryIndex];
		const confidence = predictions[categoryIndex];

		// Show result
		this.displayResults(category, confidence);
		tensor.dispose();
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

	displayResults(category, confidence) {
		const resultSection = document.createElement('div');
		resultSection.className = 'result-section';

		const { categoryMessages, binType, guide } =
			this.getDisposalGuide(category);

		resultSection.innerHTML = `
			<div class="result-section">
				<h2>Analysis Result</h2>
				<div class="result-container">

					<div class="result-row">
						<div class="result-left">
							<div class="result-card">
								<h3 class="result-title">${categoryMessages[category]}</h3>
								<div class="result-details">
									<p>Detected features: <span class="label-tag">${category}</span></p>
									<p>Classification confidence: ${(confidence * 100).toFixed(2)}%</p>
								</div>
							</div>
						</div>
						<div class="result-right bin-image">
							<img src="${binType}" alt="bin type" />
						</div>
					</div>

					<div class="result-row">
						<div class="disposalGuide">
							<h3>Disposal Guide</h3>
							<p>${guide}</p>
						</div>
					</div>
				</div>
			</div>


			<div class="result-section" id="resultSection" style="display: none">
				<h2>Analysis Result</h2>
				<div class="result-container">
					<div class="result-row">
						<div class="result-left" id="resultContent"></div>
						<div class="result-right" id="binImage"></div>
					</div>
					<div class="result-row">
						<div id="disposalGuide" class="disposalGuide"></div>
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
		const categoryMessages = {
			glass: 'This is a recyclable waste',
			paper: 'This is recyclable waste',
			cardboard: 'This is recyclable waste',
			plastic: 'This is plastic waste',
			metal: 'This is recyclable waste',
			trash: 'This is other waste',
		};

		const guides = {
			glass: {
				bin: './src/glass.jpg',
				guide:
					'Glass items should be placed in the glass recycling bin. Please ensure they are clean and remove any non-glass parts. It is recommended to use a dedicated glass recycling container to avoid breakage hazards.',
			},
			paper: {
				bin: './src/paper.jpg',
				guide:
					'Paper should be placed in the paper recycling bin. Please ensure the paper is clean and uncontaminated. Newspapers, magazines, and office paper can be stacked neatly for recycling.',
			},
			cardboard: {
				bin: './src/recyclable.jpg',
				guide:
					'Cardboard should be folded and placed in the paper recycling bin. Please remove all tape and metal fasteners. Large boxes should be flattened to save space.',
			},
			plastic: {
				bin: './src/plastic.jpg',
				guide:
					'Plastic items should be placed in the plastic recycling bin. Please ensure they are clean and flattened to save space. Check the recycling symbols on plastic items.',
			},
			metal: {
				bin: './src/metall.jpg',
				guide:
					'Metal items should be placed in the metal recycling bin. Clean cans and tins thoroughly. Large metal items should be taken to a dedicated recycling point.',
			},
			trash: {
				bin: './src/others.jpg',
				guide:
					'Non-recyclable waste should be placed in the general trash bin. Ensure safe disposal, and special handling is required for hazardous waste.',
			},
		};

		return {
			categoryMessages: categoryMessages,
			binType: guides[category].bin,
			guide: guides[category].guide,
		};
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const navItems = document.querySelectorAll('.nav-item');

	navItems.forEach((item) => {
		if (item.href === window.location.href) {
			item.classList.add('active');
		} else {
			item.classList.remove('active');
		}
	});
	new TFWasteClassifier();
});
