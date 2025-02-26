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
		reuse: './src/reuse.jpg',
		deposit: './src/deposit.jpg',
	},
	// Waste classification rules
	wasteCategories: {
		deposit: [
			'deposit',
			'metal',
			'pant',
			'can',
			'plastic',
			'bottle',
			'pet bottle',
		],
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
			'soft plastic',
			'hard plastic',
			'corrugated cardboard',
			'colored glass',
			'clear glass',
			'flat glass',
			'window',
			'metal container',
			'paper packaging',
			'plastic packaging',
			'metal packaging',
			'glass packaging',
		],
		hazardous: [
			'battery',
			'electronic',
			'computer',
			'phone',
			'chemical',
			'medicine',
			'bulb',
			'hazardous waste',
			'impregnated wood',
			'refrigerator',
			'freezer',
			'white goods',
			'electrical waste',
			'tire',
			'wheel',
			'dangerous',
			'toxic',
			'poison',
			'acid',
			'solvent',
			'paint',
			'oil',
			'gasoline',
			'pesticide',
			'herbicide',
			'insecticide',
			'medication',
			'pill',
			'drug',
			'syringe',
			'needle',
			'thermometer',
			'fluorescent',
			'led',
			'battery pack',
			'power bank',
			'charger',
			'adapter',
			'cable',
			'wire',
			'circuit',
			'motherboard',
			'chip',
			'cartridge',
			'toner',
		],
		food: [
			'food',
			'fruit',
			'vegetable',
			'meat',
			'fish',
			'bread',
			'leftover',
			'compostable',
			'garden waste',
			'branches',
			'twigs',
			'leaves',
			'organic',
			'kitchen waste',
			'food waste',
			'apple',
			'banana',
			'orange',
			'vegetable',
			'meat',
			'rice',
			'noodle',
			'pasta',
			'coffee',
			'tea',
			'egg',
			'shell',
			'bone',
			'peel',
			'seed',
			'plant',
			'grass',
			'flower',
		],
		other: [
			'ceramic',
			'rubber',
			'toy',
			'wood',
			'dust',
			'dirt',
			'concrete',
			'porcelain',
			'tiles',
			'sanitary ware',
			'upholstered furniture',
			'insulation',
			'plaster',
			'gypsum',
			'energy recovery',
			'construction waste',
		],
		reuse: [
			'reusable',
			'books',
			'electronics',
			'bicycle',
			'glassware',
			'porcelain',
			'clothes',
			'shoes',
			'textile',
			'toys',
			'furniture',
			'paintings',
			'mirrors',
		],
	},
};
