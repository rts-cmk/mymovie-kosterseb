# Netflæsk Movie App - JavaScript Documentation

A beginner-friendly guide to understanding how the JavaScript code works in the Netflæsk movie discovery app.

## Table of Contents
1. [Overview](#overview)
2. [App Structure](#app-structure)
3. [Configuration & Setup](#configuration--setup)
4. [Core Modules](#core-modules)
5. [Data Flow](#data-flow)
6. [Key Functions Explained](#key-functions-explained)
7. [Event Handling](#event-handling)
8. [Common JavaScript Concepts Used](#common-javascript-concepts-used)

## Overview

The Netflæsk app is a movie discovery application that lets users browse movies, view details, watch trailers, and bookmark favorites. The JavaScript code is organized into logical modules that each handle specific features.

**What the app does:**
- Fetches movie data from The Movie Database (TMDB) API
- Displays movies in different sections (Now Showing, Popular)
- Shows detailed movie information with trailers
- Allows users to bookmark favorite movies
- Provides dark/light theme switching
- Handles navigation between different pages

## App Structure

The JavaScript is organized into several modules (think of modules as different departments in a company):

```
scripts.js
├── Configuration (CONFIG, GENRES)
├── State Management (state object)
├── Utility Functions (utils)
├── DOM Helpers (dom)
├── API Functions (api)
├── Favorites Management (favorites)
├── Templates (templates)
├── Page Management (pages)
├── Movie Management (movies)
├── Video Modal (video)
├── Theme Management (theme)
├── Event Handlers
└── Initialization (init)
```

## Configuration & Setup

### CONFIG Object
```javascript
const CONFIG = {
    API_KEY: '4f5f43495afcc67e9553f6c684a82f84',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    // ... other settings
};
```

**What it does:** Stores all the important settings in one place. Like having a settings file that the entire app can reference.

**Why it's useful:** If you need to change the API URL or image size, you only change it in one place instead of searching through the entire code.

### State Object
```javascript
let state = {
    currentPage: 1,
    isLoading: false,
    allMovies: [],
    currentNavPage: 'home',
    currentMovieDetail: null,
    favorites: []
};
```

**What it does:** Keeps track of what's currently happening in the app. Think of it as the app's memory.

**Key properties:**
- `currentPage`: Which page of movies we're viewing
- `isLoading`: Whether we're currently fetching data
- `allMovies`: All the movies we've loaded so far
- `currentNavPage`: Which tab the user is on (home, search, favorites)
- `favorites`: Movies the user has bookmarked

## Core Modules

### 1. Utility Functions (`utils`)
Contains helper functions used throughout the app:

```javascript
const utils = {
    formatRuntime: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    },
    // ... other utility functions
};
```

**Example:** Converts movie runtime from minutes (120) to readable format (2h 0min).

### 2. DOM Helpers (`dom`)
Makes it easier to work with HTML elements:

```javascript
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
```

**What it does:** Instead of writing `document.getElementById('movieList')` every time, you can write `dom.get('movieList')`.

### 3. API Functions (`api`)
Handles communication with The Movie Database:

```javascript
const api = {
    async fetchMovies(endpoint, page = 1) {
        const response = await fetch(`${CONFIG.BASE_URL}/${endpoint}?api_key=${CONFIG.API_KEY}&page=${page}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
    }
};
```

**What happens step by step:**
1. Build the URL with the API endpoint and your API key
2. Send a request to the TMDB server
3. Wait for the response
4. Convert the response to JavaScript objects
5. Return the data to whoever called this function

### 4. Favorites Management (`favorites`)
Handles bookmarking movies:

```javascript
const favorites = {
    save() {
        localStorage.setItem('movieFavorites', JSON.stringify(state.favorites));
    },
    
    add(movie) {
        if (!this.isFavorite(movie.id)) {
            state.favorites.push(movie);
            this.save();
        }
    }
};
```

**How it works:**
- `save()`: Stores the favorites list in the browser's localStorage (so it persists between sessions)
- `add()`: Adds a movie to favorites if it's not already there
- `isFavorite()`: Checks if a movie is already bookmarked

## Data Flow

Here's how data flows through the app:

```
1. User opens app
   ↓
2. init() function runs
   ↓
3. API calls fetch movie data
   ↓
4. Data gets processed and stored in state
   ↓
5. Templates generate HTML
   ↓
6. HTML gets added to the page
   ↓
7. User interactions trigger events
   ↓
8. Events update state and refresh display
```

## Key Functions Explained

### Loading Movies
```javascript
async function loadNowShowing() {
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
    }
}
```

**Step by step:**
1. `try` block starts error handling
2. Call the API to get "now playing" movies
3. Find the HTML element where movies should be displayed
4. Clear any existing content
5. Take the first 10 movies from the results
6. For each movie, create a card element
7. Add click functionality to show movie details
8. Generate the HTML content using a template
9. Add the card to the page
10. If anything goes wrong, the `catch` block handles the error

### Showing Movie Details
```javascript
async showDetail(movieId) {
    const detailView = dom.get('detailView');
    detailView.classList.add('active');
    
    try {
        const movie = await api.fetchMovieDetails(movieId);
        state.currentMovieDetail = movie;
        
        // Generate and display the detail content
        detailContent.innerHTML = /* template with movie data */;
    } catch (error) {
        // Show error message
    }
}
```

**What happens:**
1. Show the detail view overlay
2. Fetch complete movie information from the API
3. Store the movie data in the app's state
4. Generate HTML using the movie data
5. Display the generated content

### Managing Favorites
```javascript
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
}
```

**Logic flow:**
1. Check if the movie is already a favorite
2. If yes, remove it; if no, add it
3. Update the bookmark button appearance
4. If user is on the favorites page, refresh the display

## Event Handling

### Theme Switching
```javascript
const theme = {
    toggle() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        dom.get('themeToggle')?.classList.toggle('active', isDark);
        localStorage.setItem('darkMode', isDark);
    }
};
```

**What happens when you click the theme toggle:**
1. Add or remove the 'dark-mode' class from the body
2. Check if dark mode is now active
3. Update the toggle button appearance
4. Save the preference to localStorage

### Navigation
```javascript
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        pages.switch(item.getAttribute('data-page'));
    });
});
```

**Process:**
1. Find all navigation items
2. Add a click listener to each one
3. When clicked, prevent the default link behavior
4. Get the page name from the data-page attribute
5. Switch to that page

## Common JavaScript Concepts Used

### Async/Await
```javascript
async function fetchData() {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
```
**What it does:** Makes the code wait for operations that take time (like API calls) without freezing the app.

### Arrow Functions
```javascript
// Old way
function(movie) { return movie.title; }

// New way
(movie) => movie.title
```
**What it does:** A shorter way to write functions, especially useful for simple operations.

### Template Literals
```javascript
const html = `
    <div class="movie-title">${movie.title}</div>
    <div class="movie-rating">${movie.rating}/10</div>
`;
```
**What it does:** Lets you embed variables directly in strings using `${variable}` syntax.

### Destructuring
```javascript
const { title, rating, overview } = movie;
// Instead of:
// const title = movie.title;
// const rating = movie.rating;
// const overview = movie.overview;
```
**What it does:** Extracts multiple properties from an object in one line.

### Array Methods
```javascript
movies.filter(movie => movie.rating > 7)  // Get only highly rated movies
movies.map(movie => movie.title)          // Get just the titles
movies.forEach(movie => console.log(movie)) // Do something with each movie
```
**What they do:** Process arrays without writing loops manually.

### Local Storage
```javascript
localStorage.setItem('favorites', JSON.stringify(favoritesArray));
const saved = JSON.parse(localStorage.getItem('favorites')) || [];
```
**What it does:** Saves data in the browser so it persists between sessions.

## How Everything Connects

1. **Initialization**: The `init()` function sets up event listeners and loads initial data
2. **User Interaction**: Clicks trigger event handlers
3. **State Updates**: Event handlers modify the app state
4. **API Calls**: When new data is needed, API functions fetch it
5. **Template Rendering**: Data gets converted to HTML using template functions
6. **DOM Updates**: The HTML gets added to the page
7. **Persistence**: Important data (like favorites) gets saved to localStorage

This modular approach makes the code easier to understand, debug, and extend. Each module has a specific responsibility, making it easier to find and fix issues or add new features.

## Tips for Understanding the Code

1. **Start with `init()`**: This function shows you how everything begins
2. **Follow the data**: Trace how movie data flows from API → state → templates → DOM
3. **Look at the state object**: Understanding what data the app tracks helps you understand the functionality
4. **Check the event handlers**: These show you what happens when users interact with the app
5. **Read the comments**: The code includes helpful comments explaining complex parts

Remember: Even experienced developers don't understand everything at once. Take it section by section, and don't be afraid to add your own console.log statements to see what's happening!