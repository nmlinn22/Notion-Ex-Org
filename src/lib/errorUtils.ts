export const translateError = (error: any): string => {
  const message = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  
  // Gemini Errors
  if (message.includes('429') || message.includes('quota') || message.includes('exhausted')) {
    return 'Gemini API quota exceeded. Please wait a moment and try again. (Or replace with a new API Key)';
  }
  if (message.includes('API_KEY_INVALID') || message.includes('invalid api key') || message.includes('API key not found')) {
    return 'Invalid Gemini API Key. Please check your key in Settings.';
  }
  if (message.includes('overloaded') || message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand')) {
    return 'Server is busy. Please wait a moment and try again.';
  }
  if (message.includes('Safety') || message.includes('blocked')) {
    return 'This content could not be processed. Please try with different text.';
  }

  // Notion-specific errors (error codes thrown from server)
  if (message.includes('NOTION_INVALID_KEY')) {
    return 'Invalid Notion API Key. Please check your Notion Integration Token in Settings.';
  }
  if (message.includes('NOTION_DB_NOT_FOUND')) {
    return 'Notion Database not found. Please verify the Database ID and ensure the Integration is connected to the Database.';
  }
  if (message.includes('NOTION_NO_ACCESS')) {
    return 'Notion Integration does not have access to this Database. Go to Database → Share → and add your Integration.';
  }
  if (message.includes('NOTION_VALIDATION_ERROR')) {
    return 'Notion Database column names are incorrect. Please verify the columns: Date, Item, Group, Category, Income, Expense.';
  }

  // Notion Errors
  if (message.includes('not_found') && message.includes('database')) {
    return 'Notion Database not found. Please verify the Database ID.';
  }
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Connection unauthorized. Your API Key or Token may have expired.';
  }
  if (message.includes('validation_error') || message.includes('Could not find property')) {
    return 'Notion Database column names are incorrect. Please verify the columns: Date, Item, Group, Category, Income, Expense.';
  }
  if (message.includes('object_not_found')) {
    return 'Notion object not found. Please verify the Database ID or Page ID.';
  }

  // Supabase / Auth Errors
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Email verification required. Please check your inbox.';
  }
  if (message.includes('JWT') || message.includes('expired')) {
    return 'Session expired. Please sign in again.';
  }

  // Network / General
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('TypeError: Failed to fetch') || message.includes('connection failed')) {
    return 'Poor internet connection or unable to reach the server.';
  }
  if (message.includes('timeout')) {
    return 'Connection timed out. Please try again.';
  }
  if (message.includes('3MB')) {
    return 'Image size exceeds 3MB. Please reduce the image size.';
  }

  // Default fallback
  const isTechnical = message.includes('{') || message.includes('}') || message.includes('code:') || message.includes('Error:') || message.includes('status:');
  if (message.length > 150 || isTechnical) {
    return 'An unexpected error occurred. Please wait a moment and try again.';
  }
  
  return message;
};

// Shared helper: Parses HTTP response text and returns a translated error message.
// Import from here instead of duplicating in App.tsx, useAdmin.ts, etc.
export const parseHttpError = (text: string, statusCode: number): string => {
  try {
    const errorData = JSON.parse(text);
    let msg = errorData.error || `Server Error (${statusCode})`;
    if (typeof msg === 'object') msg = msg.message || JSON.stringify(msg);
    return translateError(msg);
  } catch {
    return translateError(`Server Error (${statusCode}): ${text.substring(0, 100)}`);
  }
};