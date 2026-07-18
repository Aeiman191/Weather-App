import axios from "axios";

const weatherApi = axios.create({
  baseURL: "http://localhost:5000/api/weather",
});

export interface WeatherSearchInput {
  location: string;
  startDate: string;
  endDate: string;
}

export const searchWeather = async (
  input: WeatherSearchInput
) => {
  const response = await weatherApi.post(
    "/search",
    input
  );

  return response.data;
};

export const getWeatherHistory = async () => {
  const response = await weatherApi.get(
    "/history"
  );

  return response.data;
};

export const getWeatherById = async (
  id: number
) => {
  const response = await weatherApi.get(
    `/${id}`
  );

  return response.data;
};

export const updateWeatherSearch = async (
  id: number,
  input: WeatherSearchInput
) => {
  const response = await weatherApi.patch(
    `/${id}`,
    input
  );

  return response.data;
};

export const deleteWeatherSearch = async (
  id: number
) => {
  const response = await weatherApi.delete(
    `/${id}`
  );

  return response.data;
};

export const getCsvExportUrl = () => {
  return `${weatherApi.defaults.baseURL}/export/csv`;
};