import express from "express";

import {
  searchWeather,
  getHistory,
    getSearchById,
  updateSearch,
    deleteSearch,
  exportHistoryCsv,
} from "../controllers/weather.controller";

const router = express.Router();

// Search weather and automatically save to database
router.post("/search", searchWeather);

// Read all previous searches
router.get("/history", getHistory);

router.get("/export/csv", exportHistoryCsv);


// Read one search by ID
router.get("/:id", getSearchById);

// Update search
router.patch("/:id", updateSearch);

// Delete a search
router.delete("/:id", deleteSearch);


export default router;