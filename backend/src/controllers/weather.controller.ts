import axios from "axios";
import { Request, Response } from "express";
import { getWeather } from "../services/weather.service";
import prisma from "../utils/prisma";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MAXIMUM_FORECAST_DAYS = 14;

const parseDateOnly = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

const getTodayUtc = (): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
};

const getDaysBetween = (startDate: Date, endDate: Date): number => {
  return Math.floor(
    (endDate.getTime() - startDate.getTime()) /
      DAY_IN_MILLISECONDS
  );
};

// SEARCH WEATHER + SAVE AUTOMATICALLY
export const searchWeather = async (
  req: Request,
  res: Response
) => {
  try {
    const { location, startDate, endDate } = req.body;

    // Validate location
    if (
      !location ||
      typeof location !== "string" ||
      location.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Location is required",
      });
    }

    // Validate that both date values were provided
    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return res.status(400).json({
        message:
          "startDate and endDate are required in YYYY-MM-DD format",
      });
    }

    const parsedStartDate = parseDateOnly(startDate);
    const parsedEndDate = parseDateOnly(endDate);

    // Validate date format and calendar dates
    if (!parsedStartDate || !parsedEndDate) {
      return res.status(400).json({
        message:
          "Dates must be valid calendar dates in YYYY-MM-DD format",
      });
    }

    // Validate order
    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({
        message:
          "The start date must be before or equal to the end date",
      });
    }

    const today = getTodayUtc();

    // Current forecast endpoint does not retrieve historical dates
    if (parsedStartDate < today) {
      return res.status(400).json({
        message: "The start date cannot be earlier than today",
      });
    }

    const requestedRangeLength =
      getDaysBetween(parsedStartDate, parsedEndDate) + 1;

    if (requestedRangeLength > MAXIMUM_FORECAST_DAYS) {
      return res.status(400).json({
        message: `The selected date range cannot exceed ${MAXIMUM_FORECAST_DAYS} days`,
      });
    }

    /*
     * Forecast days begin from today, not from startDate.
     *
     * Example:
     * Today: July 17
     * Start: July 19
     * End: July 21
     *
     * We must request July 17 through July 21,
     * then filter out July 17 and July 18.
     */
    const apiForecastDays =
      getDaysBetween(today, parsedEndDate) + 1;

    if (
      apiForecastDays < 1 ||
      apiForecastDays > MAXIMUM_FORECAST_DAYS
    ) {
      return res.status(400).json({
        message: `The end date must be within the next ${MAXIMUM_FORECAST_DAYS} days`,
      });
    }

    // 1. Get current weather and the required forecast period
    const weather = await getWeather(
      location.trim(),
      apiForecastDays
    );

    // Select only the dates requested by the user
    const selectedForecast =
      weather.forecast.forecastday.filter(
        (forecastDay: any) =>
          forecastDay.date >= startDate &&
          forecastDay.date <= endDate
      );

    if (selectedForecast.length === 0) {
      return res.status(404).json({
        message:
          "No forecast data was available for the selected date range",
      });
    }

    /*
     * Detect cases where the external API or subscription plan
     * returned fewer days than requested.
     */
    if (selectedForecast.length < requestedRangeLength) {
      return res.status(422).json({
        message:
          "The weather provider did not return the complete requested date range",
        requestedDays: requestedRangeLength,
        availableDays: selectedForecast.length,
      });
    }

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
    } else {
      /*
       * Refresh stored location details in case the external API
       * provides updated region or coordinate information.
       */
      savedLocation = await prisma.location.update({
        where: {
          id: savedLocation.id,
        },
        data: {
          region: weather.location.region || null,
          latitude: weather.location.lat,
          longitude: weather.location.lon,
        },
      });
    }

    // 4. Save the current weather snapshot and requested date range
    const weatherRequest = await prisma.weatherRequest.create({
      data: {
        locationId: savedLocation.id,

        startDate: parsedStartDate,
        endDate: parsedEndDate,

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
          requestedStartDate: startDate,
          requestedEndDate: endDate,
        },
      },
    });

    // 5. Save only the forecast dates requested by the user
    await prisma.forecast.createMany({
      data: selectedForecast.map((forecastDay: any) => ({
        weatherRequestId: weatherRequest.id,
        date: new Date(
          `${forecastDay.date}T00:00:00.000Z`
        ),

        averageTemp: forecastDay.day.avgtemp_c,
        maxTemp: forecastDay.day.maxtemp_c,
        minTemp: forecastDay.day.mintemp_c,

        humidity: forecastDay.day.avghumidity,
        windSpeed: forecastDay.day.maxwind_kph,
        chanceOfRain:
          forecastDay.day.daily_chance_of_rain,

        condition: forecastDay.day.condition.text,
        icon: forecastDay.day.condition.icon,
      })),
    });

    // 6. Return a clean response to the frontend
    return res.status(201).json({
      requestId: weatherRequest.id,
      savedToDatabase: true,

      requestedDateRange: {
        startDate,
        endDate,
        numberOfDays: requestedRangeLength,
      },

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

      forecast: selectedForecast.map(
        (forecastDay: any) => ({
          date: forecastDay.date,
          averageTemperatureC:
            forecastDay.day.avgtemp_c,
          maximumTemperatureC:
            forecastDay.day.maxtemp_c,
          minimumTemperatureC:
            forecastDay.day.mintemp_c,
          humidity: forecastDay.day.avghumidity,
          maximumWindKph:
            forecastDay.day.maxwind_kph,
          chanceOfRain:
            forecastDay.day.daily_chance_of_rain,
          condition:
            forecastDay.day.condition.text,
          icon: forecastDay.day.condition.icon,
        })
      ),
    });
  } catch (error: unknown) {
    console.error("Search weather error:", error);

    if (axios.isAxiosError(error)) {
      const apiStatus = error.response?.status;
      const apiMessage =
        error.response?.data?.error?.message;

      if (apiStatus === 400) {
        return res.status(404).json({
          message:
            apiMessage ||
            "The requested location could not be found",
        });
      }

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          message:
            "The weather service took too long to respond",
        });
      }

      return res.status(502).json({
        message:
          apiMessage ||
          "The external weather service is currently unavailable",
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to search weather",
      error: message,
    });
  }
};

