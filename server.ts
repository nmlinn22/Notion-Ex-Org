import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

// Server-side error translation to Burmese
const translateServerError = (message: string): string => {
  if (!message) return 'မမျှော်လင့်ထားသော Error တစ်ခု ဖြစ်ပွားသွားပါသည်။';
  if (message.includes('429') || message.includes('quota') || message.includes('exhausted')) {
    return 'Gemini AI အသုံးပြုမှု ပမာဏ ပြည့်သွားပါပြီ။ ခေတ္တစောင့်ပြီးမှ ပြန်လည် ကြိုးစားပေးပါ။';
  }
  if (message.includes('API_KEY_INVALID') || message.includes('invalid api key') || message.includes('API key not found')) {
    return 'Gemini API Key မှားယွင်းနေပါသည်။ Settings တွင် ပြန်လည်စစ်ဆေးပေးပါ။';
  }
  if (message.includes('overloaded') || message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand')) {
    return 'Gemini AI လက်ရှိတွင် အလုပ်များနေပါသည်။ ခေတ္တစောင့်ပြီးမှ ပြန်လည် ကြိုးစားပေးပါ။';
  }
  if (message.includes('Safety') || message.includes('blocked')) {
    return 'AI မှ ဤအကြောင်းအရာကို စစ်ဆေးရန် ငြင်းဆိုထားပါသည်။ အခြားစာသားဖြင့် စမ်းကြည့်ပါ။';
  }
  // Notion-specific errors (server.ts မှ throw လုပ်သော codes)
  if (message.includes('NOTION_INVALID_KEY')) {
    return 'Notion API Key မှားယွင်းနေပါသည်။ Settings တွင် Notion Integration Token ကို ပြန်လည်စစ်ဆေးပေးပါ။';
  }
  if (message.includes('NOTION_DB_NOT_FOUND')) {
    return 'Notion Database ကို ရှာမတွေ့ပါ။ Database ID မှန်ကန်မှု ရှိမရှိ စစ်ဆေးပြီး Integration ကို Database နှင့် ချိတ်ဆက်ထားကြောင်း သေချာပါစေ။';
  }
  if (message.includes('NOTION_NO_ACCESS')) {
    return 'Notion Integration မှာ ဤ Database ကို ဖတ်ခွင့် မရှိပါ။ Database → Share → Integration ထည့်ပေးပါ။';
  }
  if (message.includes('NOTION_VALIDATION_ERROR')) {
    return 'Notion Database Column (Properties) အမည်များ မှားယွင်းနေပါသည်။ Date, Item, Group, Category, Income, Expense အမည်များ မှန်မမှန် စစ်ဆေးပါ။';
  }
  if (message.includes('not_found') && message.includes('database')) {
    return 'Notion Database ကို ရှာမတွေ့ပါ။ Database ID မှန်ကန်မှု ရှိမရှိ စစ်ဆေးပါ။';
  }
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Notion API Key မှားယွင်းနေပါသည်။ Settings တွင် ပြန်လည်စစ်ဆေးပေးပါ။';
  }
  if (message.includes('validation_error') || message.includes('Could not find property')) {
    return 'Notion Database Column အမည်များ မှားယွင်းနေပါသည်။ Date, Item, Group, Category, Income, Expense စစ်ဆေးပါ။';
  }
  if (message.includes('object_not_found')) {
    return 'Notion Object ကို ရှာမတွေ့ပါ။ Database ID သို့မဟုတ် Page ID မှန်ကန်မှု ရှိမရှိ စစ်ဆေးပါ။';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('connection failed')) {
    return 'အင်တာနက် လိုင်းမကောင်းပါ သို့မဟုတ် Server နှင့် ချိတ်ဆက်၍ မရပါ။';
  }
  const isTechnical = message.includes('{') || message.includes('}') || message.includes('Error:') || message.includes('status:');
  if (message.length > 150 || isTechnical) {
    return 'မမျှော်လင့်ထားသော Error တစ်ခု ဖြစ်ပွားသွားပါသည်။ ခေတ္တစောင့်ပြီး ပြန်လည် ကြိုးစားပေးပါ။';
  }
  return message;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Admin Client (for server-side operations)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!");
  console.error("Please ensure you have added both VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your Vercel Environment Variables.");
}

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Middleware to verify Supabase User and Approval Status
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Server configuration error: Supabase client not initialized. Check environment variables." });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No valid token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token missing from authorization header" });
    }

    // Decode JWT manually to get user id (service role client cannot use getUser with user JWT)
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
      userId = payload.sub;
      if (!userId) throw new Error('No sub in token');
      // Basic expiry check
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: "Token expired" });
      }
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "Profile not found." });
    }

    req.user = { id: userId };
    req.isAdmin = profile.is_admin || profile.role === 'admin';
    req.userRole = profile.role || 'member';
    next();
  } catch (err: any) {
    console.error("Auth Middleware Error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};


// CSV Import: AI auto-assign group & category
app.post("/api/ai-assign", authenticateUser, async (req: any, res) => {
  const { entries, groups, categories } = req.body;
  const user = req.user;

  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: "entries array required" });
  }

  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('gemini_key')
      .eq('user_id', user.id)
      .single();

    const geminiKey = settings?.gemini_key || process.env.GEMINI_API_KEY;

    const groupList = (groups || []).join(', ');
    const catList = (categories || []).join(', ');

    const prompt = `You are an expense categorizer. For each entry, assign the most appropriate "group" and "category" from the provided lists.

Available Groups: ${groupList}
Available Categories: ${catList}

Rules:
- If item/category suggests income (salary, bonus, လစာ, ဝင်ငွေ, balance, Balance) → use Income group (if exists)
- If item/category suggests food/drink (မုန့်, ထမင်း, ဆိုင်, food, restaurant, tea shop, GS25, 7 Eleven) → Foods & Drink category, Needs group
- If item/category suggests transport (taxi, bus, ကား, transportation, BTS, MRT) → Transportation category, Needs group
- If item/category suggests shopping/clothes (အဝတ်, cloth, shopping, T-shirt, Online Shop) → Cloth or Personal Use, Wants group
- If item/category suggests medicine/health (ဆေး, medicine, hospital, clinic, Beauty) → Medicine or Personal Use, Health group
- If item/category suggests bills (bill, internet, phone, SMS) → Internet Bill or relevant category, Needs group
- Keep original item/description unchanged
- If unsure, use "Others" category and "Needs" group
- ONLY use groups and categories from the provided lists

Return ONLY a JSON array with exactly ${entries.length} objects (no markdown, no explanation):
[{"group":"...","category":"..."},...]

Entries:
${JSON.stringify(entries.map((e: any, idx: number) => ({ idx, item: e.item, category: e.category || '', isIncome: !!(e.income && e.income > 0) })))}`;

    // Use Gemini if available, otherwise use Claude
    let result: { group: string; category: string }[] = [];

    if (geminiKey && geminiKey.length > 10) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const text = response.text || '[]';
      result = JSON.parse(text.replace(/```json|```/g, '').trim());
    } else {
      // Fallback: simple rule-based assign
      result = entries.map((e: any) => {
        const isIncome = !!(e.income && e.income > 0);
        if (isIncome) return { group: groups.includes('Income') ? 'Income' : groups[0], category: categories.includes('Salary') ? 'Salary' : categories[0] };
        return { group: groups.includes('Needs') ? 'Needs' : groups[0], category: 'Others' };
      });
    }

    // Validate against provided lists
    const validated = result.map((item: any, i: number) => ({
      group: groups.includes(item.group) ? item.group : (groups[0] || ''),
      category: categories.includes(item.category) ? item.category : 'Others'
    }));

    res.json({ success: true, data: validated });
  } catch (err: any) {
    console.error("AI Assign Error:", err);
    // Return fallback on error
    const fallback = entries.map((e: any) => ({
      group: (groups && groups[0]) || '',
      category: 'Others'
    }));
    res.json({ success: true, data: fallback });
  }
});

