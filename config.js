const config = {
	// Gemini API configuration
	GEMINI_API: {
		key: 'AIzaSyCDuvNGzRoX-tUSR-XjlKS1MfXEwhBYaJY', // Replace with your API Key
	},
	// Background image configuration
	backgroundImage: './src/background_image.jpg',
	// Waste bin image configuration
	binImages: {
		recyclable: './src/recyclable.jpg',
		hazardous: './src/hazardous.jpg',
		food: './src/food.jpg',
		other: './src/other.jpg',
	},
	// Waste classification rules
	wasteCategories: {
		recyclable: [
			'bottle',
			'container',
			'paper',
			'cardboard',
			'can',
			'plastic',
			'glass',
			'newspaper',
			'magazine',
			'metal',
			'box',
		],
		hazardous: [
			'battery',
			'electronic',
			'computer',
			'phone',
			'chemical',
			'medicine',
			'bulb',
		],
		food: ['food', 'fruit', 'vegetable', 'meat', 'fish', 'bread', 'leftover'],
		other: ['textile', 'ceramic', 'rubber', 'toy', 'wood', 'dust', 'dirt'],
	},
};
