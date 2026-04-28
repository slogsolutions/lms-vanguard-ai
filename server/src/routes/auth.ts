import { Router } from "express";
import { signUp, login, logout, getAllUsers, getProfile } from "../controllers/authController.js";
import { protectRoute, adminOnly } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", protectRoute, adminOnly, signUp);
router.post("/login", login);
router.post("/logout", logout);
router.get("/users", protectRoute, adminOnly, getAllUsers);
router.get("/profile", protectRoute, getProfile);

export default router;
