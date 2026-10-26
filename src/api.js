import demoMovies from "./data";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_BASE = "https://api.themoviedb.org/3";

function demoResponse(movies, page = 1) {
  const pageSize = 8;
  const start = (page - 1) * pageSize;
  return {
    results: movies.slice(start, start + pageSize),
    page,
    total_pages: Math.max(1, Math.ceil(movies.length / pageSize)),
    total_results: movies.length,
  };
}

async function request(path, params = {}, signal) {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

export const isDemoMode = !API_KEY;

export function getTrending(page = 1, signal) {
  if (isDemoMode) return Promise.resolve(demoResponse(demoMovies, page));
  return request("/trending/movie/week", { page }, signal);
}

export function getPopular(page = 1, signal) {
  if (isDemoMode) {
    return Promise.resolve(
      demoResponse([...demoMovies].sort((a, b) => b.vote_average - a.vote_average), page),
    );
  }
  return request("/movie/popular", { page }, signal);
}

export function searchMovies(query, page = 1, signal) {
  if (isDemoMode) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = demoMovies.filter((movie) =>
      movie.title.toLocaleLowerCase().includes(normalizedQuery),
    );
    return Promise.resolve(demoResponse(matches, page));
  }
  return request("/search/movie", { query, page, include_adult: false }, signal);
}

export async function getMovie(id, signal) {
  if (isDemoMode) {
    const movie = demoMovies.find((item) => String(item.id) === String(id));
    if (!movie) throw new Error("That title isn’t in the demo collection.");
    return {
      ...movie,
      runtime: 148,
      genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Sci-Fi" }],
      credits: {
        cast: [
          { id: 1, name: "Featured cast", character: "Cast details available with TMDB" },
        ],
      },
      videos: { results: [] },
    };
  }
  return request(`/movie/${id}`, { append_to_response: "credits,videos" }, signal);
}
