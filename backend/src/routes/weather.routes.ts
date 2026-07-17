import express from "express";

import {
  searchWeather,
  getHistory,
  getSearchById,
  deleteSearch,
} from "../controllers/weather.controller";

const router = express.Router();

// Search weather and automatically save to database
router.post("/search", searchWeather);

// Read all previous searches
router.get("/history", getHistory);

// Read one search by ID
router.get("/:id", getSearchById);

// Delete a search
router.delete("/:id", deleteSearch);

export default router;