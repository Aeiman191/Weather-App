import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { getWeather } from "../services/weather.service";

// SEARCH WEATHER + SAVE AUTOMATICALLY
export const searchWeather = async (req: Request, res: Response) => {
  try {
    const { location } = req.body;

    if (
      !location ||
      typeof location !== "string" ||
      location.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Location is required",
      });
    }

    // 1. Get current weather and 5-day forecast
    const weather = await getWeather(location.trim());

    // 2. Find an existing location
    let savedLocation = await prisma.location.findUnique({
      where: {
        city_country: {
          city: weather.location.name,
          country: weather.location.country,
        },
      },
    });

    // 3. Create the location if it does not exist
    if (!savedLocation) {
      savedLocation = await prisma.location.create({
        data: {
          city: weather.location.name,
          region: weather.location.region || null,
          country: weather.location.country,
          latitude: weather.location.lat,
          longitude: weather.location.lon,
        },
      });
    }

    // 4. Save the current weather snapshot
    const weatherRequest = await prisma.weatherRequest.create({
      data: {
        locationId: savedLocation.id,

        temperature: weather.current.temp_c,
        humidity: weather.current.humidity,
        windSpeed: weather.current.wind_kph,
        condition: weather.current.condition.text,

        feelsLike: weather.current.feelslike_c,
        uvIndex: weather.current.uv,
        pressure: weather.current.pressure_mb,
        visibility: weather.current.vis_km,

        rawData: {
          localtime: weather.location.localtime,
          icon: weather.current.condition.icon,
          cloud: weather.current.cloud,
          precipitationMm: weather.current.precip_mm,
          windDirection: weather.current.wind_dir,
        },
      },
    });

    // 5. Save the 5-day forecast
    await prisma.forecast.createMany({
      data: weather.forecast.forecastday.map((forecastDay: any) => ({
        weatherRequestId: weatherRequest.id,
        date: new Date(forecastDay.date),

        averageTemp: forecastDay.day.avgtemp_c,
        maxTemp: forecastDay.day.maxtemp_c,
        minTemp: forecastDay.day.mintemp_c,

        humidity: forecastDay.day.avghumidity,
        windSpeed: forecastDay.day.maxwind_kph,
        chanceOfRain: forecastDay.day.daily_chance_of_rain,

        condition: forecastDay.day.condition.text,
        icon: forecastDay.day.condition.icon,
      })),
    });

    // 6. Return a clean response to the frontend
    return res.status(201).json({
      requestId: weatherRequest.id,
      savedToDatabase: true,

      location: {
        city: weather.location.name,
        region: weather.location.region,
        country: weather.location.country,
        latitude: weather.location.lat,
        longitude: weather.location.lon,
        localtime: weather.location.localtime,
      },

      current: {
        temperatureC: weather.current.temp_c,
        feelsLikeC: weather.current.feelslike_c,
        humidity: weather.current.humidity,
        windSpeedKph: weather.current.wind_kph,
        condition: weather.current.condition.text,
        icon: weather.current.condition.icon,
        uv: weather.current.uv,
        pressureMb: weather.current.pressure_mb,
        visibilityKm: weather.current.vis_km,
      },

      forecast: weather.forecast.forecastday.map((forecastDay: any) => ({
        date: forecastDay.date,
        averageTemperatureC: forecastDay.day.avgtemp_c,
        maximumTemperatureC: forecastDay.day.maxtemp_c,
        minimumTemperatureC: forecastDay.day.mintemp_c,
        humidity: forecastDay.day.avghumidity,
        maximumWindKph: forecastDay.day.maxwind_kph,
        chanceOfRain: forecastDay.day.daily_chance_of_rain,
        condition: forecastDay.day.condition.text,
        icon: forecastDay.day.condition.icon,
      })),
    });
  } catch (error: any) {
    console.error("Search weather error:", error);

    return res.status(500).json({
      message: "Failed to search weather",
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error",
    });
  }
};

// READ ALL SAVED SEARCHES
export const getHistory = async (_req: Request, res: Response) => {
  try {
    const history = await prisma.weatherRequest.findMany({
      include: {
        location: true,
        forecasts: {
          orderBy: {
            date: "asc",
          },
        },
      },
      orderBy: {
        searchedAt: "desc",
      },
    });

    return res.status(200).json(history);
  } catch (error: any) {
    console.error("Get history error:", error);

    return res.status(500).json({
      message: "Failed to retrieve search history",
      error: error.message,
    });
  }
};

// READ ONE SAVED SEARCH
export const getSearchById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid search ID",
      });
    }

    const record = await prisma.weatherRequest.findUnique({
      where: {
        id,
      },
      include: {
        location: true,
        forecasts: {
          orderBy: {
            date: "asc",
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({
        message: "Search not found",
      });
    }

    return res.status(200).json(record);
  } catch (error: any) {
    console.error("Get search error:", error);

    return res.status(500).json({
      message: "Failed to retrieve weather search",
      error: error.message,
    });
  }
};

// DELETE ONE SAVED SEARCH
export const deleteSearch = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid search ID",
      });
    }

    const existingRecord = await prisma.weatherRequest.findUnique({
      where: {
        id,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        message: "Search not found",
      });
    }

    await prisma.weatherRequest.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Search deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete search error:", error);

    return res.status(500).json({
      message: "Failed to delete weather search",
      error: error.message,
    });
  }
};