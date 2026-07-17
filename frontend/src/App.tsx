import { FormEvent, useEffect, useState } from "react";
import {
  deleteWeatherSearch,
  getWeatherHistory,
  searchWeather,
} from "./services/weatherApi";

function App() {
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);


  const loadHistory = async () => {
  try {
    const data = await getWeatherHistory();
    setHistory(data);
  } catch (error) {
    console.error("Failed to load history", error);
  }
  };

  const handleDelete = async (id: number) => {
  try {
    await deleteWeatherSearch(id);
    await loadHistory();
  } catch (error) {
    console.error("Failed to delete search", error);
    setError("Could not delete search");
  }
};

  useEffect(() => {
  loadHistory();
}, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await searchWeather(location);
      setWeather(data);
      await loadHistory();
    } catch (error) {
      console.error(error);
      setError("Could not retrieve weather");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Weather Application</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter a city"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p>{error}</p>}

      {weather && (
        <section>
          <h2>
            {weather.location.city}, {weather.location.country}
          </h2>

          <p>Temperature: {weather.current.temperatureC}°C</p>
          <p>Condition: {weather.current.condition}</p>
          <p>Humidity: {weather.current.humidity}%</p>
          <p>Wind: {weather.current.windSpeedKph} km/h</p>
        </section>
      )}


      {weather && (
  <>
    <h2>5-Day Forecast</h2>

    <div>
      {weather.forecast.map((day: any) => (
        <div key={day.date}>
          <h3>{day.date}</h3>

          <img
            src={`https:${day.icon}`}
            alt={day.condition}
          />

          <p>{day.condition}</p>

          <p>Max: {day.maximumTemperatureC}°C</p>
          <p>Min: {day.minimumTemperatureC}°C</p>
          <p>Average: {day.averageTemperatureC}°C</p>

          <p>Humidity: {day.humidity}%</p>

          <p>Rain Chance: {day.chanceOfRain}%</p>

          <p>Wind: {day.maximumWindKph} km/h</p>
        </div>
      ))}
    </div>
  </>
      )}
      <section>
  <h2>Search History</h2>

  {history.length === 0 ? (
    <p>No previous searches</p>
  ) : (
    <div>
      {history.map((item) => (
        <div key={item.id}>
          <h3>
            {item.location.city}, {item.location.country}
          </h3>

          <p>Temperature: {item.temperature}°C</p>
          <p>Condition: {item.condition}</p>
          <p>
            Searched: {new Date(item.searchedAt).toLocaleString()}
          </p>
          <button
            type="button"
            
            onClick={() => handleDelete(item.id)}
            >
            Delete
          </button>
          
        </div>
      ))}
    </div>
  )}
</section>
    </main>
  );
}

export default App;