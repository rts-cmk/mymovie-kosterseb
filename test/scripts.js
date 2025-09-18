const API_KEY = '4f5f43495afcc67e9553f6c684a82f84';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let isLoading = false;
let allMovies = [];
let currentNavPage = 'home';

let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

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
            showHomePage();
            break;
        case 'search':
            mainContent.innerHTML = '<div style="padding: 20px; text-align: center;">Search functionality coming soon!</div>';
            break;
        case 'favorites':
            showFavoritesPage();
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

// Bookmark functionality
function saveFavorites() {
    localStorage.setItem('movieFavorites', JSON.stringify(favorites));
}

function addToFavorites(movie) {
    const existingIndex = favorites.findIndex(fav => fav.id === movie.id);
    if (existingIndex === -1) {
        favorites.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            overview: movie.overview,
            genres: movie.genres,
            runtime: movie.runtime
        });
        saveFavorites();
    }
}

function removeFromFavorites(movieId) {
    favorites = favorites.filter(fav => fav.id !== movieId);
    saveFavorites();
}

function isFavorite(movieId) {
    return favorites.some(fav => fav.id === movieId);
}

function toggleFavorite(movie) {
    if (isFavorite(movie.id)) {
        removeFromFavorites(movie.id);
    } else {
        addToFavorites(movie);
    }
    updateBookmarkButtons(movie.id);

    if (currentNavPage === 'favorites') {
        showFavoritesPage();
    }
}

function updateBookmarkButtons(movieId) {
    const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
    bookmarkBtns.forEach(btn => {
        const isFav = isFavorite(movieId);
        const icon = btn.querySelector('.bookmark-icon');
        if (icon) {
            if (isFav) {
                icon.setAttribute('fill', 'currentColor');
                btn.style.color = '#FFCC00';
            } else {
                icon.setAttribute('fill', 'none');
                btn.style.color = 'white';
            }
        }
    });
}

function showHomePage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML =
        `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Now Showing</h2>
                <button class="see-more">See more</button>
            </div>
            <div class="movies-grid" id="nowShowingGrid">
                <div class="loading">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Popular</h2>
                <button class="see-more">See more</button>
            </div>
            <div class="popular-list" id="popularList">
                <div class="loading">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
        `;

    loadNowShowing();
    loadPopularMovies(1);
}

