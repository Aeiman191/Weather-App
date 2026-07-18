import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  deleteWeatherSearch,
  getCsvExportUrl,
  getWeatherHistory,
  searchWeather,
  updateWeatherSearch,
} from "./services/weatherApi";

function App() {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const [location, setLocation] = useState("");
  const [locating, setLocating] = useState(false);
  const [startDate, setStartDate] =
    useState(today);
  const [endDate, setEndDate] =
    useState(today);

  const [weather, setWeather] =
    useState<any>(null);
  const [history, setHistory] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const loadHistory = async () => {
    try {
      const data =
        await getWeatherHistory();

      setHistory(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Failed to load history:",
        error
      );

      setError(
        "Could not load search history"
      );
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

    setLocation(
      item.location?.city ?? ""
    );

    setStartDate(
      item.startDate
        ? new Date(item.startDate)
            .toISOString()
            .slice(0, 10)
        : today
    );

    setEndDate(
      item.endDate
        ? new Date(item.endDate)
            .toISOString()
            .slice(0, 10)
        : today
    );

    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (
    id: number
  ) => {
    try {
      setError("");

      await deleteWeatherSearch(id);

      if (editingId === id) {
        resetForm();
      }

      await loadHistory();
    } catch (error: any) {
      console.error(
        "Failed to delete search:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Could not delete search";

      setError(message);
    }
  };

  const handleExportCsv = () => {
    window.open(
      getCsvExportUrl(),
      "_blank"
    );
  };

  const handleSearch = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!location.trim()) {
      setError(
        "Please enter a location"
      );
      return;
    }

    if (!startDate || !endDate) {
      setError(
        "Please select a start date and end date"
      );
      return;
    }

    if (startDate > endDate) {
      setError(
        "Start date cannot be after end date"
      );
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
        await updateWeatherSearch(
          editingId,
          input
        );

        await loadHistory();
        resetForm();
      } else {
        const data =
          await searchWeather(input);

        setWeather(data);

        await loadHistory();
        resetForm();
      }
    } catch (error: any) {
      console.error(
        "Weather request failed:",
        error
      );

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Could not save weather search";

      setError(message);
    } finally {
      setLoading(false);
    }
  };


  const handleUseMyLocation = () => {
  if (!navigator.geolocation) {
    setError(
      "Geolocation is not supported by this browser"
    );
    return;
  }

  setLocating(true);
  setError("");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } =
        position.coords;

      /*
       * WeatherAPI accepts coordinates in this format:
       * "latitude,longitude"
       */
      setLocation(`${latitude},${longitude}`);
      setLocating(false);
    },
    (geolocationError) => {
      console.error(
        "Geolocation error:",
        geolocationError
      );

      let message =
        "Could not retrieve your location";

      if (
        geolocationError.code ===
        geolocationError.PERMISSION_DENIED
      ) {
        message =
          "Location permission was denied";
      }

      if (
        geolocationError.code ===
        geolocationError.POSITION_UNAVAILABLE
      ) {
        message =
          "Your location is currently unavailable";
      }

      if (
        geolocationError.code ===
        geolocationError.TIMEOUT
      ) {
        message =
          "Location request timed out";
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

  return (
    <main>
      <h1>Weather Application</h1>

      <form onSubmit={handleSearch}>
        <div>
          <label htmlFor="location">
            Location
          </label>

          <input
            id="location"
            type="text"
            placeholder="Enter a city"
            value={location}
            onChange={(event) =>
              setLocation(
                event.target.value
              )
            }
          />
          <button
  type="button"
  onClick={handleUseMyLocation}
  disabled={locating || loading}
>
  {locating
    ? "Finding location..."
    : "Use My Location"}
</button>
        </div>

        <div>
          <label htmlFor="startDate">
            Start date
          </label>

          <input
            id="startDate"
            type="date"
            min={today}
            value={startDate}
            onChange={(event) =>
              setStartDate(
                event.target.value
              )
            }
          />
        </div>

        <div>
          <label htmlFor="endDate">
            End date
          </label>

          <input
            id="endDate"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value
              )
            }
          />
        </div>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? editingId !== null
              ? "Updating..."
              : "Searching..."
            : editingId !== null
              ? "Update Search"
              : "Search"}
        </button>

        {editingId !== null && (
          <button
            type="button"
            onClick={
              handleCancelEdit
            }
            disabled={loading}
          >
            Cancel Edit
          </button>
        )}
      </form>

      {error && (
        <p role="alert">{error}</p>
      )}

      {weather?.location &&
        weather?.current && (
          <section>
            <h2>
              {weather.location.city},{" "}
              {
                weather.location
                  .country
              }
            </h2>

            {weather.requestedDateRange && (
              <p>
                Forecast from{" "}
                {
                  weather
                    .requestedDateRange
                    .startDate
                }{" "}
                to{" "}
                {
                  weather
                    .requestedDateRange
                    .endDate
                }
              </p>
            )}

            <p>
              Temperature:{" "}
              {
                weather.current
                  .temperatureC
              }
              °C
            </p>

            <p>
              Condition:{" "}
              {
                weather.current
                  .condition
              }
            </p>

            <p>
              Humidity:{" "}
              {
                weather.current
                  .humidity
              }
              %
            </p>

            <p>
              Wind:{" "}
              {
                weather.current
                  .windSpeedKph
              }{" "}
              km/h
            </p>
          </section>
        )}

      {Array.isArray(
        weather?.forecast
      ) && (
        <section>
          <h2>Forecast</h2>

          <div>
            {weather.forecast.map(
              (day: any) => (
                <div key={day.date}>
                  <h3>
                    {day.date}
                  </h3>

                  {day.icon && (
                    <img
                      src={
                        day.icon.startsWith(
                          "http"
                        )
                          ? day.icon
                          : `https:${day.icon}`
                      }
                      alt={
                        day.condition
                      }
                    />
                  )}

                  <p>
                    {day.condition}
                  </p>

                  <p>
                    Max:{" "}
                    {
                      day.maximumTemperatureC
                    }
                    °C
                  </p>

                  <p>
                    Min:{" "}
                    {
                      day.minimumTemperatureC
                    }
                    °C
                  </p>

                  <p>
                    Average:{" "}
                    {
                      day.averageTemperatureC
                    }
                    °C
                  </p>

                  <p>
                    Humidity:{" "}
                    {day.humidity}%
                  </p>

                  <p>
                    Rain chance:{" "}
                    {
                      day.chanceOfRain
                    }
                    %
                  </p>

                  <p>
                    Wind:{" "}
                    {
                      day.maximumWindKph
                    }{" "}
                    km/h
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      )}

      <section>
        <div>
          <h2>Search History</h2>

          <button
            type="button"
            onClick={
              handleExportCsv
            }
            disabled={
              history.length === 0
            }
          >
            Export CSV
          </button>
        </div>

        {history.length === 0 ? (
          <p>
            No previous searches
          </p>
        ) : (
          <div>
            {history.map(
              (item) => (
                <div key={item.id}>
                  <h3>
                    {
                      item.location
                        ?.city
                    }
                    ,{" "}
                    {
                      item.location
                        ?.country
                    }
                  </h3>

                  {item.startDate &&
                    item.endDate && (
                      <p>
                        Date range:{" "}
                        {new Date(
                          item.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          item.endDate
                        ).toLocaleDateString()}
                      </p>
                    )}

                  <p>
                    Temperature:{" "}
                    {
                      item.temperature
                    }
                    °C
                  </p>

                  <p>
                    Condition:{" "}
                    {
                      item.condition
                    }
                  </p>

                  <p>
                    Searched:{" "}
                    {new Date(
                      item.searchedAt
                    ).toLocaleString()}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(
                        item
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(
                        item.id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;