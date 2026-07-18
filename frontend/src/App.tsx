import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteWeatherSearch,
  getCsvExportUrl,
  getTravelVideos,
  getWeatherHistory,
  searchWeather,
  updateWeatherSearch,
} from "./services/weatherApi";
import type { TravelVideo } from "./services/weatherApi";

import "./App.css";

function App() {
  const today = new Date().toISOString().slice(0, 10);

  const [location, setLocation] = useState("");
  const [locating, setLocating] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [weather, setWeather] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [videos, setVideos] = useState<TravelVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");

  const loadHistory = async () => {
    try {
      const data = await getWeatherHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (historyError) {
      console.error("Failed to load history:", historyError);
      setError("Could not load search history");
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setLocation("");
    setStartDate(today);
    setEndDate(today);
  };

  const handleCancelEdit = () => {
    resetForm();
    setError("");
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setLocation(item.location?.city ?? "");
    setStartDate(
      item.startDate
        ? new Date(item.startDate).toISOString().slice(0, 10)
        : today
    );
    setEndDate(
      item.endDate
        ? new Date(item.endDate).toISOString().slice(0, 10)
        : today
    );
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    try {
      setError("");
      await deleteWeatherSearch(id);

      if (editingId === id) {
        resetForm();
      }

      await loadHistory();
    } catch (deleteError: any) {
      console.error("Failed to delete search:", deleteError);
      setError(
        deleteError.response?.data?.message ||
          "Could not delete search"
      );
    }
  };

  const handleExportCsv = () => {
    window.open(getCsvExportUrl(), "_blank");
  };

  const loadTravelVideos = async (searchedLocation: string) => {
    try {
      setVideosLoading(true);
      setVideosError("");

      const data = await getTravelVideos(searchedLocation);
      setVideos(data);
    } catch (videoError: any) {
      console.error("Failed to retrieve travel videos:", videoError);
      setVideos([]);
      setVideosError(
        videoError.response?.data?.message ||
          "Could not retrieve travel videos"
      );
    } finally {
      setVideosLoading(false);
    }
  };

  const handleSearch = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select a start date and end date");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const input = {
        location: location.trim(),
        startDate,
        endDate,
      };

      if (editingId !== null) {
        await updateWeatherSearch(editingId, input);
        await loadHistory();
        resetForm();
      } else {
        setVideos([]);
        setVideosError("");

        const data = await searchWeather(input);
        setWeather(data);

        const resolvedLocation = [
          data.location?.city,
          data.location?.region,
          data.location?.country,
        ]
          .filter(Boolean)
          .join(", ");

        await Promise.all([
          loadHistory(),
          loadTravelVideos(resolvedLocation || input.location),
        ]);

        resetForm();
      }
    } catch (requestError: any) {
      console.error("Weather request failed:", requestError);

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not save weather search"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude},${longitude}`);
        setLocating(false);
      },
      (geolocationError) => {
        console.error("Geolocation error:", geolocationError);

        let message = "Could not retrieve your location";

        if (
          geolocationError.code ===
          geolocationError.PERMISSION_DENIED
        ) {
          message = "Location permission was denied";
        }

        if (
          geolocationError.code ===
          geolocationError.POSITION_UNAVAILABLE
        ) {
          message = "Your location is currently unavailable";
        }

        if (
          geolocationError.code === geolocationError.TIMEOUT
        ) {
          message = "Location request timed out";
        }

        setError(message);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const locationDate = useMemo(() => {
    const localtime = weather?.location?.localtime;

    if (!localtime) {
      return new Date();
    }

    const parsed = new Date(localtime.replace(" ", "T"));

    return Number.isNaN(parsed.getTime())
      ? new Date()
      : parsed;
  }, [weather?.location?.localtime]);

  const displayDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(locationDate);
  }, [locationDate]);

  const displayTime = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(locationDate);
  }, [locationDate]);

  /*
   * Your backend returns the current condition icon at:
   * weather.current.icon
   */
  const currentWeatherIcon =
    weather?.current?.icon || "";

  /*
   * The backend does not currently return WeatherAPI's is_day field.
   * Derive the visual day/night theme from location.localtime instead.
   */
  const locationHour = weather?.location?.localtime
    ? Number(
        weather.location.localtime
          .split(" ")[1]
          ?.split(":")[0]
      )
    : new Date().getHours();

  const dashboardTheme =
    locationHour >= 6 && locationHour < 18
      ? "dashboard-day"
      : "dashboard-night";

  return (
    <main className="app-shell">
      <section className={`weather-dashboard ${dashboardTheme}`}>
        <div className="dashboard-overlay" />

        <div className="dashboard-content">
          <header className="topbar">
            <div className="location-heading">
              <p className="eyebrow">Weather dashboard</p>
              <h1>
                {weather?.location?.city || "Search a city"}
              </h1>
              <p>
                {weather?.location?.country
                  ? `${weather.location.country} · ${displayDate}`
                  : displayDate}
              </p>
            </div>

            <form className="search-panel" onSubmit={handleSearch}>
              <div className="search-row">
                <input
                  className="city-input"
                  type="text"
                  placeholder="Enter city name"
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                />

                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? editingId !== null
                      ? "Updating..."
                      : "Searching..."
                    : editingId !== null
                      ? "Update"
                      : "Search"}
                </button>

                <button
                  className="icon-button"
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating || loading}
                  title="Use my current location"
                  aria-label="Use my current location"
                >
                  {locating ? "…" : "⌖"}
                </button>
              </div>

              <div className="date-row">
                <label>
                  <span>Start date</span>
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>End date</span>
                  <input
                    type="date"
                    min={startDate || today}
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                  />
                </label>

                {editingId !== null && (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </header>

          {error && <p className="error-banner">{error}</p>}

          {weather?.location && weather?.current ? (
            <>
              <section className="current-weather-grid">
                <div className="temperature-block">
                  <div className="temperature-line">
                    <span className="temperature-value">
                      {weather.current.temperatureC}
                    </span>
                    <span className="temperature-unit">°C</span>
                  </div>
                  <h2>{weather.current.condition}</h2>

                  {weather.requestedDateRange && (
                    <p className="date-range-copy">
                      Forecast from {weather.requestedDateRange.startDate}
                      {" "}to {weather.requestedDateRange.endDate}
                    </p>
                  )}
                </div>

                <div className="hero-weather-icon">
                  {currentWeatherIcon ? (
                    <div className="current-icon-frame">
                      <img
                        src={
                          currentWeatherIcon.startsWith("http")
                            ? currentWeatherIcon
                            : currentWeatherIcon.startsWith("//")
                              ? `https:${currentWeatherIcon}`
                              : currentWeatherIcon
                        }
                        alt={weather.current.condition}
                        width="96"
                        height="96"
                      />
                    </div>
                  ) : (
                    <div
                      className="fallback-weather-icon"
                      aria-label={weather.current.condition}
                      title={weather.current.condition}
                    >
                      ☁
                    </div>
                  )}
                </div>

                <div className="weather-metrics">
                  <div className="metric-row">
                    <span className="metric-icon">🌡</span>
                    <div>
                      <span>Feels like</span>
                      <strong>
                        {weather.current.feelsLikeC ?? "—"}°C
                      </strong>
                    </div>
                  </div>

                  <div className="metric-row">
                    <span className="metric-icon">💧</span>
                    <div>
                      <span>Humidity</span>
                      <strong>{weather.current.humidity}%</strong>
                    </div>
                  </div>

                  <div className="metric-row">
                    <span className="metric-icon">〰</span>
                    <div>
                      <span>Wind</span>
                      <strong>
                        {weather.current.windSpeedKph} km/h
                      </strong>
                    </div>
                  </div>

                  <div className="metric-row">
                    <span className="metric-icon">☀</span>
                    <div>
                      <span>UV index</span>
                      <strong>{weather.current.uv ?? "—"}</strong>
                    </div>
                  </div>

                  <div className="metric-row">
                    <span className="metric-icon">◴</span>
                    <div>
                      <span>Pressure</span>
                      <strong>
                        {weather.current.pressureMb ?? "—"} mb
                      </strong>
                    </div>
                  </div>

                  <div className="metric-row">
                    <span className="metric-icon">◉</span>
                    <div>
                      <span>Visibility</span>
                      <strong>
                        {weather.current.visibilityKm ?? "—"} km
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {Array.isArray(weather.forecast) && (
                <section className="forecast-panel">
                  <div className="section-heading-row">
                    <div>
                      <p className="eyebrow">Upcoming weather</p>
                      <h2>Forecast</h2>
                    </div>
                  </div>

                  <div className="forecast-grid">
                    {weather.forecast.map((day: any) => (
                      <article className="forecast-card" key={day.date}>
                        <p className="forecast-date">
                          {new Date(day.date).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </p>

                        {day.icon && (
                          <img
                            src={
                              day.icon.startsWith("http")
                                ? day.icon
                                : `https:${day.icon}`
                            }
                            alt={day.condition}
                          />
                        )}

                        <h3>
                          {day.maximumTemperatureC}° · {day.minimumTemperatureC}°
                        </h3>
                        <p className="forecast-condition">
                          {day.condition}
                        </p>

                        <div className="forecast-details">
                          <span>Avg {day.averageTemperatureC}°C</span>
                          <span>Humidity {day.humidity}%</span>
                          <span>Rain {day.chanceOfRain}%</span>
                          <span>Wind {day.maximumWindKph} km/h</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="empty-state">
              <div className="empty-icon">☁</div>
              <h2>Your weather will appear here</h2>
              <p>
                Search by city or use your current location to begin.
              </p>
            </section>
          )}
        </div>
      </section>

      {weather?.location && (
        <section className="content-section video-section">
          <div className="section-title-bar">
            <div>
              <p className="section-kicker">Travel inspiration</p>
              <h2>Explore {weather.location.city || "the area"}</h2>
            </div>
          </div>

          {videosLoading && (
            <div className="status-card">Finding travel videos...</div>
          )}

          {videosError && (
            <div className="status-card error-card">{videosError}</div>
          )}

          {!videosLoading &&
            !videosError &&
            videos.length === 0 && (
              <div className="status-card">No travel videos found.</div>
            )}

          {videos.length > 0 && (
            <div className="video-grid">
              {videos.map((video) => (
                <article className="video-card" key={video.videoId}>
                  <a
                    className="video-thumbnail-link"
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                    />
                    <span className="play-button">▶</span>
                  </a>

                  <div className="video-card-body">
                    <p className="video-channel">
                      {video.channelTitle}
                    </p>
                    <h3>{video.title}</h3>
                    {video.description && (
                      <p className="video-description">
                        {video.description}
                      </p>
                    )}
                    <a
                      className="text-link"
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch on YouTube →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="content-section history-section">
        <div className="section-title-bar">
          <div>
            <p className="section-kicker">Saved activity</p>
            <h2>Search History</h2>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={handleExportCsv}
            disabled={history.length === 0}
          >
            Export CSV
          </button>
        </div>

        {history.length === 0 ? (
          <div className="status-card">No previous searches.</div>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <article className="history-card" key={item.id}>
                <div>
                  <p className="history-location">
                    {item.location?.city}, {item.location?.country}
                  </p>
                  <p className="history-date">
                    {item.startDate && item.endDate
                      ? `${new Date(
                          item.startDate
                        ).toLocaleDateString()} – ${new Date(
                          item.endDate
                        ).toLocaleDateString()}`
                      : "Date range unavailable"}
                  </p>
                </div>

                <div className="history-weather-summary">
                  <strong>{item.temperature}°C</strong>
                  <span>{item.condition}</span>
                </div>

                <p className="history-timestamp">
                  Searched {new Date(item.searchedAt).toLocaleString()}
                </p>

                <div className="history-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
              
          </div>
        )}
      </section>
      <footer className="app-footer">
  <div className="footer-content">

    <h3>Weather Dashboard</h3>

    <p className="footer-author">
      Developed by <strong>Aeiman Imtiaz</strong>
    </p>

    <h4>About Product Manager Accelerator</h4>

    <p>
      The Product Manager Accelerator Program is designed to support PM professionals
      through every stage of their careers. From students looking for entry-level jobs
      to Directors looking to take on leadership roles, the program has helped hundreds
      of students fulfill their career aspirations.
    </p>

    <p>
      The Product Manager Accelerator community is ambitious and committed.
      Through the program members develop practical Product Management
      and leadership skills that provide a strong foundation for future
      career growth.
    </p>

    <p className="copyright">
      © {new Date().getFullYear()} Aeiman Imtiaz
    </p>

  </div>
</footer>
    </main>
  );
}

export default App;