import axios from "axios";

const WEATHER_API = "https://api.weatherapi.com/v1";

export const getWeather = async (
  location: string,
  days: number = 5
) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "WEATHER_API_KEY is missing from the environment variables"
    );
  }

  if (!location.trim()) {
    throw new Error("Location is required");
  }

  if (!Number.isInteger(days) || days < 1 || days > 14) {
    throw new Error(
      "Forecast days must be an integer between 1 and 14"
    );
  }

  const response = await axios.get(
    `${WEATHER_API}/forecast.json`,
    {
      params: {
        key: apiKey,
        q: location.trim(),
        days,
        aqi: "no",
        alerts: "no",
      },
      timeout: 10000,
    }
  );

  return response.data;
};