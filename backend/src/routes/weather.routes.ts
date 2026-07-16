import express from "express";

import {
    currentWeather,
    forecastWeather
} from "../controllers/weather.controller";


const router = express.Router();


router.get(
    "/current",
    currentWeather
);


router.get(
    "/forecast",
    forecastWeather
);


export default router;