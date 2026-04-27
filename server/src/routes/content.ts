import { Router } from "express";
import { 
    getAllContent, 
    getContentById, 
    createContent, 
    updateContent, 
    deleteContent,
    updateProgress 
} from "../controllers/contentController.js";
import { protectRoute, adminOnly } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/content", protectRoute, getAllContent);
router.get("/content/:id", protectRoute, getContentById);
router.post("/content/:id/progress", protectRoute, updateProgress);

// Management actions (Accessible to both for this requirement)
router.post("/content", protectRoute, createContent);
router.put("/content/:id", protectRoute, updateContent);
router.delete("/content/:id", protectRoute, deleteContent);

export default router;