// READ ALL SAVED SEARCHES
export const getHistory = async (
  _req: Request,
  res: Response
) => {
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
  } catch (error: unknown) {
    console.error("Get history error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to retrieve search history",
      error: message,
    });
  }
};

// READ ONE SAVED SEARCH
export const getSearchById = async (
  req: Request,
  res: Response
) => {
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
  } catch (error: unknown) {
    console.error("Get search error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to retrieve weather search",
      error: message,
    });
  }
};

// UPDATE ONE SAVED SEARCH
export const updateSearch = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid search ID",
      });
    }

    const existingRecord =
      await prisma.weatherRequest.findUnique({
        where: {
          id,
        },
        include: {
          location: true,
          forecasts: true,
        },
      });

    if (!existingRecord) {
      return res.status(404).json({
        message: "Search not found",
      });
    }

    const { location, startDate, endDate } = req.body;

    if (
      typeof location !== "string" ||
      location.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Location is required",
      });
    }

    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return res.status(400).json({
        message:
          "startDate and endDate are required in YYYY-MM-DD format",
      });
    }

    const parsedStartDate = parseDateOnly(startDate);
    const parsedEndDate = parseDateOnly(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      return res.status(400).json({
        message:
          "Dates must be valid calendar dates in YYYY-MM-DD format",
      });
    }

    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({
        message:
          "The start date must be before or equal to the end date",
      });
    }

    const today = getTodayUtc();

    if (parsedStartDate < today) {
      return res.status(400).json({
        message: "The start date cannot be earlier than today",
      });
    }

    const requestedRangeLength =
      getDaysBetween(parsedStartDate, parsedEndDate) + 1;

    if (requestedRangeLength > MAXIMUM_FORECAST_DAYS) {
      return res.status(400).json({
        message: `The selected date range cannot exceed ${MAXIMUM_FORECAST_DAYS} days`,
      });
    }

    const apiForecastDays =
      getDaysBetween(today, parsedEndDate) + 1;

    if (
      apiForecastDays < 1 ||
      apiForecastDays > MAXIMUM_FORECAST_DAYS
    ) {
      return res.status(400).json({
        message: `The end date must be within the next ${MAXIMUM_FORECAST_DAYS} days`,
      });
    }

    // Retrieve fresh weather information
    const weather = await getWeather(
      location.trim(),
      apiForecastDays
    );

    const selectedForecast =
      weather.forecast.forecastday.filter(
        (forecastDay: any) =>
          forecastDay.date >= startDate &&
          forecastDay.date <= endDate
      );

    if (selectedForecast.length === 0) {
      return res.status(404).json({
        message:
          "No forecast data was available for the selected date range",
      });
    }

    if (selectedForecast.length < requestedRangeLength) {
      return res.status(422).json({
        message:
          "The weather provider did not return the complete requested date range",
        requestedDays: requestedRangeLength,
        availableDays: selectedForecast.length,
      });
    }

    // Find or create the updated location
    let savedLocation = await prisma.location.findUnique({
      where: {
        city_country: {
          city: weather.location.name,
          country: weather.location.country,
        },
      },
    });

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
    } else {
      savedLocation = await prisma.location.update({
        where: {
          id: savedLocation.id,
        },
        data: {
          region: weather.location.region || null,
          latitude: weather.location.lat,
          longitude: weather.location.lon,
        },
      });
    }

    /*
     * Use a database transaction so all update operations succeed
     * together. If one operation fails, all changes are rolled back.
     */
    const updatedRecord = await prisma.$transaction(
      async (transaction) => {
        // Remove the old forecast records
        await transaction.forecast.deleteMany({
          where: {
            weatherRequestId: id,
          },
        });

        // Update the main weather request
        await transaction.weatherRequest.update({
          where: {
            id,
          },
          data: {
            locationId: savedLocation.id,

            startDate: parsedStartDate,
            endDate: parsedEndDate,

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
              precipitationMm:
                weather.current.precip_mm,
              windDirection: weather.current.wind_dir,
              requestedStartDate: startDate,
              requestedEndDate: endDate,
            },
          },
        });

        // Save the replacement forecasts
        await transaction.forecast.createMany({
          data: selectedForecast.map(
            (forecastDay: any) => ({
              weatherRequestId: id,
              date: new Date(
                `${forecastDay.date}T00:00:00.000Z`
              ),

              averageTemp:
                forecastDay.day.avgtemp_c,
              maxTemp: forecastDay.day.maxtemp_c,
              minTemp: forecastDay.day.mintemp_c,

              humidity:
                forecastDay.day.avghumidity,
              windSpeed:
                forecastDay.day.maxwind_kph,
              chanceOfRain:
                forecastDay.day.daily_chance_of_rain,

              condition:
                forecastDay.day.condition.text,
              icon: forecastDay.day.condition.icon,
            })
          ),
        });

        // Return the complete updated record
        return transaction.weatherRequest.findUnique({
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
      }
    );

    return res.status(200).json({
      message: "Weather search updated successfully",
      record: updatedRecord,
    });
  } catch (error: unknown) {
    console.error("Update search error:", error);

    if (axios.isAxiosError(error)) {
      const apiStatus = error.response?.status;
      const apiMessage =
        error.response?.data?.error?.message;

      if (apiStatus === 400) {
        return res.status(404).json({
          message:
            apiMessage ||
            "The requested location could not be found",
        });
      }

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          message:
            "The weather service took too long to respond",
        });
      }

      return res.status(502).json({
        message:
          apiMessage ||
          "The external weather service is currently unavailable",
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to update weather search",
      error: message,
    });
  }
};

