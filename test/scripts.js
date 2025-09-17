const API_KEY = '4f5f43495afcc67e9553f6c684a82f84';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let isLoading = false;
let allMovies = [];
let currentNavPage = 'home';

// Navigation functionality
function switchNavPage(page) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    currentNavPage = page;

    // Handle page content switching
    const mainContent = document.getElementById('mainContent');

    switch (page) {
        case 'home':
            // Show home content (already loaded)
            break;
        case 'search':
            // You can implement search functionality here
            console.log('Search page selected');
            break;
        case 'favorites':
            // You can implement favorites functionality here
            console.log('Favorites page selected');
            break;
    }
}

// Add navigation event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchNavPage(page);
        });
    });
});

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const detailThemeToggle = document.getElementById('detailThemeToggle');
const body = document.body;

function toggleTheme() {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.classList.toggle('active', isDark);
    detailThemeToggle.classList.toggle('active', isDark);
    localStorage.setItem('darkMode', isDark);
}

// Load saved theme
const savedTheme = localStorage.getItem('darkMode');
if (savedTheme === 'true') {
    body.classList.add('dark-mode');
    themeToggle.classList.add('active');
    detailThemeToggle.classList.add('active');
}

themeToggle.addEventListener('click', toggleTheme);
detailThemeToggle.addEventListener('click', toggleTheme);

// API Functions
async function fetchMovies(endpoint, page = 1) {
    const response = await fetch(`${BASE_URL}/${endpoint}?api_key=${API_KEY}&page=${page}`);
    const data = await response.json();
    return data;
}

async function fetchMovieDetails(movieId) {
    const [movieResponse, creditsResponse] = await Promise.all([
        fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`),
        fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`)
    ]);

    const movie = await movieResponse.json();
    const credits = await creditsResponse.json();

    return { ...movie, credits };
}

// Render Functions
function renderMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => showMovieDetail(movie.id);

    card.innerHTML = `
        <div class="movie-poster" style="background-image: url('${IMAGE_BASE_URL}${movie.poster_path}')"></div>
        <div class="movie-title">${movie.title}</div>
        <div class="movie-rating">
            <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${movie.vote_average.toFixed(1)}/10 IMDb
        </div>
    `;

    return card;
}

function renderPopularItem(movie) {
    const item = document.createElement('div');
    item.className = 'popular-item';
    item.onclick = () => showMovieDetail(movie.id);

    const releaseYear = new Date(movie.release_date).getFullYear();
    const genres = movie.genre_ids ? movie.genre_ids.slice(0, 3).map(id => getGenreName(id)) : [];

    item.innerHTML = `
        <div class="popular-poster" style="background-image: url('${IMAGE_BASE_URL}${movie.poster_path}')"></div>
        <div class="popular-info">
            <div class="popular-title">${movie.title}</div>
            <div class="popular-rating">
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                ${movie.vote_average.toFixed(1)}/10 IMDb
            </div>
            <div class="genres">
                ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
            <div class="movie-duration">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13H11v6l5.25 3.15.75-1.23L13 12.25V7z"/>
                </svg>
                ${releaseYear}
            </div>
        </div>
    `;

    return item;
}

function getGenreName(genreId) {
    const genres = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
        99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
        27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
        10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    return genres[genreId] || 'Unknown';
}

function formatRuntime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
}

function showMovieDetail(movieId) {
    const detailView = document.getElementById('detailView');
    const detailContent = document.getElementById('detailContent');

    detailView.classList.add('active');
    detailContent.innerHTML = `
        <div class="loading" style="padding: 100px 20px;">
            <div class="loading-spinner"></div>
        </div>
    `;

    fetchMovieDetails(movieId).then(movie => {
        const cast = movie.credits.cast.slice(0, 6);
        const genres = movie.genres.slice(0, 3);

        detailContent.innerHTML = `
            <div class="movie-backdrop" style="background-image: url('${IMAGE_BASE_URL}${movie.backdrop_path}')">
                <button class="play-button">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <div class="play-text">Play Trailer</div>
                <button class="bookmark-btn">
                    <svg class="bookmark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    </svg>
                </button>
            </div>
            
            <div class="detail-content">
                <h1 class="detail-title">${movie.title}</h1>
                
                <div class="detail-rating">
                    <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    ${movie.vote_average.toFixed(1)}/10 IMDb
                </div>
                
                <div class="detail-genres">
                    ${genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
                </div>
                
                <div class="detail-info-grid">
                    <div class="info-item">
                        <div class="info-label">Length</div>
                        <div class="info-value">${formatRuntime(movie.runtime)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Language</div>
                        <div class="info-value">${movie.original_language.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Rating</div>
                        <div class="info-value">PG-13</div>
                    </div>
                </div>
                
                <div class="description">
                    <h3>Description</h3>
                    <p>${movie.overview}</p>
                </div>
                
                <div class="cast-section">
                    <h3>Cast <span class="see-more" style="font-size: 12px; font-weight: normal;">See more</span></h3>
                    <div class="cast-grid">
                        ${cast.map(actor => `
                            <div class="cast-item">
                                <div class="cast-photo" style="background-image: url('${IMAGE_BASE_URL}${actor.profile_path}')"></div>
                                <div class="cast-name">${actor.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
}

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('detailView').classList.remove('active');
});

// Load movies
async function loadNowShowing() {
    const data = await fetchMovies('movie/now_playing');
    const grid = document.getElementById('nowShowingGrid');
    grid.innerHTML = '';

    data.results.slice(0, 10).forEach(movie => {
        grid.appendChild(renderMovieCard(movie));
    });
}

async function loadPopularMovies(page = 1) {
    if (isLoading) return;
    isLoading = true;

    const data = await fetchMovies('movie/popular', page);
    const list = document.getElementById('popularList');

    if (page === 1) {
        list.innerHTML = '';
        allMovies = [];
    }

    data.results.forEach(movie => {
        allMovies.push(movie);
        list.appendChild(renderPopularItem(movie));
    });

    currentPage = page;
    isLoading = false;
}

// Infinite scroll
function handleScroll() {
    const mainContent = document.getElementById('mainContent');
    const scrollTop = mainContent.scrollTop;
    const scrollHeight = mainContent.scrollHeight;
    const clientHeight = mainContent.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoading) {
        loadPopularMovies(currentPage + 1);
    }
}

document.getElementById('mainContent').addEventListener('scroll', handleScroll);

// Initialize app
async function init() {
    // Note: You need to replace 'YOUR_TMDB_API_KEY' with your actual TMDB API key
    if (API_KEY === 'YOUR_TMDB_API_KEY') {
        const nowShowingGrid = document.getElementById('nowShowingGrid');
        const popularList = document.getElementById('popularList');

        nowShowingGrid.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Please add your TMDB API key to use this app</div>';
        popularList.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color: #007AFF;">TMDB</a></div>';
        return;
    }

    try {
        await loadNowShowing();
        await loadPopularMovies(1);
    } catch (error) {
        console.error('Error loading movies:', error);
        document.getElementById('nowShowingGrid').innerHTML = '<div style="color: red; padding: 20px;">Error loading movies. Please check your API key.</div>';
    }
}

init();