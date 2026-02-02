# Tigrinya Spelling Suggester

A modern web application for Tigrinya spell checking with intelligent suggestions. Features a FastAPI backend with efficient spell-checking algorithms and a beautiful, responsive frontend interface.

## Features

- ✨ Real-time spell checking for Tigrinya text
- 🎯 Intelligent spelling suggestions using edit distance algorithms
- 📚 **Comprehensive dictionary with 22,766 Tigrinya words** (from HuggingFace)
- 🚀 Performance-optimized with caching
- 🎨 Modern, beautiful UI with dark mode
- 📱 Responsive design for all devices
- 🔤 Full support for Ge'ez/Ethiopic script

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. Clone or navigate to the project directory:
```bash
cd eternal-trifid
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Starting the Backend Server

Run the FastAPI backend server:
```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`

### Using the Frontend

1. Open `frontend/index.html` in your web browser
2. Type or paste Tigrinya text in the textarea
3. Misspelled words will be highlighted automatically
4. Click on suggestions to replace misspelled words

## API Documentation

### Endpoints

#### Health Check
```
GET /
```
Returns server status.

#### Check Word
```
POST /check
Content-Type: application/json

{
  "word": "ሰላም"
}
```
Returns whether the word is spelled correctly.

#### Get Suggestions
```
POST /suggest
Content-Type: application/json

{
  "word": "ሰላም",
  "max_suggestions": 5
}
```
Returns spelling suggestions for the word.

### Interactive API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
eternal-trifid/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── spellchecker.py   # Spell-checking logic
│   └── dictionary.txt    # Tigrinya word list
├── frontend/
│   ├── index.html        # Main HTML page
│   ├── style.css         # Styling
│   └── script.js         # JavaScript logic
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Development

### Adding Words to Dictionary

Edit `backend/dictionary.txt` and add one word per line in Tigrinya (Ge'ez script).

### Customizing Suggestions

Modify the `max_suggestions` parameter in API calls or adjust the edit distance threshold in `backend/spellchecker.py`.

## Technologies Used

- **Backend**: FastAPI, Python-Levenshtein
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Fonts**: Noto Sans Ethiopic (Google Fonts)

## ☁️ Cloud Deployment

The project is pre-configured for one-click deployment to platforms like **Render** or **Railway**.

### Deployment Steps (Render.com)
1. **Push to GitHub**: Create a repository and push your code.
2. **Create Web Service**: In Render, click **New** -> **Web Service**.
3. **Connect Repo**: Link your GitHub repository.
4. **Configuration Settings**:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. **Done!**: Render will provide a public URL (e.g., `https://tigrinya-spell-checker.onrender.com`).

### Configuration Notes
- The backend is configured to automatically serve the frontend from the same server.
- The `Procfile` is included for compatibility with most cloud providers.
- Environment-aware routing in `script.js` ensures it works locally and in the cloud without changes.

## License

MIT License - feel free to use and modify as needed.
