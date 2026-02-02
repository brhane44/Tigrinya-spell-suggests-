from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from fastapi.staticfiles import StaticFiles
from backend.spellchecker import TigrinyaSpellChecker

# Initialize FastAPI app
app = FastAPI(
    title="Tigrinya Spelling Suggester API",
    description="API for Tigrinya spell checking and suggestions",
    version="1.0.0"
)

# Configure CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize spell checker
spell_checker = TigrinyaSpellChecker()


# Request/Response models
class WordCheckRequest(BaseModel):
    word: str = Field(..., description="Word to check", min_length=1)


class WordCheckResponse(BaseModel):
    word: str
    correct: bool


class SuggestionRequest(BaseModel):
    word: str = Field(..., description="Word to get suggestions for", min_length=1)
    max_suggestions: int = Field(5, description="Maximum number of suggestions", ge=1, le=10)


class SuggestionResponse(BaseModel):
    word: str
    suggestions: List[str]


class TextCheckRequest(BaseModel):
    text: str = Field(..., description="Text to check", min_length=1)
    include_all: bool = Field(True, description="Whether to include suggestions for all words")


class WordInfo(BaseModel):
    word: str
    correct: bool
    suggestions: List[str]


class TextCheckResponse(BaseModel):
    words: List[WordInfo]
    total_errors: int


class AddWordRequest(BaseModel):
    word: str = Field(..., description="Word to add to dictionary", min_length=1)


class AddWordResponse(BaseModel):
    success: bool
    message: str


# API Endpoints
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Tigrinya Spelling Suggester",
        "dictionary_size": len(spell_checker.dictionary)
    }


@app.post("/check", response_model=WordCheckResponse, tags=["Spell Check"])
async def check_word(request: WordCheckRequest):
    """
    Check if a single word is spelled correctly.
    
    Args:
        request: WordCheckRequest with word to check
        
    Returns:
        WordCheckResponse indicating if word is correct
    """
    try:
        is_correct = spell_checker.is_correct(request.word)
        return WordCheckResponse(word=request.word, correct=is_correct)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking word: {str(e)}")


@app.post("/suggest", response_model=SuggestionResponse, tags=["Spell Check"])
async def get_suggestions(request: SuggestionRequest):
    """
    Get spelling suggestions for a word.
    
    Args:
        request: SuggestionRequest with word and max suggestions
        
    Returns:
        SuggestionResponse with list of suggestions
    """
    try:
        suggestions = spell_checker.get_suggestions(
            request.word, 
            max_suggestions=request.max_suggestions
        )
        return SuggestionResponse(word=request.word, suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting suggestions: {str(e)}")


@app.post("/check-text", response_model=TextCheckResponse, tags=["Spell Check"])
async def check_text(request: TextCheckRequest):
    """
    Check an entire text for spelling errors and get suggestions.
    
    Args:
        request: TextCheckRequest with text to check
        
    Returns:
        TextCheckResponse with info for all words and suggestions
    """
    try:
        results = spell_checker.check_text(request.text, include_all=request.include_all)
        total_errors = sum(1 for r in results if not r['correct'])
        return TextCheckResponse(
            words=results,
            total_errors=total_errors
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking text: {str(e)}")


@app.post("/add-word", response_model=AddWordResponse, tags=["Dictionary"])
async def add_word(request: AddWordRequest):
    """
    Add a word to the dictionary (runtime only).
    
    Args:
        request: AddWordRequest with word to add
        
    Returns:
        AddWordResponse indicating success
    """
    try:
        added = spell_checker.add_word(request.word)
        if added:
            return AddWordResponse(
                success=True,
                message=f"Word '{request.word}' added to dictionary"
            )
        else:
            return AddWordResponse(
                success=False,
                message=f"Word '{request.word}' already exists in dictionary"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding word: {str(e)}")


@app.get("/stats", tags=["Dictionary"])
async def get_stats():
    """Get statistics about the dictionary and spell checker"""
    return {
        "dictionary_size": len(spell_checker.dictionary),
        "cache_info": {
            "hits": spell_checker.get_suggestions.cache_info().hits,
            "misses": spell_checker.get_suggestions.cache_info().misses,
            "size": spell_checker.get_suggestions.cache_info().currsize,
            "max_size": spell_checker.get_suggestions.cache_info().maxsize
        }
    }


# Serve static files from the frontend directory
# This must be after the API routes
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
frontend_dir = os.path.join(parent_dir, "frontend")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
