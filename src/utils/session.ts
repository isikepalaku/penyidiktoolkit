import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE_NAME = 'reserse_session_id';
const USER_COOKIE_NAME = 'reserse_user_id';
const COOKIE_DURATION_DAYS = 30; // User ID lebih lama dari session

interface SessionData {
  sessionId: string;
  userId: string;
}

export const getOrCreateSessionData = (): SessionData => {
  // Try to get existing user ID first
  let userId = Cookies.get(USER_COOKIE_NAME);
  
  // If no user ID exists, create new one
  if (!userId) {
    userId = `user_${uuidv4()}`;
    Cookies.set(USER_COOKIE_NAME, userId, {
      expires: COOKIE_DURATION_DAYS,
      secure: true,
      sameSite: 'strict'
    });
  }

  // Get or create session ID
  let sessionId = Cookies.get(SESSION_COOKIE_NAME);
  
  // Always create new session if none exists
  if (!sessionId) {
    sessionId = `session_${uuidv4()}`;
    Cookies.set(SESSION_COOKIE_NAME, sessionId, {
      expires: 7, // Session cookie shorter duration
      secure: true,
      sameSite: 'strict'
    });
  }
  
  return {
    sessionId,
    userId
  };
}; 