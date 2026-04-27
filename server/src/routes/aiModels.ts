import { Router } from "express";
import { getAllModels, createModel } from "../controllers/aiModelController.js";
import { protectRoute, adminOnly } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/models", protectRoute, getAllModels);
router.post("/models", protectRoute, adminOnly, createModel);

export default router;
