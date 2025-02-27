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
			// 首先加载元数据
			const response = await fetch(
				'./trained_model/waste-classifier/metadata.json'
			);
			const metadata = await response.json();
			const numChunks = metadata.num_chunks;

			// 逐个加载数据块
			for (let i = 0; i < numChunks; i++) {
				const progress = ((i + 1) / numChunks) * 100;
				document.getElementById(
					'datasetStatus'
				).innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在加载数据集... ${progress.toFixed(
					1
				)}%`;

				const chunkResponse = await fetch(
					`./trained_model/waste-classifier/dataset_chunk_${i}.json`
				);
				const chunkData = await chunkResponse.json();

				// 合并数据
				this.dataset.images.push(...chunkData.images);
				this.dataset.labels.push(...chunkData.labels);
				this.dataset.categories = chunkData.categories;

				// 给浏览器一些时间来处理UI更新
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			document.getElementById('datasetStatus').innerHTML =
				'<i class="fas fa-check"></i> 数据集加载完成';

			return this.dataset;
		} catch (error) {
			console.error('加载数据集失败:', error);
			alert('无法加载数据集，请确保已运行数据预处理脚本。');
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

		// 添加保存按钮到页面
		trainButton.parentNode.insertBefore(saveButton, trainButton.nextSibling);
	}

	createModel() {
		const model = tf.sequential();

		// 输入标准化层
		model.add(
			tf.layers.rescaling({
				inputShape: [this.IMAGE_SIZE, this.IMAGE_SIZE, 3],
				scale: 1 / 255,
			})
		);

		// 第一个卷积块
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

		// 第二个卷积块
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

		// 第三个卷积块
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

		// 展平层
		model.add(tf.layers.flatten());

		// 更复杂的全连接层
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
				// 加载每个类别的图片
				// 减少每类的训练图片数量
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
			// 更强的数据增强
			const tensor = tf.browser
				.fromPixels(img)
				.resizeNearestNeighbor([this.IMAGE_SIZE, this.IMAGE_SIZE])
				// 随机翻转
				.reshape([1, this.IMAGE_SIZE, this.IMAGE_SIZE, 3])
				.tile([2, 1, 1, 1]);

			const augmented = tf.tidy(() => {
				// 随机亮度
				const brightness = tensor.mul(tf.randomUniform([2, 1, 1, 1], 0.8, 1.2));
				// 随机对比度
				const contrast = brightness
					.sub(brightness.mean())
					.mul(tf.randomUniform([2, 1, 1, 1], 0.8, 1.2))
					.add(brightness.mean());
				return contrast.clipByValue(0, 255);
			});

			// 返回增强后的单个图像
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

			// 加载数据集
			const dataset = await this.loadDatasetInBatches();

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

			// 准备训练数据
			const data = this.prepareTrainingData(dataset);

			// 开始训练
			trainButton.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Training...';

			// 创建损失和准确率的图表容器
			const lossContainer = document.getElementById('lossChart');
			const accuracyContainer = document.getElementById('accuracyChart');

			// 存储训练历史
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
						// 更新历史数据
						history.loss.push({ x: epoch, y: logs.loss });
						history.accuracy.push({ x: epoch, y: logs.acc });

						// 更新图表
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

						// 更新进度统计
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

			// 训练完成
			trainButton.innerHTML = '<i class="fas fa-check"></i> Training Complete';
			await this.evaluateModel(data);

			// 保存模型
			try {
				await this.model.save('indexeddb://waste-classifier');
				console.log('模型已保存到 IndexedDB');

				await this.model.save('downloads://waste-classifier');
				console.log('模型文件已下载');

				alert('模型已成功保存！');
			} catch (error) {
				console.error('保存模型失败:', error);
				alert('保存模型失败，请查看控制台了解详情。');
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

	async saveModel() {
		if (!this.model) {
			alert('没有可保存的模型。请先训练模型。');
			return;
		}

		try {
			// 保存到 IndexedDB
			await this.model.save('indexeddb://waste-classifier');
			console.log('模型已保存到 IndexedDB');

			// 下载模型文件
			await this.model.save('downloads://waste-classifier');
			console.log('模型文件已下载');

			alert('模型已成功保存！');
		} catch (error) {
			console.error('保存模型失败:', error);
			alert('保存模型失败，请查看控制台了解详情。');
		}
	}

	prepareTrainingData(dataset) {
		// 转换为张量
		const xs = tf.tensor4d(dataset.images, [
			dataset.images.length,
			this.IMAGE_SIZE,
			this.IMAGE_SIZE,
			3,
		]);

		// 转换标签为 one-hot 编码
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
