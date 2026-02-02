const API_BASE_URL = window.location.protocol === 'file:'
    ? 'http://localhost:8080'
    : '';

// DOM Elements
const inputText = document.getElementById('inputText');
const clearBtn = document.getElementById('clearBtn');
const checkBtn = document.getElementById('checkBtn');
const resultsContainer = document.getElementById('resultsContainer');
const connectionStatus = document.getElementById('connectionStatus');
const statusDot = connectionStatus.querySelector('.status-dot');
const statusText = connectionStatus.querySelector('.status-text');
const wordCount = document.getElementById('wordCount');
const errorCount = document.getElementById('errorCount');
const dictionarySize = document.getElementById('dictionarySize');
const cacheHits = document.getElementById('cacheHits');
const accuracy = document.getElementById('accuracy');

// State
let debounceTimer = null;
let isConnected = false;
let totalWordsChecked = 0;
let totalErrorsFound = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
    loadStats();

    // Event listeners
    inputText.addEventListener('input', handleInput);
    clearBtn.addEventListener('click', handleClear);
    checkBtn.addEventListener('click', handleCheck);
});

// Check API connection
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            setConnectionStatus(true, 'Connected');
            const data = await response.json();
            if (dictionarySize) dictionarySize.textContent = data.dictionary_size.toLocaleString();
        } else {
            setConnectionStatus(false, 'Server Error');
        }
    } catch (error) {
        setConnectionStatus(false, 'Disconnected');
    }
}

// Set connection status
function setConnectionStatus(connected, text) {
    isConnected = connected;
    if (statusText) statusText.textContent = text;
    if (connected) {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            const data = await response.json();
            if (dictionarySize) dictionarySize.textContent = data.dictionary_size.toLocaleString();
            if (cacheHits) cacheHits.textContent = data.cache_info.hits.toLocaleString();

            // Calculate accuracy
            const total = totalWordsChecked || 1;
            const correct = Math.max(0, total - totalErrorsFound);
            const accuracyPercent = ((correct / total) * 100).toFixed(1);
            if (accuracy) accuracy.textContent = `${accuracyPercent}%`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Handle input with debouncing
function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const text = inputText.value.trim();
        if (text) {
            checkText(text);
        } else {
            showEmptyState();
        }
    }, 500); // Wait 500ms after user stops typing
}

// Handle clear button
function handleClear() {
    inputText.value = '';
    showEmptyState();
    if (wordCount) wordCount.textContent = '0';
    if (errorCount) errorCount.textContent = '0';
}

// Handle check button
function handleCheck() {
    const text = inputText.value.trim();
    if (text) {
        checkText(text);
    }
}

