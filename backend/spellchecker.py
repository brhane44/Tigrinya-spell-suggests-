from functools import lru_cache
from typing import List, Set
import Levenshtein
import os


class TigrinyaSpellChecker:
    """
    Tigrinya spell checker with intelligent suggestion generation.
    Uses Levenshtein distance for finding similar words.
    """
    
    def __init__(self, dictionary_path: str = None):
        """
        Initialize the spell checker with a dictionary.
        
        Args:
            dictionary_path: Path to the dictionary file. If None, uses default location.
        """
        if dictionary_path is None:
            # Default to dictionary.txt in the same directory as this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            dictionary_path = os.path.join(current_dir, "dictionary.txt")
        
        self.dictionary: Set[str] = self._load_dictionary(dictionary_path)
        self.dictionary_path = dictionary_path
    
    def _load_dictionary(self, path: str) -> Set[str]:
        """
        Load dictionary from file.
        
        Args:
            path: Path to dictionary file (one word per line)
            
        Returns:
            Set of words in the dictionary
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                # Strip whitespace and filter empty lines
                words = {line.strip() for line in f if line.strip()}
            print(f"Loaded {len(words)} words from dictionary")
            return words
        except FileNotFoundError:
            print(f"Warning: Dictionary file not found at {path}")
            return set()
        except Exception as e:
            print(f"Error loading dictionary: {e}")
            return set()
    
    def is_correct(self, word: str) -> bool:
        """
        Check if a word is spelled correctly.
        
        Args:
            word: Word to check
            
        Returns:
            True if word is in dictionary, False otherwise
        """
        if not word:
            return False
        
        # Normalize the word (strip whitespace)
        normalized_word = word.strip()
        
        return normalized_word in self.dictionary
    
    @lru_cache(maxsize=1000)
    def get_suggestions(self, word: str, max_suggestions: int = 5) -> List[str]:
        """
        Get spelling suggestions for a word using edit distance.
        Results are cached for performance.
        """
        if not word or not self.dictionary:
            return []
        
        # Normalize the word
        normalized_word = word.strip()
        
        # Optimization: Only suggest for words containing Tigrinya characters
        # This avoids expensive checks for English words, numbers, or pure symbols
        if not any('\u1200' <= c <= '\u137F' or '\u1380' <= c <= '\u139F' or '\u2D80' <= c <= '\u2DDF' for c in normalized_word):
            return []
            
        suggestions = []
        # If the word is correct, add it as the first suggestion
        is_correct = normalized_word in self.dictionary
        if is_correct:
            suggestions.append((normalized_word, 0))

        # Calculate edit distance for all dictionary words to find alternatives
        for dict_word in self.dictionary:
            if dict_word == normalized_word:
                continue
                
            # Quick check: length difference should be small
            if abs(len(dict_word) - len(normalized_word)) > 3:
                continue
                
            distance = Levenshtein.distance(normalized_word, dict_word)
            # Only consider words with reasonable edit distance
            # (up to 3 edits or 30% of word length, whichever is larger)
            max_distance = max(3, len(normalized_word) // 3)
            if distance <= max_distance:
                suggestions.append((dict_word, distance))
        
        # Sort by distance (closest first) and return top suggestions
        suggestions.sort(key=lambda x: x[1])
        return [word for word, _ in suggestions[:max_suggestions]]
    
    def check_text(self, text: str, include_all: bool = False) -> List[dict]:
        """
        Check an entire text and return information about words.
        
        Args:
            text: Text to check
            include_all: If True, returns info for all words. If False, only misspelled words.
            
        Returns:
            List of dictionaries with word, correct status, and suggestions
        """
        if not text:
            return []
        
        # Simple word tokenization (split by whitespace and common punctuation)
        import re
        words = re.findall(r'[\w\u1200-\u137F]+', text)
        
        results = []
        for word in words:
            correct = self.is_correct(word)
            if include_all or not correct:
                results.append({
                    'word': word,
                    'correct': correct,
                    'suggestions': self.get_suggestions(word)
                })
        
        return results
    
    def add_word(self, word: str) -> bool:
        """
        Add a word to the dictionary (runtime only, not persisted).
        
        Args:
            word: Word to add
            
        Returns:
            True if word was added, False if already exists
        """
        normalized_word = word.strip()
        if normalized_word in self.dictionary:
            return False
        
        self.dictionary.add(normalized_word)
        # Clear cache since dictionary changed
        self.get_suggestions.cache_clear()
        return True
    
    def save_dictionary(self) -> bool:
        """
        Save the current dictionary to file.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(self.dictionary_path, 'w', encoding='utf-8') as f:
                for word in sorted(self.dictionary):
                    f.write(f"{word}\n")
            return True
        except Exception as e:
            print(f"Error saving dictionary: {e}")
            return False
