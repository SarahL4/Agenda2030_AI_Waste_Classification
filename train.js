class WasteClassifier {
	constructor() {
		this.model = null;
		this.IMAGE_SIZE = 224;
		this.NUM_CLASSES = 6;
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

	setupEventListeners() {
		const trainButton = document.getElementById('trainButton');
		trainButton.addEventListener('click', () => this.startTraining());
	}

	createModel() {
		const model = tf.sequential();

		// 第一个卷积层
		model.add(
			tf.layers.conv2d({
				inputShape: [this.IMAGE_SIZE, this.IMAGE_SIZE, 3],
				filters: 32,
				kernelSize: 3,
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

		// 第二个卷积层
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

		// 第三个卷积层
		model.add(
			tf.layers.conv2d({
				filters: 64,
				kernelSize: 3,
				activation: 'relu',
			})
		);
		model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

		// 展平层
		model.add(tf.layers.flatten());

		// 全连接层
		model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
		model.add(tf.layers.dropout({ rate: 0.5 }));
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
				// 加载每个类别的图片
				// 直接加载前20张图片进行训练
				const imageFiles = Array.from(
					{ length: 20 },
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
				continue; // 跳过加载失败的图片
			}
		}

		// 转换为张量
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
			const tensor = tf.browser
				.fromPixels(img)
				.resizeNearestNeighbor([this.IMAGE_SIZE, this.IMAGE_SIZE])
				.toFloat()
				.div(255.0);
			return tensor;
		});
	}

	async startTraining() {
		try {
			const trainButton = document.getElementById('trainButton');
			trainButton.disabled = true;
			trainButton.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Loading Data...';

			// 创建模型
			this.model = this.createModel();

			// 配置模型
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

			// 加载数据
			const data = await this.loadAndPreprocessData();

			// 开始训练
			trainButton.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Training...';

			await this.model.fit(data.xs, data.ys, {
				batchSize,
				epochs,
				validationSplit: 0.2,
				callbacks: {
					onEpochEnd: async (epoch, logs) => {
						await this.updateTrainingProgress(epoch, logs);
					},
				},
			});

			// 训练完成
			trainButton.innerHTML = '<i class="fas fa-check"></i> Training Complete';
			await this.evaluateModel(data);
		} catch (error) {
			console.error('Training error:', error);
			trainButton.innerHTML =
				'<i class="fas fa-exclamation-triangle"></i> Training Failed';
		}
	}

	async updateTrainingProgress(epoch, logs) {
		const stats = document.getElementById('progressStats');
		stats.innerHTML = `
            <p>Epoch ${epoch + 1}</p>
            <p>Loss: ${logs.loss.toFixed(4)}</p>
            <p>Accuracy: ${(logs.acc * 100).toFixed(2)}%</p>
        `;

		// 使用 tfvis 更新损失和准确率图表
		const lossData = { values: [{ x: epoch, y: logs.loss }] };
		const accuracyData = { values: [{ x: epoch, y: logs.acc }] };

		await tfvis.render.linechart({ name: 'Loss', tab: 'Training' }, lossData, {
			xLabel: 'Epoch',
			yLabel: 'Loss',
		});

		await tfvis.render.linechart(
			{ name: 'Accuracy', tab: 'Training' },
			accuracyData,
			{ xLabel: 'Epoch', yLabel: 'Accuracy' }
		);
	}

	async evaluateModel(data) {
		const predictions = this.model.predict(data.xs);
		const predArray = await predictions.argMax(1).array();
		const labelArray = await data.ys.argMax(1).array();

		// 计算混淆矩阵
		const confusionMatrix = Array(this.NUM_CLASSES)
			.fill(0)
			.map(() => Array(this.NUM_CLASSES).fill(0));

		for (let i = 0; i < predArray.length; i++) {
			confusionMatrix[labelArray[i]][predArray[i]] += 1;
		}

		// 显示混淆矩阵
		await tfvis.render.confusionMatrix(
			{ name: 'Confusion Matrix', tab: 'Evaluation' },
			{
				values: confusionMatrix,
				tickLabels: this.categories,
			}
		);

		// 保存模型
		try {
			// 使用 IndexedDB 保存模型
			await this.model.save('indexeddb://waste-classifier');
			console.log('Model saved successfully');
		} catch (error) {
			console.error('Failed to save model:', error);
			// 如果保存失败，尝试下载模型
			await this.model.save('downloads://waste-classifier');
			console.log('Model downloaded as fallback');
		}

		// 显示评估结果
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
}

document.addEventListener('DOMContentLoaded', () => {
	new WasteClassifier();
});
