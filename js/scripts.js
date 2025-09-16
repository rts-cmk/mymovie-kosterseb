const API_KEY = '4f5f43495afcc67e9553f6c684a82f84';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

// App State
let currentCategory = 'popular';
let currentPage = 1;
let isLoading = false;
let searchQuery = '';
let allMovies = [];

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const nowPlayingContainer = document.getElementById('nowPlayingContainer');
const loading = document.getElementById('loading');
const themeToggle = document.getElementById('themeToggle');
const searchBar = document.getElementById('searchBar');
const movieModal = document.getElementById('movieModal');
const modalClose = document.getElementById('modalClose');
const mainTitle = document.getElementById('mainTitle');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? 'Light' : 'Dark';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
});

// API Functions
async function fetchMovies(category, page = 1, query = '') {
    let url;
    if (query) {
        url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
    } else {
        url = `${BASE_URL}/movie/${category}?api_key=${API_KEY}&page=${page}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
}

async function fetchMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

// UI Functions
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openMovieModal(movie.id);
    
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="%23cccccc"/><text x="100" y="150" text-anchor="middle" fill="%23666666" font-size="14">No Image</text></svg>';

    card.innerHTML = `
        <img class="movie-poster" src="${posterPath}" alt="${movie.title}">
        <div class="movie-info">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-rating">
                <span class="rating-star">⭐</span>
                <span>${movie.vote_average.toFixed(1)}</span>
            </div>
        </div>
    `;
    return card;
}

function displayMovies(movies, append = false) {
    if (!append) {
        moviesGrid.innerHTML = '';
    }

    movies.forEach(movie => {
        moviesGrid.appendChild(createMovieCard(movie));
    });
}

function displayNowPlaying(movies) {
    nowPlayingContainer.innerHTML = '';
    movies.forEach(movie => {
        nowPlayingContainer.appendChild(createMovieCard(movie));
    });
}

async function openMovieModal(movieId) {
    const movieDetails = await fetchMovieDetails(movieId);
    if (!movieDetails) return;

    document.getElementById('modalTitle').textContent = movieDetails.title;
    document.getElementById('modalRating').textContent = movieDetails.vote_average.toFixed(1);
    document.getElementById('modalDate').textContent = new Date(movieDetails.release_date).getFullYear();
    document.getElementById('modalRuntime').textContent = movieDetails.runtime || 'N/A';
    document.getElementById('modalOverview').textContent = movieDetails.overview;
    
    const backdropPath = movieDetails.backdrop_path 
        ? `${BACKDROP_BASE_URL}${movieDetails.backdrop_path}`
        : `${IMAGE_BASE_URL}${movieDetails.poster_path}`;
    document.getElementById('modalBackdrop').src = backdropPath;

    movieModal.classList.add('active');
}

function closeMovieModal() {
    movieModal.classList.remove('active');
}

// Event Listeners
document.querySelectorAll('[data-category]').forEach(item => {
    item.addEventListener('click', async (e) => {
        const category = e.target.getAttribute('data-category');
        await changeCategory(category);
        
        // Update active state
        document.querySelectorAll('[data-category]').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');
    });
});

async function changeCategory(category) {
    currentCategory = category;
    currentPage = 1;
    searchQuery = '';
    searchBar.value = '';
    
    const categoryTitles = {
        popular: 'Popular Movies',
        top_rated: 'Top Rated Movies',
        upcoming: 'Upcoming Movies'
    };
    
    mainTitle.textContent = categoryTitles[category];
    
    const movies = await fetchMovies(category, 1);
    allMovies = movies;
    displayMovies(movies);
}

modalClose.addEventListener('click', closeMovieModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeMovieModal();
});

// Search functionality
let searchTimeout;
searchBar.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        
        if (searchQuery) {
            mainTitle.textContent = `Search Results for "${searchQuery}"`;
            const movies = await fetchMovies('', 1, searchQuery);
            allMovies = movies;
            displayMovies(movies);
        } else {
            await changeCategory(currentCategory);
        }
    }, 300);
});

// Infinite Scroll
function setupInfiniteScroll() {
    window.addEventListener('scroll', async () => {
        if (isLoading) return;
        
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 1000) {
            isLoading = true;
            loading.style.display = 'block';
            
            currentPage++;
            const newMovies = await fetchMovies(
                searchQuery ? '' : currentCategory, 
                currentPage, 
                searchQuery
            );
            
            allMovies = [...allMovies, ...newMovies];
            displayMovies(newMovies, true);
            
            loading.style.display = 'none';
            isLoading = false;
        }
    });
}

// Initialize App
async function init() {
    initTheme();
    
    // Load now playing movies
    const nowPlayingMovies = await fetchMovies('now_playing');
    displayNowPlaying(nowPlayingMovies);
    
    // Load initial popular movies
    const popularMovies = await fetchMovies('popular');
    allMovies = popularMovies;
    displayMovies(popularMovies);
    
    setupInfiniteScroll();
}

init();