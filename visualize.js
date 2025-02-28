class DatasetVisualizer {
	constructor() {
		this.dataPath = './data';
		this.categories = [
			'glass',
			'paper',
			'cardboard',
			'plastic',
			'metal',
			'trash',
		];
		this.categoryColors = {
			glass: '#3498db',
			paper: '#e74c3c',
			cardboard: '#f39c12',
			plastic: '#2ecc71',
			metal: '#9b59b6',
			trash: '#95a5a6',
		};
		this.init();
	}

	async init() {
		try {
			const distribution = await this.getDistribution();
			await this.visualizeDistribution(distribution);
			await this.displaySampleImages();
		} catch (error) {
			console.error('Error initializing visualization:', error);
		}
	}

	async visualizeDistribution(distribution) {
		// 准备数据
		const data = Object.entries(distribution).map(([category, count]) => ({
			index: category,
			value: count,
		}));

		// 使用 tfvis 创建柱状图
		const surface = { name: 'Dataset Distribution', tab: 'Charts' };

		await tfvis.render.barchart(surface, data, {
			xLabel: 'Category',
			yLabel: 'Number of Images',
			height: 300,
			fontSize: 16,
			color: Object.entries(distribution).map(
				([category]) => this.categoryColors[category]
			),
		});

		// 显示统计信息
		const totalImages = Object.values(distribution).reduce((a, b) => a + b, 0);
		const stats = {
			'Total Images': totalImages,
			Categories: Object.keys(distribution).length,
			'Average per Category': Math.round(
				totalImages / Object.keys(distribution).length
			),
			'Max Count': Math.max(...Object.values(distribution)),
			'Min Count': Math.min(...Object.values(distribution)),
		};

		await tfvis.render.table(
			{ name: 'Dataset Statistics', tab: 'Statistics' },
			{
				headers: ['Metric', 'Value'],
				values: Object.entries(stats).map(([k, v]) => [k, v]),
			}
		);
	}

	async getDistribution() {
		return {
			glass: 501,
			paper: 594,
			cardboard: 403,
			plastic: 482,
			metal: 410,
			trash: 137,
		};
	}

	async displaySampleImages() {
		const grid = document.getElementById('categoryGrid');
		grid.innerHTML = ''; // Clear existing content

		const defaultImage = 'https://via.placeholder.com/200x200?text=No+Image';

		for (const category of this.categories) {
			const categorySection = document.createElement('div');
			categorySection.className = 'category-section';

			const categoryTitle = document.createElement('h3');
			categoryTitle.textContent =
				category.charAt(0).toUpperCase() + category.slice(1);
			categorySection.appendChild(categoryTitle);

			const imageContainer = document.createElement('div');
			imageContainer.className = 'category-images';

			const img = document.createElement('img');
			// Set default image first
			img.src = defaultImage;
			img.alt = `${category} sample`;

			// Try to load the actual image
			fetch(`./data/${category}/${category}1.jpg`)
				.then((response) => {
					if (response.ok) {
						img.src = `./data/${category}/${category}1.jpg`;
					}
				})
				.catch(() => {
					console.log(`Using default image for ${category}`);
				});

			const label = document.createElement('div');
			label.className = 'image-label';
			label.textContent = `${category} (Sample)`;

			imageContainer.appendChild(img);
			imageContainer.appendChild(label);
			categorySection.appendChild(imageContainer);

			grid.appendChild(categorySection);
		}
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
	new DatasetVisualizer();
});
