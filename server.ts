import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import db from "./src/db.ts";
import { createServer } from "http";
import { getStockSentiment, validateTag, suggestStockTags } from "./src/services/geminiService.ts";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stocks", (req, res) => {
    const { market, industry, cycle } = req.query;
    let query = `
      SELECT s.*, 
        (SELECT json_group_array(content) FROM (SELECT content FROM tags WHERE stock_symbol = s.symbol AND is_hidden = 0 ORDER BY likes DESC LIMIT 5)) as tags
      FROM stocks s
      WHERE 1=1
    `;
    const params: any[] = [];

    if (market && market !== 'All') {
      query += ` AND market = ?`;
      params.push(market);
    }

    if (industry && industry !== 'All') {
      query += ` AND industry = ?`;
      params.push(industry);
    }

    query += ` ORDER BY heat_score DESC`;
    
    const stocks = db.prepare(query).all(...params);
    res.json(stocks);
  });

  app.get("/api/stocks/:symbol/tags", (req, res) => {
    const tags = db.prepare('SELECT * FROM tags WHERE stock_symbol = ? AND is_hidden = 0 ORDER BY likes DESC').all(req.params.symbol);
    res.json(tags);
  });

  app.post("/api/stocks/:symbol/tags", async (req, res) => {
    const { content } = req.body;
    const { symbol } = req.params;

    // AI Validation
    const validation = await validateTag(content);
    if (!validation.is_valid) {
      return res.status(400).json({ error: validation.reason });
    }

    db.prepare('INSERT INTO tags (stock_symbol, content) VALUES (?, ?)').run(symbol, content);
    res.json({ success: true });
  });

  app.post("/api/tags/:id/vote", (req, res) => {
    const { type } = req.body; // 'like' or 'dislike'
    const { id } = req.params;

    if (type === 'like') {
      db.prepare('UPDATE tags SET likes = likes + 1 WHERE id = ?').run(id);
    } else {
      db.prepare('UPDATE tags SET dislikes = dislikes + 1 WHERE id = ?').run(id);
      // Auto-hide if dislikes >= 5
      db.prepare('UPDATE tags SET is_hidden = 1 WHERE id = ? AND dislikes >= 5').run(id);
    }
    res.json({ success: true });
  });

  app.get("/api/stocks/:symbol", (req, res) => {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(req.params.symbol);
    if (!stock) return res.status(404).json({ error: "Stock not found" });
    res.json(stock);
  });

  app.get("/api/danmaku/:symbol", (req, res) => {
    const danmaku = db.prepare('SELECT d.*, u.username FROM danmaku d JOIN users u ON d.user_id = u.id WHERE d.stock_symbol = ? ORDER BY d.timestamp DESC LIMIT 50').all(req.params.symbol);
    res.json(danmaku);
  });

  app.post("/api/predictions", (req, res) => {
    const { user_id, stock_symbol, direction } = req.body;
    db.prepare('INSERT INTO predictions (user_id, stock_symbol, direction, created_at) VALUES (?, ?, ?, ?)').run(user_id, stock_symbol, direction, Date.now());
    res.json({ success: true });
  });

  app.get("/api/predictions/stats/:symbol", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN direction = 1 THEN 1 ELSE 0 END) as bull,
        SUM(CASE WHEN direction = -1 THEN 1 ELSE 0 END) as bear
      FROM predictions 
      WHERE stock_symbol = ?
    `).get(req.params.symbol) as { bull: number, bear: number };
    res.json(stats || { bull: 0, bear: 0 });
  });

  app.get("/api/user/:id", (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  });

  app.get("/api/stocks/:symbol/suggest-tags", async (req, res) => {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(req.params.symbol) as any;
    if (!stock) return res.status(404).json({ error: "Stock not found" });
    
    try {
      const suggestions = await suggestStockTags(stock.symbol, stock.name);
      res.json(suggestions);
    } catch (e) {
      res.status(500).json({ error: "AI suggestion failed" });
    }
  });

  app.get("/api/stocks/:symbol/attribution", async (req, res) => {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(req.params.symbol) as any;
    if (!stock) return res.status(404).json({ error: "Stock not found" });
    
    // Mock news for Gemini to analyze
    const news = [
      `${stock.name}今日成交额显著放大`,
      `行业分析师上调${stock.name}评级`,
      `社交媒体对${stock.name}讨论热度上升`
    ];
    
    try {
      const attribution = await getStockSentiment(stock.symbol, news);
      res.json(attribution);
    } catch (e) {
      res.status(500).json({ error: "Gemini analysis failed" });
    }
  });

  app.get("/api/watchlist/:user_id", (req, res) => {
    const stocks = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) + 1 FROM stocks s2 WHERE s2.heat_score > s.heat_score) as rank,
        (SELECT COUNT(*) FROM predictions p WHERE p.stock_symbol = s.symbol AND p.direction = 1) as bull_count,
        (SELECT COUNT(*) FROM predictions p WHERE p.stock_symbol = s.symbol AND p.direction = -1) as bear_count
      FROM stocks s
      JOIN watchlist w ON s.symbol = w.stock_symbol
      WHERE w.user_id = ?
    `).all(req.params.user_id);
    res.json(stocks);
  });

  app.post("/api/watchlist", (req, res) => {
    const { user_id, stock_symbol } = req.body;
    try {
      db.prepare('INSERT INTO watchlist (user_id, stock_symbol) VALUES (?, ?)').run(user_id, stock_symbol);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Already in watchlist" });
    }
  });

  app.delete("/api/watchlist", (req, res) => {
    const { user_id, stock_symbol } = req.body;
    db.prepare('DELETE FROM watchlist WHERE user_id = ? AND stock_symbol = ?').run(user_id, stock_symbol);
    res.json({ success: true });
  });

  app.get("/api/watchlist/check/:user_id/:symbol", (req, res) => {
    const exists = db.prepare('SELECT 1 FROM watchlist WHERE user_id = ? AND stock_symbol = ?').get(req.params.user_id, req.params.symbol);
    res.json({ exists: !!exists });
  });

  // WebSocket for real-time danmaku and price updates
  wss.on("connection", (ws) => {
    console.log("Client connected");
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "danmaku") {
          const { stock_symbol, user_id, content } = data;
          const timestamp = Date.now();
          const result = db.prepare('INSERT INTO danmaku (stock_symbol, user_id, content, timestamp) VALUES (?, ?, ?, ?)').run(stock_symbol, user_id, content, timestamp);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({
            type: "danmaku",
            payload: {
              id: result.lastInsertRowid,
              stock_symbol,
              user_id,
              content,
              timestamp,
              username: "User_" + user_id // Simplified
            }
          });
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    });
  });

  // Simulate price updates every 5 seconds
  setInterval(() => {
    const stocks = db.prepare('SELECT symbol, price FROM stocks').all() as { symbol: string, price: number }[];
    stocks.forEach(s => {
      const change = (Math.random() - 0.5) * 2; // -1 to 1
      const newPrice = s.price + change;
      db.prepare('UPDATE stocks SET price = ?, change_percent = change_percent + ? WHERE symbol = ?').run(newPrice, change / s.price * 100, s.symbol);
    });
    
    const updatedStocks = db.prepare('SELECT * FROM stocks').all();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "price_update", payload: updatedStocks }));
      }
    });
  }, 5000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