// Check text for spelling errors
async function checkText(text) {
    if (!isConnected) {
        showError('Not connected to server. Please check if the backend is running.');
        return;
    }

    try {
        // Show loading state
        checkBtn.classList.add('loading');
        checkBtn.disabled = true;

        // Use a 30s timeout for complex text checks
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}/check-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, include_all: true }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server returned ${response.status}`);
        }

        const data = await response.json();

        // Update statistics
        const tokens = text.split(/[\s\u1361-\u1368]+/).filter(w => w.trim().length > 0);
        totalWordsChecked += tokens.length;
        totalErrorsFound += data.total_errors;

        if (wordCount) wordCount.textContent = tokens.length;
        if (errorCount) errorCount.textContent = data.total_errors;

        // Display results
        displayProcessedResults(text, data.words);

        // Reload stats to update cache info
        loadStats();

    } catch (error) {
        console.error('Error checking text:', error);
        let msg = 'Failed to check text. ';
        if (error.name === 'AbortError') {
            msg += 'Request timed out. The text might be too complex or long.';
        } else {
            msg += error.message || 'Please try again.';
        }
        showError(msg);
    } finally {
        checkBtn.classList.remove('loading');
        checkBtn.disabled = false;
    }
}

// Display processed results inline
function displayProcessedResults(text, wordInfos) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    // Create instruction text
    const instruction = document.createElement('div');
    instruction.className = 'results-instruction';
    instruction.innerHTML = 'Below is your processed text. Hover over <strong>any word</strong> to see alternative suggestions and variations. Words in <strong>Red/Wavy</strong> have errors, while others have alternative options.';
    resultsContainer.appendChild(instruction);

    // Create text container
    const processedDiv = document.createElement('div');
    processedDiv.className = 'processed-text';

    // Map words for quick lookup
    const wordMap = new Map();
    wordInfos.forEach(item => {
        wordMap.set(item.word, {
            correct: item.correct,
            suggestions: item.suggestions
        });
    });

    // Split text by words and separators while preserving them
    const tokens = text.split(/([\s\u1361-\u1368]+)/);

    tokens.forEach(token => {
        if (!token) return;

        // If token is white space or punctuation, just append as text
        if (/^[\s\u1361-\u1368]+$/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.style.whiteSpace = 'pre-wrap';
            processedDiv.appendChild(span);
            return;
        }

        // It's a word
        const wordWrapper = document.createElement('span');
        wordWrapper.className = 'word-wrapper';

        const info = wordMap.get(token);
        const wordSpan = document.createElement('span');
        wordSpan.textContent = token;

        if (info) {
            if (!info.correct) {
                wordSpan.className = 'word-error';
            } else {
                wordSpan.className = 'word-correct';
                wordSpan.style.cursor = 'help';
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'suggestion-tooltip';

            const title = document.createElement('div');
            title.className = 'tooltip-title';
            title.textContent = info.correct ? 'Suggestions / Alternatives:' : 'Suggestions:';
            tooltip.appendChild(title);

            const suggestionsList = document.createElement('div');
            suggestionsList.className = 'tooltip-suggestions';

            const suggestions = info.suggestions;
            if (suggestions && suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const suggBtn = document.createElement('div');
                    suggBtn.className = 'tooltip-suggestion';
                    suggBtn.textContent = suggestion;
                    suggBtn.onclick = (e) => {
                        e.stopPropagation();
                        replaceWord(token, suggestion);
                    };
                    suggestionsList.appendChild(suggBtn);
                });
            } else {
                const noSugg = document.createElement('div');
                noSugg.style.fontSize = '0.8rem';
                noSugg.style.color = 'var(--text-muted)';
                noSugg.textContent = info.correct ? 'No alternatives found' : 'No suggestions found';
                suggestionsList.appendChild(noSugg);
            }

            tooltip.appendChild(suggestionsList);

            const arrow = document.createElement('div');
            arrow.className = 'tooltip-arrow';
            tooltip.appendChild(arrow);

            wordSpan.appendChild(tooltip);
        } else {
            wordSpan.className = 'word-correct';
        }

        wordWrapper.appendChild(wordSpan);
        processedDiv.appendChild(wordWrapper);
    });

    resultsContainer.appendChild(processedDiv);
}

// Replace word in textarea
function replaceWord(oldWord, newWord) {
    const text = inputText.value;

    const escapedWord = escapeRegex(oldWord);
    const wordPattern = `(^|[\\s\\u1361-\\u1368])${escapedWord}($|[\\s\\u1361-\\u1368])`;
    const regex = new RegExp(wordPattern);

    const newText = text.replace(regex, (match, p1, p2) => `${p1}${newWord}${p2}`);

    inputText.value = newText;
    checkText(newText);
    showNotification(`Replaced "${oldWord}" with "${newWord}"`);
}

// Escape special regex characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Show empty state
function showEmptyState() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📖</div>
            <p class="empty-text">Type some Tigrinya text to get started</p>
            <p class="empty-subtext">Hover over any word for suggestions. Errors are highlighted in Red/Wavy.</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <p class="empty-text">Error</p>
            <p class="empty-subtext">${message}</p>
        </div>
    `;
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary-gradient);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Periodically check connection
setInterval(() => {
    checkConnection();
    if (isConnected) {
        loadStats();
    }
}, 30000); // Every 30 seconds
