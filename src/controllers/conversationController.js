// controllers/conversationController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { Conversation } from '../models/conversation.js';
import { v4 as uuidv4 } from 'uuid';

// Get all conversations for a user with cursor-based pagination
export const getUserConversations = asyncHandler(async (req, res) => {
  const { after, limit = 20 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50); // Max 50 conversations per request

  // Build query
  let query = { 
    userId: req.user._id,
    isActive: true 
  };

  // Add cursor condition if 'after' is provided
  if (after) {
    query.lastActivity = { $lt: new Date(after) };
  }

  const conversations = await Conversation.find(query)
    .sort({ lastActivity: -1 })
    .select('sessionId title messages lastActivity createdAt')
    .limit(limitNum + 1); // Get one extra to check if there's more

  // Check if there are more conversations
  const hasMore = conversations.length > limitNum;
  const conversationsToReturn = hasMore ? conversations.slice(0, limitNum) : conversations;

  // Format for sidebar display
  const formattedConversations = conversationsToReturn.map(conv => ({
    sessionId: conv.sessionId,
    title: conv.title,
    lastMessage: conv.messages[conv.messages.length - 1]?.content || '',
    lastActivity: conv.lastActivity,
    messageCount: conv.messages.length,
    hasImage: conv.messages.some(msg => msg.imageUrl)
  }));

  // Prepare response with pagination
  const response = {
    success: true,
    conversations: formattedConversations,
    paging: {}
  };

  // Add nextCursor if there are more conversations
  if (hasMore && conversationsToReturn.length > 0) {
    const lastConversation = conversationsToReturn[conversationsToReturn.length - 1];
    response.paging.nextCursor = lastConversation.lastActivity.toISOString();
  } else {
    response.paging.nextCursor = null;
  }

  res.json(response);
});

// Get specific conversation messages
export const getConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const conversation = await Conversation.findOne({ 
    userId: req.user._id, 
    sessionId,
    isActive: true 
  });

  if (!conversation) {
    return res.status(404).json({ 
      success: false, 
      message: 'Conversation not found' 
    });
  }

  res.json({ 
    success: true, 
    conversation: {
      sessionId: conversation.sessionId,
      title: conversation.title,
      messages: conversation.messages
    }
  });
});

// Create new conversation
export const createConversation = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const sessionId = uuidv4();
  
  // Generate title from prompt (first 30 chars)
  const title = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;

  const conversation = new Conversation({
    userId: req.user._id,
    sessionId,
    title,
    messages: [{
      role: 'user',
      content: prompt,
      timestamp: new Date()
    }],
    lastActivity: new Date()
  });

  await conversation.save();

  res.json({ 
    success: true, 
    sessionId,
    conversation: {
      sessionId: conversation.sessionId,
      title: conversation.title,
      messages: conversation.messages
    }
  });
});

// Add message to existing conversation
export const addMessage = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { role, content, imageUrl } = req.body;

  const conversation = await Conversation.findOne({ 
    userId: req.user._id, 
    sessionId,
    isActive: true 
  });

  if (!conversation) {
    return res.status(404).json({ 
      success: false, 
      message: 'Conversation not found' 
    });
  }

  conversation.messages.push({
    role,
    content,
    imageUrl: imageUrl || null,
    timestamp: new Date()
  });

  conversation.lastActivity = new Date();
  await conversation.save();

  res.json({ 
    success: true, 
    message: 'Message added successfully' 
  });
});

// Delete conversation
export const deleteConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const conversation = await Conversation.findOneAndUpdate(
    { userId: req.user._id, sessionId },
    { isActive: false },
    { new: true }
  );

  if (!conversation) {
    return res.status(404).json({ 
      success: false, 
      message: 'Conversation not found' 
    });
  }

  res.json({ 
    success: true, 
    message: 'Conversation deleted successfully' 
  });
});
