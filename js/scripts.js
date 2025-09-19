// Configuration
const CONFIG = {
    API_KEY: '4f5f43495afcc67e9553f6c684a82f84',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BATCH_SIZE: 5,
    BATCH_DELAY: 200,
    SCROLL_THRESHOLD: 100
};

// Genre mapping
const GENRES = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

// State
let state = {
    currentPage: 1,
    isLoading: false,
    allMovies: [],
    currentNavPage: 'home',
    currentMovieDetail: null,
    favorites: JSON.parse(localStorage.getItem('movieFavorites')) || []
};

// Utility functions
const utils = {
    formatRuntime: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    },

    getGenreName: (genreId) => GENRES[genreId] || 'Unknown',

    escapeHtml: (text) => text.replace(/'/g, '&#39;'),

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    showError: (element, message) => {
        if (element) {
            element.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">${message}</div>`;
        }
    }
};

// DOM helpers
const dom = {
    get: (id) => document.getElementById(id),
    getAll: (selector) => document.querySelectorAll(selector),
    create: (tag, className, innerHTML) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }
};

// API functions
const api = {
    async fetchMovies(endpoint, page = 1) {
        const response = await fetch(`${CONFIG.BASE_URL}/${endpoint}?api_key=${CONFIG.API_KEY}&page=${page}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
    },

    async fetchMovieDetails(movieId) {
        const [movieRes, creditsRes, videosRes, reviewsRes] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/movie/${movieId}?api_key=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/movie/${movieId}/credits?api_key=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/movie/${movieId}/videos?api_key=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/movie/${movieId}/reviews?api_key=${CONFIG.API_KEY}`)
        ]);

        const [movie, credits, videos, reviews] = await Promise.all([
            movieRes.json(),
            creditsRes.json(),
            videosRes.json(),
            reviewsRes.json()
        ]);

        return { ...movie, credits, videos, reviews };
    }
};

// Favorites management
const favorites = {
    save() {
        localStorage.setItem('movieFavorites', JSON.stringify(state.favorites));
    },

    add(movie) {
        if (!this.isFavorite(movie.id)) {
            state.favorites.push({
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                overview: movie.overview,
                genres: movie.genres || [],
                runtime: movie.runtime || 0
            });
            this.save();
        }
    },

    remove(movieId) {
        const initialCount = state.favorites.length;
        state.favorites = state.favorites.filter(fav => fav.id !== movieId);
        if (state.favorites.length < initialCount) {
            this.save();
        }
    },

    isFavorite(movieId) {
        return state.favorites.some(fav => fav.id === movieId);
    },

    toggle(movie) {
        if (this.isFavorite(movie.id)) {
            this.remove(movie.id);
        } else {
            this.add(movie);
        }
        this.updateBookmarkButtons(movie.id);
        if (state.currentNavPage === 'favorites') {
            pages.showFavorites();
        }
    },

    toggleCurrent() {
        if (!state.currentMovieDetail) {
            console.error('No current movie detail available');
            return;
        }
        this.toggle(state.currentMovieDetail);
    },

    updateBookmarkButtons(movieId) {
        const buttons = dom.getAll(`.bookmark-btn[data-id="${movieId}"]`);
        const isFav = this.isFavorite(movieId);

        buttons.forEach(btn => {
            const icon = btn.querySelector('.bookmark-icon');
            if (icon) {
                icon.setAttribute('fill', isFav ? 'currentColor' : 'none');
                icon.style.color = btn.style.color = isFav ? '#FFB800' : 'white';
            }
        });
    }
};