// API Routes
app.post("/api/parse", authenticateUser, async (req: any, res) => {
  const { text, image, groups, categories } = req.body;
  const user = req.user;
  
  try {
    // Fetch Gemini Key from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('gemini_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.gemini_key || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ 
        error: "Gemini API Key မရှိပါ။ Settings မှာ အရင်ထည့်ပေးပါ။" 
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const model = "gemini-2.5-flash";
    
    const groupList = groups && groups.length > 0 ? groups.join(" | ") : "30% Needs | 10% Wants | 50% Saving | 10% Health | Income";
    const categoryList = categories && categories.length > 0 ? categories.join(" | ") : "Foods & Drink | Medicine | Internet Bill | Transportation | Bank Service Fees | Household items | Personal Use | Gaming | Mobile Accessories | Cloth | Cosmetic | Parent Support | Investment | Debit Repayment | Salary | Others | Balance | Freelance | Loan";

    const systemInstruction = `You are an expense parser. Extract expense/income data from text, Korean SMS, or Burmese text.
Return a JSON array of objects.
Format:
[
  {
    "date": "YYYY-MM-DD",
    "item": "description",
    "income": number | null,
    "expense": number | null,
    "group": "one of: ${groupList}",
    "category": "one of: ${categoryList}"
  }
]

Rules:
- If it's a deposit/income → income field, group = Income (if exists in groups, else use first group)
- If it's a withdrawal/expense → expense field
- Today's date if no date given: ${new Date().toISOString().split("T")[0]}
- Convert all amounts to numbers only.
- item should be short and clear.
- Categorize accurately based on the provided category list.`;

    const contents: any[] = [];
    if (image) {
      contents.push({
        parts: [
          { inlineData: { data: image.data, mimeType: image.mediaType } },
          { text: text || "Parse all expenses/income from this image." }
        ]
      });
    } else {
      contents.push({ parts: [{ text }] });
    }

    let response;
    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  item: { type: Type.STRING },
                  income: { type: Type.NUMBER, nullable: true },
                  expense: { type: Type.NUMBER, nullable: true },
                  group: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["date", "item", "group", "category"]
              }
            }
          }
        });
        break;
      } catch (err: any) {
        const isRetryable = 
          err.message?.includes("503") || 
          err.message?.includes("UNAVAILABLE") || 
          err.message?.includes("high demand") ||
          err.message?.includes("overloaded");

        if (isRetryable && retries > 1) {
          retries--;
          console.log(`Gemini busy, retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }

    const parsed = JSON.parse(response?.text || "[]");
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: translateServerError(err.message) });
  }
});

app.post("/api/notion", authenticateUser, async (req: any, res) => {
  const { entries } = req.body;
  const user = req.user;

  try {
    // Fetch Notion credentials from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('notion_key, notion_db_id')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.notion_key || process.env.NOTION_API_KEY;
    const dbId = settings?.notion_db_id || process.env.NOTION_DATABASE_ID;

    if (!apiKey || !dbId) {
      return res.status(400).json({ error: "Notion credentials missing" });
    }

    const results = [];

    for (const entry of entries) {
    try {
      // 1. Send to Notion FIRST
      const properties: any = {
        Date: { date: { start: entry.date } },
        Item: { title: [{ text: { content: entry.item || "" } }] },
        Group: { select: { name: entry.group } },
        Category: { select: { name: entry.category } }
      };

      if (entry.income) properties.Income = { number: entry.income };
      if (entry.expense) properties.Expense = { number: entry.expense };

      const notionRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({ parent: { database_id: dbId }, properties })
      });

      const data = await notionRes.json() as any;
      if (!notionRes.ok) {
        console.error("Notion API Error:", JSON.stringify(data));

        // Notion error code ကို ကြည့်ပြီး ရှင်းရှင်းလင်းလင်း error ပြပါ
        const notionCode = data.code || '';
        const notionStatus = notionRes.status;

        if (notionStatus === 401 || notionCode === 'unauthorized') {
          throw new Error('NOTION_INVALID_KEY');
        } else if (notionStatus === 404 || notionCode === 'object_not_found') {
          throw new Error('NOTION_DB_NOT_FOUND');
        } else if (notionCode === 'validation_error') {
          throw new Error('NOTION_VALIDATION_ERROR: ' + (data.message || ''));
        } else if (notionCode === 'restricted_resource') {
          throw new Error('NOTION_NO_ACCESS');
        } else {
          throw new Error(data.message || 'Notion API error');
        }
      }

      // 2. Save to Supabase ONLY IF Notion was successful
      const { error: dbError } = await supabase
        .from('history')
        .insert({
          user_id: user.id,
          date: entry.date,
          item: entry.item,
          income: entry.income || null,
          expense: entry.expense || null,
          category: entry.category,
          group_name: entry.group
        });

      if (dbError) throw dbError;

      results.push({ success: true, id: data.id });
    } catch (err: any) {
      results.push({ success: false, error: translateServerError(err.message), entry });
    }
  }

    res.json({ results });
  } catch (err: any) {
    console.error("Notion Route Error:", err);
    res.status(500).json({ error: translateServerError(err.message) });
  }
});

app.get("/api/history", authenticateUser, async (req: any, res) => {
  const user = req.user;

  // Pagination: ?page=1&limit=30
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
  const offset = (page - 1) * limit;

  // Get total count for pagination metadata
  const { count } = await supabase
    .from('history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  // Map group_name back to group for frontend compatibility
  const mappedData = data.map((row: any) => ({
    ...row,
    group: row.group_name
  }));

  res.json({
    data: mappedData,
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: offset + limit < (count || 0)
    }
  });
});

// Admin Routes
app.get("/api/admin/users", authenticateUser, async (req: any, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin: set user role (member / premium / admin)
app.post("/api/admin/set-role", authenticateUser, async (req: any, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });

  const { userId, role } = req.body;
  if (!['member', 'premium', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: "သင်ကိုယ်တိုင် role ပြောင်း၍ မရပါ။" });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role, is_admin: role === 'admin' })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Keep old set-admin for backward compat
app.post("/api/admin/set-admin", authenticateUser, async (req: any, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });
  const { userId, isAdmin } = req.body;
  if (userId === req.user.id) return res.status(400).json({ error: "သင်ကိုယ်တိုင် Admin ဖြုတ်ချ၍ မရပါ။" });
  const role = isAdmin ? 'admin' : 'member';
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin, role }).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Admin: delete user account
app.delete("/api/admin/user/:userId", authenticateUser, async (req: any, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });

  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ error: "သင်ကိုယ်တိုင် Account ဖျက်၍ မရပါ။" });
  }

  // history ဖျက် → profile ဖျက် → auth user ဖျက်
  await supabase.from('history').delete().eq('user_id', userId);
  await supabase.from('settings').delete().eq('user_id', userId);
  await supabase.from('profiles')
    .delete()
    .eq('id', userId);

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// Self: delete own account
app.delete("/api/account/self", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  try {
    await supabase.from('entries').delete().eq('user_id', userId);
    await supabase.from('history').delete().eq('user_id', userId);
    await supabase.from('settings').delete().eq('user_id', userId);
    await supabase.from('budgets').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get usage stats per user (parse/send counts + last active)
app.get("/api/admin/stats", authenticateUser, async (req: any, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });

  const { data, error } = await supabase
    .from('history')
    .select('user_id, created_at');

  if (error) return res.status(500).json({ error: error.message });

  // user_id အလိုက် count နှင့် last_active တွက်
  const statsMap: Record<string, { count: number; last_active: string }> = {};
  for (const row of data) {
    if (!statsMap[row.user_id]) {
      statsMap[row.user_id] = { count: 0, last_active: row.created_at };
    }
    statsMap[row.user_id].count++;
    if (row.created_at > statsMap[row.user_id].last_active) {
      statsMap[row.user_id].last_active = row.created_at;
    }
  }

  res.json(statsMap);
});

// ─── App-only mode: entries CRUD ───────────────────────────────────────────

// GET entries (with optional month/year filter)
app.get("/api/entries", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { month, year } = req.query;

  try {
    let query = supabase
      .from("entries")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (year) {
      const y = parseInt(year as string);
      query = query.gte("date", `${y}-01-01`).lte("date", `${y}-12-31`);
    }
    if (month && year) {
      const y = parseInt(year as string);
      const m = parseInt(month as string).toString().padStart(2, "0");
      const lastDay = new Date(y, parseInt(month as string), 0).getDate();
      query = query.gte("date", `${y}-${m}-01`).lte("date", `${y}-${m}-${lastDay}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST save entries (batch)
app.post("/api/entries", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { entries } = req.body;

  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: "entries array required" });
  }

  try {
    const rows = entries.map((e: any) => ({
      user_id: userId,
      date: e.date,
      item: e.item || "Unknown",
      income: e.income || 0,
      expense: e.expense || 0,
      group: e.group || "",
      category: e.category || "",
    }));

    const { data, error } = await supabase.from("entries").insert(rows).select();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entry by id
app.get("/api/entries/summary", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { year } = req.query;
  const y = year ? parseInt(year as string) : new Date().getFullYear();

  try {
    const { data, error } = await supabase
      .from("entries")
      .select("date, income, expense, group, category")
      .eq("user_id", userId)
      .gte("date", `${y}-01-01`)
      .lte("date", `${y}-12-31`);

    if (error) throw error;

    // Monthly breakdown
    const monthly: Record<string, { income: number; expense: number }> = {};
    const byGroup: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    // monthlyByGroup: { "YYYY-MM": { groupName: expense } }
    const monthlyByGroup: Record<string, Record<string, number>> = {};

    for (const row of data || []) {
      const month = row.date.slice(0, 7); // YYYY-MM
      if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
      monthly[month].income += Number(row.income) || 0;
      monthly[month].expense += Number(row.expense) || 0;

      if (row.group) {
        byGroup[row.group] = (byGroup[row.group] || 0) + (Number(row.expense) || 0);
        if (!monthlyByGroup[month]) monthlyByGroup[month] = {};
        monthlyByGroup[month][row.group] = (monthlyByGroup[month][row.group] || 0) + (Number(row.expense) || 0);
      }
      if (row.category) {
        byCategory[row.category] = (byCategory[row.category] || 0) + (Number(row.expense) || 0);
      }
    }

    const totalIncome = (data || []).reduce((s: number, r: any) => s + (Number(r.income) || 0), 0);
    const totalExpense = (data || []).reduce((s: number, r: any) => s + (Number(r.expense) || 0), 0);

    res.json({ monthly, byGroup, byCategory, monthlyByGroup, totalIncome, totalExpense, year: y });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// GET drill-down: groups for a month/year
app.get("/api/entries/drilldown/groups", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;
  try {
    let query = supabase.from("entries").select("income, expense, group, category, item, date, id")
      .eq("user_id", userId);
    if (year && month) {
      const y = year as string, m = (month as string).padStart(2, '0');
      query = query.gte("date", `${y}-${m}-01`).lte("date", `${y}-${m}-31`);
    } else if (year) {
      query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const byGroup: Record<string, { income: number; expense: number; categories: Record<string, { income: number; expense: number; entries: any[] }> }> = {};
    for (const row of data || []) {
      const g = row.group || 'Uncategorized';
      const c = row.category || 'Uncategorized';
      if (!byGroup[g]) byGroup[g] = { income: 0, expense: 0, categories: {} };
      byGroup[g].income += Number(row.income) || 0;
      byGroup[g].expense += Number(row.expense) || 0;
      if (!byGroup[g].categories[c]) byGroup[g].categories[c] = { income: 0, expense: 0, entries: [] };
      byGroup[g].categories[c].income += Number(row.income) || 0;
      byGroup[g].categories[c].expense += Number(row.expense) || 0;
      byGroup[g].categories[c].entries.push(row);
    }
    const totalIncome = (data || []).reduce((s: number, r: any) => s + (Number(r.income) || 0), 0);
    const totalExpense = (data || []).reduce((s: number, r: any) => s + (Number(r.expense) || 0), 0);
    res.json({ byGroup, totalIncome, totalExpense });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// DELETE bulk entries
app.delete("/api/entries", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  try {
    const { error } = await supabase
      .from("entries")
      .delete()
      .in("id", ids)
      .eq("user_id", userId);
    if (error) throw error;
    res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entry by id
app.delete("/api/entries/:id", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update entry by id
app.put("/api/entries/:id", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { date, item, income, expense, group, category } = req.body;

  try {
    const { data, error } = await supabase
      .from("entries")
      .update({ date, item, income: income || 0, expense: expense || 0, group, category })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET monthly summary
app.get("/api/budgets", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/budgets", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { group_name, amount } = req.body;
  if (!group_name || amount === undefined || amount === null) return res.status(400).json({ error: "group_name and amount required" });
  try {
    const { data, error } = await supabase
      .from("budgets")
      .upsert({ user_id: userId, group_name, amount, updated_at: new Date().toISOString() }, { onConflict: "user_id,group_name" })
      .select();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/budgets", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { group_name } = req.body;
  if (!group_name) return res.status(400).json({ error: "group_name required" });
  try {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("user_id", userId)
      .eq("group_name", group_name);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH bulk rename group or category in entries
app.patch("/api/entries/rename", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { field, oldName, newName } = req.body;
  if (!field || !oldName || !newName) return res.status(400).json({ error: "field, oldName, newName required" });
  if (!['group', 'category'].includes(field)) return res.status(400).json({ error: "field must be group or category" });
  try {
    const { error, count } = await supabase
      .from("entries")
      .update({ [field]: newName })
      .eq("user_id", userId)
      .eq(field, oldName);
    if (error) throw error;
    res.json({ success: true, updated: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile (role, display_name etc.)
app.get("/api/profile/me", authenticateUser, async (req: any, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name, is_admin, created_at')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.VERCEL ? "vercel" : "local",
    supabaseConfigured: !!supabase 
  });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[GLOBAL ERROR]:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "An unexpected error occurred"
  });
});



// ── AUTO PAYMENTS ──────────────────────────────────────────────────────────

// GET all auto payments for user
app.get("/api/auto-payments", authenticateUser, async (req: any, res) => {
  const isPremium = req.isAdmin || req.userRole === 'premium' || req.userRole === 'admin';
  if (!isPremium) return res.status(403).json({ error: "Premium feature" });
  try {
    const { data, error } = await supabase
      .from("auto_payments")
      .select("*")
      .eq("user_id", req.user.id)
      .order("day_of_month", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create auto payment
app.post("/api/auto-payments", authenticateUser, async (req: any, res) => {
  const isPremium = req.isAdmin || req.userRole === 'premium' || req.userRole === 'admin';
  if (!isPremium) return res.status(403).json({ error: "Premium feature" });
  const { item, amount, type, category, group, day_of_month } = req.body;
  if (!item || !amount || !day_of_month) return res.status(400).json({ error: "item, amount, day_of_month required" });
  try {
    const { data, error } = await supabase.from("auto_payments").insert({
      user_id: req.user.id, item, amount, type: type || 'expense',
      category: category || '', group: group || '',
      day_of_month, active: true, last_run: ''
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update auto payment
// POST /api/auto-payments/run — check & insert due payments
app.post("/api/auto-payments/run", authenticateUser, async (req: any, res) => {
  try {
    const now = new Date();
    const todayDay = now.getDate();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: payments, error } = await supabase
      .from("auto_payments").select("*")
      .eq("user_id", req.user.id).eq("active", true);
    if (error) throw error;

    const triggered: string[] = [];

    for (const p of payments || []) {
      // Skip if already run this month
      if (p.last_run === thisMonth) continue;
      // Skip if today hasn't reached the scheduled day yet
      if (todayDay < p.day_of_month) continue;

      // Insert entry
      const entryData: any = {
        user_id: req.user.id,
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(p.day_of_month).padStart(2, '0')}`,
        item: p.item,
        income: p.type === 'income' ? p.amount : 0,
        expense: p.type === 'expense' ? p.amount : 0,
        category: p.category || '',
        group: p.group || '',
      };

      const { error: insertError } = await supabase.from("entries").insert(entryData);
      if (!insertError) {
        // Update last_run
        await supabase.from("auto_payments").update({ last_run: thisMonth }).eq("id", p.id);
        triggered.push(p.item);
      }
    }

    res.json({ success: true, triggered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auto-payments/:id", authenticateUser, async (req: any, res) => {
  const isPremium = req.isAdmin || req.userRole === 'premium' || req.userRole === 'admin';
  if (!isPremium) return res.status(403).json({ error: "Premium feature" });
  const { id } = req.params;
  const { item, amount, type, category, group, day_of_month, active } = req.body;
  try {
    const { data, error } = await supabase.from("auto_payments")
      .update({ item, amount, type, category, group, day_of_month, active })
      .eq("id", id).eq("user_id", req.user.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE auto payment
app.delete("/api/auto-payments/:id", authenticateUser, async (req: any, res) => {
  const isPremium = req.isAdmin || req.userRole === 'premium' || req.userRole === 'admin';
  if (!isPremium) return res.status(403).json({ error: "Premium feature" });
  try {
    const { error } = await supabase.from("auto_payments")
      .delete().eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Backup & Restore ────────────────────────────────────────────────────────

// GET /api/backups — user ရဲ့ backup list ကြည့်
app.get("/api/backups", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from("backups")
      .select("id, label, entries_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backups — backup အသစ်တစ်ခု သိမ်း
app.post("/api/backups", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { label } = req.body;
  try {
    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("date, item, income, expense, group, category")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (entriesError) throw entriesError;

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: "သိမ်းစရာ entries မရှိပါ။" });
    }

    const backupLabel = label || `Backup ${new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    })}`;

    const { data, error } = await supabase
      .from("backups")
      .insert({
        user_id: userId,
        label: backupLabel,
        entries_json: entries,
        entries_count: entries.length,
      })
      .select("id, label, entries_count, created_at")
      .single();
    if (error) throw error;

    res.json({ success: true, backup: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backups/:id/restore — backup တစ်ခုကနေ restore
app.post("/api/backups/:id/restore", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { mode } = req.body;

  try {
    const { data: backup, error: backupError } = await supabase
      .from("backups")
      .select("entries_json, entries_count")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (backupError || !backup) throw new Error("Backup မတွေ့ပါ။");

    if (mode === "replace") {
      const { error: deleteError } = await supabase
        .from("entries")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
    }

    const rows = (backup.entries_json as any[]).map((e: any) => ({
      user_id: userId,
      date: e.date || new Date().toISOString().slice(0, 10),
      item: e.item || "Unknown",
      income: e.income || 0,
      expense: e.expense || 0,
      group: e.group || "",
      category: e.category || "",
    }));

    const { error: insertError } = await supabase.from("entries").insert(rows);
    if (insertError) throw insertError;

    res.json({ success: true, restored: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backups/:id — backup ဖျက်
app.delete("/api/backups/:id", authenticateUser, async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("backups")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else if (!process.env.VERCEL) {
  // In production (non-Vercel), serve from dist/client
  const clientPath = path.join(__dirname, "client");
  const fallbackPath = path.join(__dirname, "dist", "client");
  const fallbackPath2 = path.join(__dirname, "..", "dist", "client");
  
  let staticPath = clientPath;
  if (!fs.existsSync(staticPath)) staticPath = fallbackPath;
  if (!fs.existsSync(staticPath)) staticPath = fallbackPath2;
  
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }
}

// Only listen if not running as a serverless function (e.g., on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Started successfully on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
export default app;