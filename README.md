# CineScope

A responsive movie discovery app built with React, React Router, and the TMDB API. Browse trending and popular films, search with a debounced query, explore movie details, and keep a watchlist saved in your browser.

## Getting started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add a TMDB API key to `VITE_TMDB_API_KEY`.
3. Run `npm run dev`.

The app includes a small local demo catalog and remains usable without an API key. Add a TMDB key to load live movie, cast, and video data.

## Included

- Discover home with trending and popular movie rows
- Debounced search with paginated results
- Movie detail pages with cast and trailers when available
- Watchlist persisted in localStorage
- Responsive layouts and loading, empty, and error states