// DELETE ONE SAVED SEARCH
export const deleteSearch = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid search ID",
      });
    }

    const existingRecord =
      await prisma.weatherRequest.findUnique({
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
  } catch (error: unknown) {
    console.error("Delete search error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to delete weather search",
      error: message,
    });
  }
};

// EXPORT ALL SAVED SEARCHES AS CSV
export const exportHistoryCsv = async (
  _req: Request,
  res: Response
) => {
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

    type CsvValue =
      | string
      | number
      | boolean
      | null
      | undefined;

    const escapeCsvValue = (value: CsvValue): string => {
      if (value === null || value === undefined) {
        return "";
      }

      const stringValue = String(value);

      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const headers: string[] = [
      "Search ID",
      "City",
      "Region",
      "Country",
      "Latitude",
      "Longitude",
      "Start Date",
      "End Date",
      "Searched At",
      "Temperature C",
      "Feels Like C",
      "Humidity",
      "Wind Speed KPH",
      "Condition",
      "UV Index",
      "Pressure MB",
      "Visibility KM",
      "Forecast Date",
      "Average Temperature C",
      "Maximum Temperature C",
      "Minimum Temperature C",
      "Forecast Humidity",
      "Maximum Wind KPH",
      "Chance Of Rain",
      "Forecast Condition",
      "Forecast Icon",
    ];

    const rows: CsvValue[][] = [];

    for (const weatherRequest of history) {
      const commonValues: CsvValue[] = [
        weatherRequest.id,
        weatherRequest.location.city,
        weatherRequest.location.region,
        weatherRequest.location.country,
        weatherRequest.location.latitude,
        weatherRequest.location.longitude,
        weatherRequest.startDate.toISOString().slice(0, 10),
        weatherRequest.endDate.toISOString().slice(0, 10),
        weatherRequest.searchedAt.toISOString(),
        weatherRequest.temperature,
        weatherRequest.feelsLike,
        weatherRequest.humidity,
        weatherRequest.windSpeed,
        weatherRequest.condition,
        weatherRequest.uvIndex,
        weatherRequest.pressure,
        weatherRequest.visibility,
      ];

      if (weatherRequest.forecasts.length > 0) {
        for (const forecast of weatherRequest.forecasts) {
          rows.push([
            ...commonValues,
            forecast.date.toISOString().slice(0, 10),
            forecast.averageTemp,
            forecast.maxTemp,
            forecast.minTemp,
            forecast.humidity,
            forecast.windSpeed,
            forecast.chanceOfRain,
            forecast.condition,
            forecast.icon,
          ]);
        }
      } else {
        rows.push([
          ...commonValues,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
      }
    }

    const csvLines = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ];

    const csvContent = csvLines.join("\r\n");

    const fileDate = new Date()
      .toISOString()
      .slice(0, 10);

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="weather-history-${fileDate}.csv"`
    );

    return res
      .status(200)
      .send(`\uFEFF${csvContent}`);
  } catch (error: unknown) {
    console.error("Export CSV error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message: "Failed to export weather history",
      error: message,
    });
  }
};