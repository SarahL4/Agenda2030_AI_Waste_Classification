class DatasetVisualizer {
	constructor() {
		this.dataPath = './data/Garbage classification';
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
			this.createDistributionChart(distribution);
			await this.displaySampleImages();
		} catch (error) {
			console.error('Error initializing visualization:', error);
		}
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

	createDistributionChart(distribution) {
		const ctx = document.getElementById('distributionChart').getContext('2d');

		// Destroy existing chart if it exists
		if (window.distributionChart instanceof Chart) {
			window.distributionChart.destroy();
		}

		window.distributionChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: Object.keys(distribution),
				datasets: [
					{
						label: 'Number of Images',
						data: Object.values(distribution),
						backgroundColor: Object.keys(distribution).map(
							(cat) => this.categoryColors[cat]
						),
						borderWidth: 1,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Number of Images',
						},
					},
					x: {
						title: {
							display: true,
							text: 'Waste Categories',
						},
					},
				},
				plugins: {
					title: {
						display: true,
						text: 'Distribution of Images Across Categories',
						padding: 20,
					},
					legend: {
						display: false,
					},
				},
			},
		});
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
			fetch(`./data/Garbage classification/${category}/${category}1.jpg`)
				.then((response) => {
					if (response.ok) {
						img.src = `./data/Garbage classification/${category}/${category}1.jpg`;
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
	new DatasetVisualizer();
});
