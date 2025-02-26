const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Enable CORS
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

// Serve static files from the data directory
app.use('/data', express.static('data'));

// Endpoint to get dataset distribution
app.get('/api/distribution', (req, res) => {
	const dataPath = path.join(__dirname, 'data', 'Garbage classification');
	try {
		const distribution = {};
		const categories = [
			'glass',
			'paper',
			'cardboard',
			'plastic',
			'metal',
			'trash',
		];

		categories.forEach((category) => {
			const categoryPath = path.join(dataPath, category);
			if (fs.existsSync(categoryPath)) {
				const files = fs
					.readdirSync(categoryPath)
					.filter((file) => file.match(/\.(jpg|jpeg|png)$/i));
				distribution[category] = files.length;
			} else {
				distribution[category] = 0;
			}
		});

		res.json(distribution);
	} catch (error) {
		console.error('Error getting distribution:', error);
		res.status(500).json({ error: 'Failed to get distribution' });
	}
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