// Template functions
const templates = {
    movieCard(movie) {
        return `
            <div class="movie-poster blur-webkit" style="background-image: url('${CONFIG.IMAGE_BASE_URL}${movie.poster_path}')"></div>
            <div class="movie-title">${movie.title}</div>
            <div class="movie-rating">
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                ${movie.vote_average.toFixed(1)}/10 IMDb
            </div>
        `;
    },

    popularItem(movie) {
        let genres = [];
        if (movie.genres?.length) {
            genres = movie.genres.slice(0, 3).map(genre => genre.name);
        } else if (movie.genre_ids?.length) {
            genres = movie.genre_ids.slice(0, 3).map(utils.getGenreName);
        }

        const duration = movie.runtime ? utils.formatRuntime(movie.runtime) : 'Loading...';

        return `
            <div class="popular-poster" style="background-image: url('${CONFIG.IMAGE_BASE_URL}${movie.poster_path}')"></div>
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
    },

    playButton(trailer) {
        if (!trailer) {
            return `
                <button class="play-button" disabled style="opacity: 0.5;">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <div class="play-text">No Trailer Available</div>
            `;
        }
        return `
            <button class="play-button" onclick="video.play('${trailer.key}')">
                <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
            <div class="play-text">Play Trailer</div>
        `;
    },

    favoriteItem(movie) {
        let genres = [];
        if (movie.genres?.length) {
            genres = movie.genres.slice(0, 3).map(genre => genre.name);
        } else if (movie.genre_ids?.length) {
            genres = movie.genre_ids.slice(0, 3).map(utils.getGenreName);
        }

        const duration = movie.runtime ? utils.formatRuntime(movie.runtime) : 'Unknown';

        return `
            <div class="popular-poster" style="background-image: url('${CONFIG.IMAGE_BASE_URL}${movie.poster_path}')"></div>
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
                <div class="favorite-actions">
                    <div class="movie-duration">
                        <svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.8284 6.75736C12.3807 6.75736 12.8284 7.20507 12.8284 7.75736V12.7245L16.3553 14.0653C16.8716 14.2615 17.131 14.8391 16.9347 15.3553C16.7385 15.8716 16.1609 16.131 15.6447 15.9347L11.4731 14.349C11.085 14.2014 10.8284 13.8294 10.8284 13.4142V7.75736C10.8284 7.20507 11.2761 6.75736 11.8284 6.75736Z" fill="#0F1729"/>
                        </svg>    
                        ${duration}
                    </div>
                    <div class="tap-hint">Tap to view details</div>
                </div>
            </div>
        `;
    },

    loading() {
        return `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
};

// Page management
const pages = {
    switch(page) {
        // Update navigation
        dom.getAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        state.currentNavPage = page;
        const mainContent = dom.get('mainContent');

        switch (page) {
            case 'home':
                this.showHome();
                break;
            case 'search':
                mainContent.innerHTML = '<div style="padding: 20px; text-align: center;">Search functionality coming soon!</div>';
                break;
            case 'favorites':
                this.showFavorites();
                break;
        }
    },

    showHome() {
        const mainContent = dom.get('mainContent');
        mainContent.innerHTML = `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">Now Showing</h2>
                    <button class="see-more">See more</button>
                </div>
                <div class="movies-grid" id="nowShowingGrid">${templates.loading()}</div>
            </div>
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">Popular</h2>
                    <button class="see-more">See more</button>
                </div>
                <div class="popular-list" id="popularList">${templates.loading()}</div>
            </div>
        `;

        movies.loadNowShowing();
        movies.loadPopular(1);
    },

    showFavorites() {
        const mainContent = dom.get('mainContent');

        if (state.favorites.length === 0) {
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
                    <span class="favorites-count">${state.favorites.length} movies</span>
                </div>
                <div class="popular-list" id="favoritesList"></div>
            </div>
        `;

        // Create interactive favorite items
        const favoritesList = dom.get('favoritesList');
        state.favorites.forEach(movie => {
            const item = dom.create('div', 'popular-item favorite-item');
            item.innerHTML = templates.favoriteItem(movie);

            // Add click handler to navigate to detail view
            item.addEventListener('click', () => {
                movies.showDetail(movie.id);
            });

            favoritesList.appendChild(item);
        });
    }
};

// Movie management
const movies = {
    async loadNowShowing() {
        try {
            const data = await api.fetchMovies('movie/now_playing');
            const grid = dom.get('nowShowingGrid');
            grid.innerHTML = '';

            data.results.slice(0, 10).forEach(movie => {
                const card = dom.create('div', 'movie-card');
                card.onclick = () => this.showDetail(movie.id);
                card.innerHTML = templates.movieCard(movie);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading now showing:', error);
            utils.showError(dom.get('nowShowingGrid'), 'Error loading movies');
        }
    },

    async loadPopular(page = 1) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            const data = await api.fetchMovies('movie/popular', page);
            const list = dom.get('popularList');

            if (page === 1) {
                list.innerHTML = '';
                state.allMovies = [];
            }

            // Process in batches
            for (let i = 0; i < data.results.length; i += CONFIG.BATCH_SIZE) {
                const batch = data.results.slice(i, i + CONFIG.BATCH_SIZE);
                const detailedMovies = await Promise.all(
                    batch.map(movie => api.fetchMovieDetails(movie.id))
                );

                detailedMovies.forEach(movie => {
                    if (movie) {
                        state.allMovies.push(movie);
                        const item = dom.create('div', 'popular-item');
                        item.onclick = () => this.showDetail(movie.id);
                        item.innerHTML = templates.popularItem(movie);
                        list.appendChild(item);
                    }
                });

                if (i + CONFIG.BATCH_SIZE < data.results.length) {
                    await utils.delay(CONFIG.BATCH_DELAY);
                }
            }
        } catch (error) {
            console.error('Error loading popular movies:', error);
            if (page === 1) {
                utils.showError(dom.get('popularList'), 'Error loading movies');
            }
        }

        state.currentPage = page;
        state.isLoading = false;
    },

    async showDetail(movieId) {
        const detailView = dom.get('detailView');
        const detailContent = dom.get('detailContent');

        detailView.classList.add('active');
        detailContent.innerHTML = `<div style="padding: 100px 20px;">${templates.loading()}</div>`;

        try {
            const movie = await api.fetchMovieDetails(movieId);
            state.currentMovieDetail = movie;

            const cast = movie.credits.cast.slice(0, 6);
            const genres = movie.genres.slice(0, 3);
            const reviews = movie.reviews.results;
            const trailers = movie.videos.results.filter(v =>
                v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            );

            const bestTrailer = trailers.find(v => v.official && v.type === 'Trailer') ||
                trailers.find(v => v.type === 'Trailer') ||
                trailers[0];

            detailContent.innerHTML = `
                <div class="movie-backdrop" style="background-image: url('${CONFIG.IMAGE_BASE_URL}${movie.backdrop_path}')">
                    ${templates.playButton(bestTrailer)}
                    <button class="bookmark-btn" data-id="${movie.id}" onclick="favorites.toggleCurrent()">
                        <svg class="bookmark-icon" viewBox="0 0 24 24" fill="${favorites.isFavorite(movie.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: ${favorites.isFavorite(movie.id) ? '#FFB800' : 'white'};">
                            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="detail-content">
                    <h1 class="detail-title">${utils.escapeHtml(movie.title)}</h1>
                    
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
                            <div class="info-value">${utils.formatRuntime(movie.runtime)}</div>
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
                        <p>${utils.escapeHtml(movie.overview)}</p>
                    </div>
                    
                    <div class="cast-section"">
                        <h3>Cast <span class="see-more" style="font-size: 12px; font-weight: normal;">See more</span></h3>
                        <div class="cast-grid">
                            ${cast.map(actor => `
                                <div class="cast-item">
                                    <div class="cast-photo" style="background-image: url('${CONFIG.IMAGE_BASE_URL}${actor.profile_path}')"></div>
                                    <div class="cast-name">${actor.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="reviews-section">
                        <h3>User Reviews</h3>
                        <div class="reviews-list">
                        ${reviews.length > 0 ?
                    reviews.slice(0, 5).map(review => `
                        <div class="review-item">
                            <div class="review-author">
                                A review by <strong> ${utils.escapeHtml(review.author)}
                                ${review.author_details.rating ? ` 
                                    <span class="review-rating">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M6 9.5L2.47329 11.3541L3.14683 7.42705L0.293661 4.6459L4.23664 4.07295L6 0.5L7.76336 4.07295L11.7063 4.6459L8.85317 7.42705L9.52671 11.3541L6 9.5Z" fill="#FFC319"/>
                                        </svg>
                                    ${review.author_details.rating}/10</span>` : ''}
                                    </strong>
                            </div>

                            <div class="review-content">
                                    ${utils.escapeHtml(review.content.substring(0, 300))}.. 
                                    <a href="${review.url}" target="_blank">read more</a>
                            </div>
                        </div>
                                `).join('') :
                    '<p class="no-reviews">No reviews available.</p>'
                }
                        </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading movie details:', error);
            detailContent.innerHTML = '<div style="padding: 50px 20px; text-align: center; color: red;">Error loading movie details. Please try again.</div>';
        }
    }
};

// Video modal
const video = {
    play(videoKey) {
        const modal = dom.get('videoModal');
        const frame = dom.get('videoFrame');

        frame.src = `https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const modal = dom.get('videoModal');
        const frame = dom.get('videoFrame');

        frame.src = '';
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Theme management
const theme = {
    toggle() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        dom.get('themeToggle')?.classList.toggle('active', isDark);
        dom.get('detailThemeToggle')?.classList.toggle('active', isDark);

        localStorage.setItem('darkMode', isDark);
    },

    init() {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-mode');
            dom.get('themeToggle')?.classList.add('active');
            dom.get('detailThemeToggle')?.classList.add('active');
        }
    }
};

// Event handlers
function handleScroll() {
    const mainContent = dom.get('mainContent');
    if (!mainContent) return;

    const { scrollTop, scrollHeight, clientHeight } = mainContent;
    if (scrollTop + clientHeight >= scrollHeight - CONFIG.SCROLL_THRESHOLD && !state.isLoading) {
        movies.loadPopular(state.currentPage + 1);
    }
}

// Initialize app
function init() {
    if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY') {
        utils.showError(dom.get('nowShowingGrid'), 'Please add your TMDB API key to use this app');
        utils.showError(dom.get('popularList'), 'Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color: #007AFF;">TMDB</a>');
        return;
    }

    // Initialize theme
    theme.init();

    // Event listeners
    dom.getAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            pages.switch(item.getAttribute('data-page'));
        });
    });

    dom.get('themeToggle')?.addEventListener('click', theme.toggle);
    dom.get('detailThemeToggle')?.addEventListener('click', theme.toggle);

    dom.get('backBtn')?.addEventListener('click', () => {
        dom.get('detailView')?.classList.remove('active');
        state.currentMovieDetail = null;
    });

    dom.get('closeVideoBtn')?.addEventListener('click', video.close);
    dom.get('videoModal')?.addEventListener('click', (e) => {
        if (e.target === dom.get('videoModal')) video.close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.get('videoModal')?.classList.contains('active')) {
            video.close();
        }
    });

    dom.get('mainContent')?.addEventListener('scroll', handleScroll);

    // Load initial data
    pages.showHome();
}

// Global functions for HTML onclick handlers
window.favorites = favorites;
window.video = video;

// Start the app
document.addEventListener('DOMContentLoaded', init);