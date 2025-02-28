class WasteClassifier {
	constructor() {
		this.model = null;
		this.IMAGE_SIZE = 160;
		this.NUM_CLASSES = 6;
		this.batchSize = 32;
		this.dataset = {
			images: [],
			labels: [],
			categories: [],
		};
		this.categories = [
			'glass',
			'paper',
			'cardboard',
			'plastic',
			'metal',
			'trash',
		];

		this.setupEventListeners();
	}

	async loadDatasetInBatches() {
		try {
			// First, load the metadata
			const response = await fetch(
				'./trained_model/waste-classifier/metadata.json'
			);
			const metadata = await response.json();
			const numChunks = metadata.num_chunks;

			// Load data chunks one by one
			for (let i = 0; i < numChunks; i++) {
				const progress = ((i + 1) / numChunks) * 100;

				const chunkResponse = await fetch(
					`./trained_model/waste-classifier/dataset_chunk_${i}.json`
				);
				const chunkData = await chunkResponse.json();

				// Merge data
				this.dataset.images.push(...chunkData.images);
				this.dataset.labels.push(...chunkData.labels);
				this.dataset.categories = chunkData.categories;

				// Give the browser some time to process UI updates
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			return this.dataset;
		} catch (error) {
			console.error('Failed to load dataset:', error);
			alert(
				'Unable to load dataset, please ensure the data preprocessing script has been run.'
			);
			throw error;
		}
	}

	setupEventListeners() {
		const trainButton = document.getElementById('trainButton');
		const saveButton = document.createElement('button');
		saveButton.id = 'saveButton';
		saveButton.className = 'download-btn';
		saveButton.innerHTML = '<i class="fas fa-download"></i> Save Model';
		saveButton.style.display = 'none';

		trainButton.addEventListener('click', () => this.startTraining());
		saveButton.addEventListener('click', () => this.saveModel());

		// Add save button to the page
		trainButton.parentNode.insertBefore(saveButton, trainButton.nextSibling);
	}

	createModel() {
		const model = tf.sequential();

		// Input normalization layer
		model.add(
			tf.layers.rescaling({
				inputShape: [this.IMAGE_SIZE, this.IMAGE_SIZE, 3],
				scale: 1 / 255,
			})
		);

		// First convolutional block
		model.add(
			tf.layers.conv2d({
				filters: 32,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(
			tf.layers.conv2d({
				filters: 32,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
		model.add(tf.layers.batchNormalization());

		// Second convolutional block
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
		model.add(tf.layers.batchNormalization());

		// Third convolutional block
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				padding: 'same',
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
		model.add(tf.layers.batchNormalization());

		// Flatten layer
		model.add(tf.layers.flatten());

		// More complex fully connected layer
		model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
		model.add(tf.layers.dropout({ rate: 0.5 }));
		model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
		model.add(tf.layers.dropout({ rate: 0.3 }));
		model.add(
			tf.layers.dense({ units: this.NUM_CLASSES, activation: 'softmax' })
		);

		return model;
	}

	async loadAndPreprocessData() {
		const data = {
			images: [],
			labels: [],
		};

		for (let i = 0; i < this.categories.length; i++) {
			const category = this.categories[i];
			try {
				// Load images for each category
				// Reduce the number of training images per category
				const imageFiles = Array.from(
					{ length: 40 },
					(_, index) => `${category}${index + 1}.jpg`
				);

				for (const file of imageFiles) {
					const img = await this.loadImage(`./data/${category}/${file}`);
					const tensor = this.preprocessImage(img);
					data.images.push(tensor);
					data.labels.push(i);
				}
			} catch (error) {
				console.error(`Error loading ${category} images:`, error);
				continue; // Skip images that failed to load
			}
		}

		// Convert to tensor
		const xs = tf.stack(data.images, 0);
		const ys = tf.oneHot(tf.tensor1d(data.labels, 'int32'), this.NUM_CLASSES);

		return { xs, ys };
	}

	async loadImage(path) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = path;
		});
	}

	preprocessImage(img) {
		return tf.tidy(() => {
			// Stronger data augmentation
			const tensor = tf.browser
				.fromPixels(img)
				.resizeNearestNeighbor([this.IMAGE_SIZE, this.IMAGE_SIZE])
				// Random flip
				.reshape([1, this.IMAGE_SIZE, this.IMAGE_SIZE, 3])
				.tile([2, 1, 1, 1]);

			const augmented = tf.tidy(() => {
				// Random brightness
				const brightness = tensor.mul(tf.randomUniform([2, 1, 1, 1], 0.8, 1.2));
				// Random contrast
				const contrast = brightness
					.sub(brightness.mean())
					.mul(tf.randomUniform([2, 1, 1, 1], 0.8, 1.2))
					.add(brightness.mean());
				return contrast.clipByValue(0, 255);
			});

			// Return the augmented single image
			return augmented
				.slice([0], [1])
				.reshape([this.IMAGE_SIZE, this.IMAGE_SIZE, 3]);
		});
	}

	async startTraining() {
		try {
			const trainButton = document.getElementById('trainButton');
			trainButton.disabled = true;
			trainButton.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Loading Data...';

			// Load dataset
			const dataset = await this.loadDatasetInBatches();

			// Create model
			this.model = this.createModel();

			// Configure model
			const learningRate = parseFloat(
				document.getElementById('learningRate').value
			);
			const batchSize = parseInt(document.getElementById('batchSize').value);
			const epochs = parseInt(document.getElementById('epochs').value);

			this.model.compile({
				optimizer: tf.train.adam(learningRate),
				loss: 'categoricalCrossentropy',
				metrics: ['accuracy'],
			});

			// Prepare training data
			const data = this.prepareTrainingData(dataset);

			// Start training
			trainButton.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Training...';

			// Create containers for loss and accuracy charts
			const lossContainer = document.getElementById('lossChart');
			const accuracyContainer = document.getElementById('accuracyChart');
			const history = {
				loss: [],
				accuracy: [],
			};

			await this.model.fit(data.xs, data.ys, {
				batchSize,
				epochs,
				validationSplit: 0.2,
				callbacks: {
					onEpochEnd: (epoch, logs) => {
						// Update history data
						history.loss.push({ x: epoch, y: logs.loss });
						history.accuracy.push({ x: epoch, y: logs.acc });

						// Update charts
						tfvis.render.linechart(
							{ name: 'Loss', tab: 'Training' },
							{ values: history.loss },
							{
								xLabel: 'Epoch',
								yLabel: 'Loss',
								width: 600,
								height: 300,
							}
						);

						tfvis.render.linechart(
							{ name: 'Accuracy', tab: 'Training' },
							{ values: history.accuracy },
							{
								xLabel: 'Epoch',
								yLabel: 'Accuracy',
								width: 600,
								height: 300,
							}
						);

						// Update progress stats
						const stats = document.getElementById('progressStats');
						stats.innerHTML = `
							<p>Epoch ${epoch + 1}/${epochs}</p>
							<p>Training Loss: ${logs.loss.toFixed(4)}</p>
							<p>Training Accuracy: ${(logs.acc * 100).toFixed(2)}%</p>
							<p>Validation Loss: ${logs.val_loss.toFixed(4)}</p>
							<p>Validation Accuracy: ${(logs.val_acc * 100).toFixed(2)}%</p>
						`;
					},
				},
			});

			// Training complete
			trainButton.innerHTML = '<i class="fas fa-check"></i> Training Complete';
			await this.evaluateModel(data);

			// Save model
			try {
				await this.model.save('indexeddb://waste-classifier');
				console.log('Model saved to IndexedDB');

				await this.model.save('downloads://waste-classifier');
				console.log('Model files downloaded');

				alert('Model successfully saved!');
			} catch (error) {
				console.error('Failed to save model:', error);
				alert('Failed to save model, please check the console for details.');
			}
		} catch (error) {
			console.error('Training error:', error);
			trainButton.innerHTML =
				'<i class="fas fa-exclamation-triangle"></i> Training Failed';
		}
	}

	async evaluateModel(data) {
		const predictions = this.model.predict(data.xs);
		const predArray = await predictions.argMax(1).array();
		const labelArray = await data.ys.argMax(1).array();
		// Calculate confusion matrix
		const confusionMatrix = Array(this.NUM_CLASSES)
			.fill(0)
			.map(() => Array(this.NUM_CLASSES).fill(0));

		for (let i = 0; i < predArray.length; i++) {
			confusionMatrix[labelArray[i]][predArray[i]] += 1;
		}

		// Display confusion matrix
		await tfvis.render.confusionMatrix(
			{ name: 'Confusion Matrix', tab: 'Evaluation' },
			{
				values: confusionMatrix,
				tickLabels: this.categories,
			}
		);

		// Display evaluation results
		const testResults = document.getElementById('testResults');
		const accuracy =
			predArray.reduce(
				(acc, pred, i) => acc + (pred === labelArray[i] ? 1 : 0),
				0
			) / predArray.length;

		testResults.innerHTML = `
			<div class="evaluation-stats">
				<p>Test Accuracy: ${(accuracy * 100).toFixed(2)}%</p>
				<p>Total Images: ${predArray.length}</p>
			</div>
		`;
	}

	async saveModel() {
		if (!this.model) {
			alert('No model available to save. Please train the model first.');
			return;
		}

		try {
			// 保存到 IndexedDB
			await this.model.save('indexeddb://waste-classifier');
			console.log('Model saved to IndexedDB');

			// Download model files
			await this.model.save('downloads://waste-classifier');
			console.log('Model files downloaded');

			alert('Model successfully saved!');
		} catch (error) {
			console.error('Failed to save model:', error);
			alert('Failed to save model, please check the console for details.');
		}
	}

	prepareTrainingData(dataset) {
		// Convert to tensor
		const xs = tf
			.concat(dataset.images)
			.reshape([dataset.images.length, this.IMAGE_SIZE, this.IMAGE_SIZE, 3]);

		// Convert labels to one-hot encoding
		const ys = tf.oneHot(
			tf.tensor1d(dataset.labels, 'int32'),
			this.NUM_CLASSES
		);

		return { xs, ys };
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new WasteClassifier();
});
