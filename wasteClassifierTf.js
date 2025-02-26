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
			alert('没有可下载的模型。请先加载模型。');
			return;
		}
		try {
			await this.model.save('downloads://model');
			alert(
				'模型已开始下载。您可以将下载的模型放在 trained_model/waste-classifier/ 目录下作为预训练模型使用。'
			);
		} catch (error) {
			console.error('下载模型失败:', error);
			alert('下载模型失败，请查看控制台了解详情。');
		}
	}

	async loadModel() {
		try {
			// 首先尝试加载预训练模型
			try {
				this.model = await tf.loadLayersModel(
					'./trained_model/waste-classifier/model.json'
				);
				console.log('预训练模型加载成功');
				alert('预训练模型加载成功！可以开始上传图片进行分类了。');
				this.addDownloadButton();
				return;
			} catch (pretrainedError) {
				console.log('未找到预训练模型，尝试加载本地训练的模型');
			}

			// 如果预训练模型不存在，尝试加载本地训练的模型
			this.model = await tf.loadLayersModel('indexeddb://waste-classifier');
			alert('模型加载成功！可以开始上传图片进行分类了。');
			this.addDownloadButton();
		} catch (error) {
			console.error('Error loading TensorFlow.js model:', error);
			alert(
				'无法加载模型。请先在 Train Model 页面训练并保存模型。\n\n' +
					'如果已经训练过模型，可能是因为：\n' +
					'1. 浏览器不支持 IndexedDB\n' +
					'2. 浏览器数据被清除\n' +
					'3. 使用了不同的浏览器\n' +
					'4. trained_model 文件夹中没有预训练模型\n\n' +
					'请重新训练模型或使用相同的浏览器。'
			);
		}
	}

	addDownloadButton() {
		const container = document.querySelector('.container');
		const existingButton = document.getElementById('downloadModelBtn');

		if (!existingButton) {
			const downloadBtn = document.createElement('button');
			downloadBtn.id = 'downloadModelBtn';
			downloadBtn.className = 'download-btn';
			downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载模型';
			downloadBtn.onclick = () => this.saveModel();
			container.insertBefore(downloadBtn, container.firstChild.nextSibling);
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

		// 预处理图片
		const tensor = tf.tidy(() => {
			return tf.browser
				.fromPixels(img)
				.resizeNearestNeighbor([this.IMAGE_SIZE, this.IMAGE_SIZE])
				.toFloat()
				.div(255.0)
				.expandDims();
		});

		// 进行预测
		const predictions = await this.model.predict(tensor).data();
		const categoryIndex = predictions.indexOf(Math.max(...predictions));
		const category = this.categories[categoryIndex];
		const confidence = predictions[categoryIndex];

		// 显示结果
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

document.addEventListener('DOMContentLoaded', () => {
	new TFWasteClassifier();
});
