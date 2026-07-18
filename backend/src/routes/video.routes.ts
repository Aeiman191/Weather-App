import { Router } from "express";

import {
  getTravelVideos,
} from "../controllers/video.controller";

const router = Router();

router.get("/", getTravelVideos);

export default router;