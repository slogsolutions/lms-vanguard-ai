import { Router } from "express";
import { askAI, getMyChats, getChatMessages, deleteChat } from "../controllers/chatController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/chat", protectRoute, askAI);
router.get("/chats", protectRoute, getMyChats);
router.get("/chats/:id/messages", protectRoute, getChatMessages);
router.delete("/chats/:id", protectRoute, deleteChat);

export default router;