function showFavoritesPage() {
    const mainContent = document.getElementById('mainContent');

    if (favorites.length === 0) {
        mainContent.innerHTML = `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Your Favorites</h2>
            </div>
            <div class="empty-favorites">
                <div class="empty-favorites-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    </svg>
                </div>
                <h3>No favorites yet</h3>
                <p>Movies you bookmark will appear here.</p>
            </div>
        </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">My Favorites</h2>
                <span class="favorites-count">${favorites.length} movies</span>
            </div>
            <div class="popular-list" id="favoritesList">
                ${favorites.map(movie => renderPopularItem(movie).outerHTML).join('')}
            </div>
        </div>
    `;
}

// API Functions
async function fetchMovies(endpoint, page = 1) {
    const response = await fetch(`${BASE_URL}/${endpoint}?api_key=${API_KEY}&page=${page}`);
    const data = await response.json();
    return data;
}

async function fetchMovieDetails(movieId) {
    const [movieResponse, creditsResponse, videosResponse] = await Promise.all([
        fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`),
        fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`),
        fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`)
    ]);

    const movie = await movieResponse.json();
    const credits = await creditsResponse.json();
    const videos = await videosResponse.json();

    return { ...movie, credits, videos };
}

// Render Functions
function renderMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => showMovieDetail(movie.id);

    card.innerHTML = /* html */ `
    <div class="movie-poster blur-webkit" style="background-image: url('${IMAGE_BASE_URL}${movie.poster_path}')"></div>
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

    // Handle genres - could be genre_ids (from basic data) or genres (from detailed data)
    let genres = [];
    if (movie.genres && movie.genres.length > 0) {
        // From detailed movie data
        genres = movie.genres.slice(0, 3).map(genre => genre.name);
    } else if (movie.genre_ids && movie.genre_ids.length > 0) {
        // From basic movie data
        genres = movie.genre_ids.slice(0, 3).map(id => getGenreName(id));
    }

    const duration = movie.runtime ? formatRuntime(movie.runtime) : 'Loading...';

    item.innerHTML = /* html */ `
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
            <svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.8284 6.75736C12.3807 6.75736 12.8284 7.20507 12.8284 7.75736V12.7245L16.3553 14.0653C16.8716 14.2615 17.131 14.8391 16.9347 15.3553C16.7385 15.8716 16.1609 16.131 15.6447 15.9347L11.4731 14.349C11.085 14.2014 10.8284 13.8294 10.8284 13.4142V7.75736C10.8284 7.20507 11.2761 6.75736 11.8284 6.75736Z" fill="#0F1729"/>
</svg>    
            ${duration}
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
        const trailers = movie.videos.results.filter(video =>
            video.site === 'YouTube' &&
            (video.type === 'Trailer' || video.type === 'Teaser')
        );

        const officialTrailer = trailers.find(video =>
            video.official && video.type === 'Trailer'
        );

        const bestTrailer = officialTrailer ||
            trailers.find(video => video.type === 'Trailer') ||
            trailers[0];

        detailContent.innerHTML = /* html */ `
            <div class="movie-backdrop" style="background-image: url('${IMAGE_BASE_URL}${movie.backdrop_path}')">
    ${bestTrailer ? /* html */ `
        <button class="play-button" onclick="playTrailer('${bestTrailer.key}')">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        </button>
        <div class="play-text">Play Trailer</div>
    ` : /* html */ `
        <button class="play-button" disabled style="opacity: 0.5;">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        </button>
        <div class="play-text">No Trailer Available</div>
    `}
    
    <button class="bookmark-btn" onclick="toggleFavorite({id: ${movie.id}, title: '${movie.title.replace(/'/g, "\\'")}', poster_path: '${movie.poster_path}', vote_average: ${movie.vote_average}, release_date: '${movie.release_date}', overview: '${movie.overview.replace(/'/g, "\\'")}', genres: ${JSON.stringify(movie.genres)}, runtime: ${movie.runtime}})">
        <svg class="bookmark-icon" viewBox="0 0 24 24" fill="${isFavorite(movie.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: ${isFavorite(movie.id) ? '#FFB800' : 'white'};">
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

// Video modal functions
function playTrailer(videoKey) {
    const videoModal = document.getElementById('videoModal');
    const videoFrame = document.getElementById('videoFrame');

    videoFrame.src = `https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`;
    videoModal.classList.add('active');

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const videoModal = document.getElementById('videoModal');
    const videoFrame = document.getElementById('videoFrame');

    videoFrame.src = '';
    videoModal.classList.remove('active');

    // Restore body scroll
    document.body.style.overflow = '';
}

// Video modal event listeners
document.getElementById('closeVideoBtn').addEventListener('click', closeVideoModal);

// Close modal when clicking outside
document.getElementById('videoModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('videoModal')) {
        closeVideoModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('videoModal').classList.contains('active')) {
        closeVideoModal();
    }
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

    try {
        const data = await fetchMovies('movie/popular', page);
        const list = document.getElementById('popularList');

        if (page === 1) {
            list.innerHTML = '';
            allMovies = [];
        }

        // Process movies in batches to avoid overwhelming the API
        const batchSize = 5;
        const movies = data.results;

        for (let i = 0; i < movies.length; i += batchSize) {
            const batch = movies.slice(i, i + batchSize);

            // Use existing fetchMovieDetails function for each movie in the batch
            const detailedMoviesPromises = batch.map(movie =>
                fetchMovieDetails(movie.id)
            );

            const detailedMovies = await Promise.all(detailedMoviesPromises);

            // Add movies to the list with full details including runtime
            detailedMovies.forEach(movie => {
                if (movie) {
                    allMovies.push(movie);
                    list.appendChild(renderPopularItem(movie));
                }
            });

            // Small delay between batches to be respectful to the API
            if (i + batchSize < movies.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    } catch (error) {
        console.error('Error loading popular movies:', error);
    }

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