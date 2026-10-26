import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  getMovie,
  getPopular,
  getTrending,
  isDemoMode,
  searchMovies,
} from "./api";

const imageBase = "https://image.tmdb.org/t/p/";
const FavoritesContext = createContext(null);

function Icon({ name, size = 18, className = "" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    play: <><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 1.2 2.3L22 17l-1.8.7L19 20l-.8-2.3L16 17l2.2-.7L19 14Z" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem("cinescope-favorites") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Could not read the saved watchlist.", error);
    return [];
  }
}

function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readFavorites);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("cinescope-favorites", JSON.stringify(favorites));
      setStorageError(false);
    } catch (error) {
      console.error("Could not save the watchlist to localStorage.", error);
      setStorageError(true);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((movie) => {
    setFavorites((current) =>
      current.some((item) => item.id === movie.id)
        ? current.filter((item) => item.id !== movie.id)
        : [movie, ...current],
    );
  }, []);

  const value = {
    favorites,
    storageError,
    toggleFavorite,
    isFavorite: (id) => favorites.some((item) => String(item.id) === String(id)),
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside FavoritesProvider.");
  return context;
}

function Header() {
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [value, setValue] = useState(params.get("q") || "");

  useEffect(() => {
    setValue(new URLSearchParams(location.search).get("q") || "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    const query = value.trim();
    const timer = window.setTimeout(() => {
      if (query) {
        navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
      } else if (location.pathname === "/search") {
        navigate("/", { replace: true });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, navigate, location.pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="CineScope home">
          <span className="brand-mark"><Icon name="film" size={19} /></span>
          <span>Cine<span>Scope</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>Discover</NavLink>
          <NavLink to="/watchlist" className="watchlist-link">
            Watchlist <span className="nav-count">{favorites.length}</span>
          </NavLink>
        </nav>
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            aria-label="Search movies"
            placeholder="Search movies..."
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim()) {
                navigate(`/search?q=${encodeURIComponent(value.trim())}`);
              }
            }}
          />
          {value && (
            <button
              className="search-clear"
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                navigate("/");
              }}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </label>
      </div>
    </header>
  );
}

function Image({ path, size = "w500", alt = "", className = "", loading = "lazy" }) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) {
    return (
      <div className={`image-fallback ${className}`} aria-label={alt}>
        <Icon name="film" size={30} />
      </div>
    );
  }
  return (
    <img
      className={className}
      src={`${imageBase}${size}${path}`}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}

function FavoriteButton({ movie, label = true }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(movie.id);
  return (
    <button
      className={`favorite-button ${saved ? "is-saved" : ""}`}
      type="button"
      aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(movie);
      }}
    >
      <Icon name="heart" size={17} />
      {label && <span>{saved ? "In watchlist" : "Add to watchlist"}</span>}
    </button>
  );
}

function MovieCard({ movie, index }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(movie.id);
  return (
    <article className="movie-card" style={{ "--card-index": index % 8 }}>
      <Link className="poster-link" to={`/movie/${movie.id}`} aria-label={`View ${movie.title}`}>
        <div className="poster-wrap">
          <Image path={movie.poster_path} alt={`${movie.title} poster`} />
          <div className="poster-hover">
            <span className="play-round"><Icon name="play" size={18} /></span>
            <span>View details</span>
          </div>
        </div>
      </Link>
      <button
        className={`card-heart ${saved ? "is-saved" : ""}`}
        type="button"
        aria-label={`Toggle ${movie.title} in watchlist`}
        aria-pressed={saved}
        onClick={() => toggleFavorite(movie)}
      >
        <Icon name="heart" size={17} />
      </button>
      <Link className="movie-meta" to={`/movie/${movie.id}`}>
        <span className="movie-title">{movie.title}</span>
        <span className="movie-subline">
          <span>{(movie.release_date || "").slice(0, 4) || "Coming soon"}</span>
          {movie.vote_average > 0 && (
            <span className="rating"><Icon name="star" size={13} /> {movie.vote_average.toFixed(1)}</span>
          )}
        </span>
      </Link>
    </article>
  );
}

function MovieRow({ title, eyebrow, movies, loading, error }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <div className="row-controls" aria-hidden="true">
          <span>Scroll to explore</span><Icon name="arrow" size={16} />
        </div>
      </div>
      {error ? (
        <div className="inline-error">{error}</div>
      ) : (
        <div className="movie-row">
          {loading
            ? Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index} />)
            : movies.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} />)}
        </div>
      )}
    </section>
  );
}

