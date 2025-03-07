# Sammanfattning av lösningen

Den här AI-baserade webbapplikationen är utvecklad för smart återvinning. Den använder ett AI-API, en bildklassificeringsmodell och ett dataset med olika typer av avfall.

Applikationen består av flera webbsidor där användare kan ladda upp en bild på sitt avfall. Med hjälp av AI-teknik klassificeras avfallet i rätt kategori, vilket hjälper människor att hantera det på ett korrekt och hållbart sätt.

# Start

## Hosting

Projektet är hostat online och kan nås via: https://agenda2030-ai-engineering.vercel.app/index.html

## VS Code Live Server

Starta applikationen genom att använda "Go Live" på t.ex. index.html.

# Webbsidor och funktioner

1. index.html – Meny: "Smart Waste Classifier"
   Anropar Gemini 2.0 Flash Experimental via Google AI Studio (app.js).
   
2. trainml5.html – Meny: "Smart Waste Classifier ML5"
   Använder ML5.js för att träna en förtränad bildklassificeringsmodell, MobileNet (ml5.js).
   
3. visualize.html – Meny: "Visualize"
   Visualiserar datasetet TrashNet (visualize.js).
   
4. train.html – Meny: "Train Model TensorFlow"
   Använder TensorFlow.js för att träna datasetet TrashNet (train.js).
   OBS! Datasetet är inte uppladdat till GitHub på grund av dess stora storlek.
   Det kan laddas ner här: TrashNet på Kaggle(https://www.kaggle.com/datasets/feyzazkefe/trashnet).
   
5. wasteClassifier.html – Meny: "Smart Waste Classifier TensorFlow"
   Använder den tränade modellen från train.html för att klassificera avfall (wasteClassifierTf.js).

# Notering

Projektet behöver vidareutvecklas och optimeras på grund av tidsbegränsningar.
Speciellt train.js fungerar för närvarande inte optimalt och kräver ytterligare utveckling och justeringar för att kunna träna datasetet korrekt.
