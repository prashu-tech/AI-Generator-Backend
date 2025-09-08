// routes/conversationRoutes.js
import { Router } from 'express';
import { 
  getUserConversations, 
  getConversation, 
  createConversation,
  addMessage,
  deleteConversation 
} from '../controllers/conversationController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.route('/').get(verifyToken, getUserConversations);
router.route('/create').post(verifyToken, createConversation);
router.route('/:sessionId').get(verifyToken, getConversation);
router.route('/:sessionId/message').post(verifyToken, addMessage);
router.route('/:sessionId').delete(verifyToken, deleteConversation);

export default router;