function HomePage() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getTrending(1, controller.signal), getPopular(1, controller.signal)])
      .then(([trendData, popularData]) => {
        setTrending(trendData.results || []);
        setPopular(popularData.results || []);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const featured = trending[0];
  return (
    <>
      <main className="page-shell">
        <section className={`hero ${featured?.backdrop_path ? "hero-has-image" : ""}`}>
          {featured?.backdrop_path && (
            <Image
              path={featured.backdrop_path}
              size="original"
              alt=""
              className="hero-image"
              loading="eager"
            />
          )}
          <div className="hero-content">
            <div className="hero-kicker"><span className="live-dot" /> YOUR NEXT MOVIE NIGHT STARTS HERE</div>
            <h1>Find your next<br /><span>favorite film.</span></h1>
            <p>Good stories are waiting. Explore what’s trending, find hidden gems, and keep your must-watch list close.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#trending">
                Explore trending <Icon name="arrow" size={17} />
              </a>
              {featured && (
                <Link className="button button-glass" to={`/movie/${featured.id}`}>
                  <Icon name="play" size={15} /> Featured pick
                </Link>
              )}
            </div>
            {featured && (
              <div className="featured-note">
                <span className="featured-cover"><Image path={featured.poster_path} alt="" /></span>
                <span><small>FEATURED THIS WEEK</small><strong>{featured.title}</strong></span>
                <span className="featured-rating"><Icon name="star" size={14} /> {featured.vote_average?.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="hero-side-note"><span>01</span> CURATED FOR YOUR NEXT WATCH</div>
        </section>
        {isDemoMode && (
          <div className="demo-note">
            <Icon name="sparkle" size={16} />
            <span><strong>Demo mode</strong> · Add a TMDB API key in <code>.env</code> to explore the live catalog.</span>
          </div>
        )}
        {error && <div className="page-error"><Icon name="film" /> {error}</div>}
        <div id="trending">
          <MovieRow
            title="Trending now"
            eyebrow="THE CULTURE RIGHT NOW"
            movies={trending}
            loading={loading}
            error={error}
          />
        </div>
        <MovieRow
          title="Popular picks"
          eyebrow="A GOOD PLACE TO START"
          movies={popular}
          loading={loading}
          error={error}
        />
        <section className="watchlist-promo">
          <div className="promo-icon"><Icon name="heart" size={21} /></div>
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2>Save the good ones for later.</h2>
            <p>Tap the heart on any movie and your watchlist will be right here when you come back.</p>
          </div>
          <Link className="button button-outline" to="/watchlist">Your watchlist <Icon name="arrow" size={16} /></Link>
          <span className="promo-decoration">✳</span>
        </section>
      </main>
    </>
  );
}

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    if (!query) {
      setMovies([]);
      setLoading(false);
      setError("");
      lastQueryRef.current = "";
      return undefined;
    }
    if (lastQueryRef.current !== query) {
      lastQueryRef.current = query;
      setMovies([]);
      setError("");
      if (page !== 1) {
        setPage(1);
        return undefined;
      }
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchMovies(query, page, controller.signal)
      .then((data) => {
        setMovies((current) => (page === 1 ? data.results || [] : [...current, ...(data.results || [])]));
        setHasMore(page < (data.total_pages || 1));
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPage((current) => current + 1);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!query) {
    return (
      <main className="page-shell standard-page">
        <div className="page-intro">
          <span className="eyebrow">THE MOVIE FILES</span>
          <h1>What are you<br /><span>in the mood for?</span></h1>
          <p>Search for a title above and we’ll find a place to start.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell standard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEARCH RESULTS</span>
          <h1>“{query}”</h1>
          <p>{loading && movies.length === 0 ? "Looking through the collection…" : `${movies.length} ${movies.length === 1 ? "movie" : "movies"} to explore`}</p>
        </div>
        <span className="heading-search-icon"><Icon name="search" size={24} /></span>
      </div>
      {error && <div className="page-error"><Icon name="film" /> {error}</div>}
      {!error && movies.length === 0 && !loading ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="search" size={24} /></span>
          <h2>No movies found</h2>
          <p>Try another title or a shorter search. The best discoveries can be unexpected.</p>
        </div>
      ) : (
        <div className="movie-grid">
          {movies.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} />)}
          {loading && Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={`loading-${index}`} />)}
        </div>
      )}
      <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
      {hasMore && !loading && <p className="scroll-hint">Keep scrolling for more</p>}
    </main>
  );
}

function WatchlistPage() {
  const { favorites } = useFavorites();
  return (
    <main className="page-shell standard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL COLLECTION</span>
          <h1>Watchlist<span className="heading-period">.</span></h1>
          <p>{favorites.length ? `${favorites.length} ${favorites.length === 1 ? "film" : "films"} saved for a future movie night` : "A little corner for the movies you don’t want to forget."}</p>
        </div>
        <span className="heading-search-icon"><Icon name="heart" size={24} /></span>
      </div>
      {favorites.length ? (
        <div className="movie-grid">
          {favorites.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} />)}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="heart" size={24} /></span>
          <h2>Your list is waiting for a first pick.</h2>
          <p>Save a movie with the heart button and it’ll stay here, even after you close the tab.</p>
          <Link className="button button-primary" to="/">Find something to watch <Icon name="arrow" size={16} /></Link>
        </div>
      )}
    </main>
  );
}

function DetailPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setMovie(null);
    setLoading(true);
    setError("");
    getMovie(id, controller.signal)
      .then(setMovie)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <main className="page-shell detail-loading"><div className="detail-skeleton" /></main>;
  }
  if (error || !movie) {
    return (
      <main className="page-shell standard-page">
        <Link to="/" className="back-link"><Icon name="back" size={16} /> Back to discover</Link>
        <div className="empty-state">
          <span className="empty-icon"><Icon name="film" size={24} /></span>
          <h2>We couldn’t find that movie.</h2>
          <p>{error || "It may have been removed from the collection."}</p>
          <Link className="button button-primary" to="/">Back to discover</Link>
        </div>
      </main>
    );
  }

  const trailer = movie.videos?.results?.find(
    (video) => video.site === "YouTube" && video.type === "Trailer",
  );
  const cast = movie.credits?.cast?.slice(0, 6) || [];
  const year = movie.release_date?.slice(0, 4);
  return (
    <main className="detail-page">
      <div className="detail-backdrop">
        {movie.backdrop_path && <Image path={movie.backdrop_path} size="original" alt="" />}
      </div>
      <div className="page-shell detail-shell">
        <Link to="/" className="back-link"><Icon name="back" size={16} /> Back to discover</Link>
        <section className="detail-hero">
          <div className="detail-poster"><Image path={movie.poster_path} alt={`${movie.title} poster`} /></div>
          <div className="detail-copy">
            <span className="eyebrow">THE FEATURE PRESENTATION</span>
            <h1>{movie.title}</h1>
            {movie.tagline && <p className="movie-tagline">“{movie.tagline}”</p>}
            <div className="detail-facts">
              {year && <span>{year}</span>}
              {movie.runtime > 0 && <span><Icon name="clock" size={14} /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
              {movie.vote_average > 0 && <span className="rating"><Icon name="star" size={14} /> {movie.vote_average.toFixed(1)} <small>/ 10</small></span>}
            </div>
            {movie.genres?.length > 0 && (
              <div className="genre-list">{movie.genres.map((genre) => <span key={genre.id}>{genre.name}</span>)}</div>
            )}
            <p className="detail-overview">{movie.overview || "No synopsis is available for this title yet."}</p>
            <div className="detail-actions">
              <FavoriteButton movie={movie} />
              {trailer && (
                <a className="button button-glass" href="#trailer"><Icon name="play" size={15} /> Watch trailer</a>
              )}
            </div>
          </div>
        </section>
        <div className="detail-lower">
          <section className="detail-info">
            <div className="section-heading"><div><span className="eyebrow">THE STORY</span><h2>About the film</h2></div></div>
            <p>{movie.overview || "No synopsis is available for this title yet."}</p>
            {cast.length > 0 && (
              <div className="cast-section">
                <span className="eyebrow">THE PEOPLE</span>
                <h3>Featured cast</h3>
                <div className="cast-list">
                  {cast.map((person) => (
                    <div className="cast-person" key={person.id}>
                      <span className="cast-avatar">{person.name?.charAt(0) || "?"}</span>
                      <span><strong>{person.name}</strong><small>{person.character}</small></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="trailer-section" id="trailer">
            <div className="section-heading"><div><span className="eyebrow">TAKE A CLOSER LOOK</span><h2>Official trailer</h2></div></div>
            {trailer ? (
              <div className="trailer-frame">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
                  title={`${movie.title} official trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="trailer-placeholder">
                <span><Icon name="play" size={22} /></span>
                <strong>Something to look forward to</strong>
                <p>A trailer isn’t available for this title right now.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><Icon name="film" size={16} /></span>
          <span>Cine<span>Scope</span></span>
        </Link>
        <p>A little more wonder in your watchlist.</p>
        <span className="footer-credit">MOVIES, MADE PERSONAL <span>✳</span></span>
      </div>
      {useFavorites().storageError && (
        <p className="storage-warning">Your watchlist couldn’t be saved on this device. Check your browser storage settings.</p>
      )}
    </footer>
  );
}

export default function App() {
  return (
    <FavoritesProvider>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/movie/:id" element={<DetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </div>
    </FavoritesProvider>
  );
}

function NotFoundPage() {
  return (
    <main className="page-shell standard-page">
      <div className="empty-state">
        <span className="empty-icon"><Icon name="film" size={24} /></span>
        <h2>This scene isn’t in the script.</h2>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link className="button button-primary" to="/">Go to discover <Icon name="arrow" size={16} /></Link>
      </div>
    </main>
  );
}
