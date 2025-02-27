// 引入 ml5.js

// 页面加载完成后初始化分类器
document.addEventListener('DOMContentLoaded', () => {
	// 初始化 MobileNet 图像分类器
	const classifier = ml5.imageClassifier('MobileNet', modelLoaded);

	// 模型加载完成后的回调函数
	function modelLoaded() {
		console.log('模型加载完成！');
		// 绑定分类按钮的点击事件
		const classifyButton = document.getElementById('classifyButton');
		if (classifyButton) {
			classifyButton.addEventListener('click', classifyImage);
		} else {
			console.warn('未找到分类按钮');
		}
	}

	// 分类图像的函数
	function classifyImage() {
		const imageElement = document.getElementById('my-image');
		if (!imageElement) {
			console.error('未找到图像元素');
			return;
		}

		// 使用分类器对图像进行分类
		classifier.classify(imageElement, (results, err) => {
			if (err) {
				console.error('分类出错:', err);
				return;
			}
			console.log('分类结果:', results);

			// 在页面上显示分类结果
			const resultElement = document.getElementById('result');
			if (resultElement) {
				resultElement.innerHTML = results
					.map(
						(result) =>
							`<p>${result.label} (置信度: ${result.confidence.toFixed(4)})</p>`
					)
					.join('');
			}
		});
	}
});
