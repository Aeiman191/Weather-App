import { Request, Response } from "express";
import axios from "axios";

import {
  searchTravelVideos,
} from "../services/youtube.service";

export const getTravelVideos = async (
  req: Request,
  res: Response
) => {
  try {
    const location =
      typeof req.query.location === "string"
        ? req.query.location.trim()
        : "";

    if (!location) {
      return res.status(400).json({
        message: "Location is required",
      });
    }

    const rawLimit =
      typeof req.query.limit === "string"
        ? Number(req.query.limit)
        : 6;

    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 12)
      : 6;

    const videos = await searchTravelVideos(
      location,
      limit
    );

    return res.status(200).json({
      location,
      count: videos.length,
      videos,
    });
  } catch (error: unknown) {
    console.error(
      "YouTube video search error:",
      error
    );

    if (axios.isAxiosError(error)) {
      const status =
        error.response?.status ?? 502;

      const apiMessage =
        error.response?.data?.error?.message;

      return res.status(status).json({
        message:
          apiMessage ||
          "Failed to retrieve YouTube videos",
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return res.status(500).json({
      message:
        "Failed to retrieve YouTube videos",
      error: message,
    });
  }
};