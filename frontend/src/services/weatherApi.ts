import axios from "axios";

const weatherApi = axios.create({
  baseURL: "http://localhost:5000/api/weather",
});

export const searchWeather = async (location: string) => {
  const response = await weatherApi.post("/search", {
    location,
  });

  return response.data;
};

export const getWeatherHistory = async () => {
  const response = await weatherApi.get("/history");

  return response.data;
};

export const getWeatherById = async (id: number) => {
  const response = await weatherApi.get(`/${id}`);

  return response.data;
};

export const deleteWeatherSearch = async (id: number) => {
  const response = await weatherApi.delete(`/${id}`);

  return response.data;
};