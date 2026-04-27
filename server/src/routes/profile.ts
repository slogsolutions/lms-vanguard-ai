import { Router } from "express";
import { getProfile } from "../controllers/profileController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/profile", protectRoute, getProfile);

export default router;
