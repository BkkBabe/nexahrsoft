import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { Issuer, generators } from "openid-client";

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: "nexaadmin",
  password: "nexa123!",
};

// OIDC Configuration
let oidcClient: any = null;
async function getOIDCClient() {
  if (oidcClient) return oidcClient;
  
  try {
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/.well-known/openid-configuration";
    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    
    if (!clientId) {
      console.log("OIDC not configured: CLIENT_ID missing");
      return null;
    }
    
    const issuer = await Issuer.discover(issuerUrl);
    oidcClient = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [`https://${process.env.REPLIT_DOMAINS}/auth/callback`],
      response_types: ['code'],
    });
    
    return oidcClient;
  } catch (error) {
    console.error("Failed to initialize OIDC client:", error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        username: z.string(),
        password: z.string(),
      });

      const { username, password } = schema.parse(req.body);

      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.userId = "admin";
        req.session.isAdmin = true;
        return res.json({ success: true, message: "Admin login successful" });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      return res.status(400).json({ message: "Invalid request" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Get current session
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (req.session.userId) {
      if (req.session.isAdmin) {
        return res.json({
          authenticated: true,
          isAdmin: true,
          user: { id: "admin", name: "Admin", email: "admin@nexahr.com" },
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({
          authenticated: true,
          isAdmin: false,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isApproved: user.isApproved,
          },
        });
      }
    }

    return res.json({ authenticated: false });
  });

  // User logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // OAuth login initiation
  app.get("/auth/login", async (req: Request, res: Response) => {
    try {
      const client = await getOIDCClient();
      if (!client) {
        return res.status(500).json({ message: "OAuth not configured" });
      }

      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      
      req.session.codeVerifier = codeVerifier;
      
      const authUrl = client.authorizationUrl({
        scope: 'openid profile email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("OAuth login error:", error);
      res.status(500).json({ message: "Failed to initiate login" });
    }
  });

  // OAuth callback
  app.get("/auth/callback", async (req: Request, res: Response) => {
    try {
      const client = await getOIDCClient();
      if (!client) {
        return res.redirect("/?error=oauth_not_configured");
      }

      const params = client.callbackParams(req);
      const codeVerifier = req.session.codeVerifier;
      
      if (!codeVerifier) {
        return res.redirect("/?error=invalid_session");
      }

      const tokenSet = await client.callback(
        `https://${process.env.REPLIT_DOMAINS}/auth/callback`,
        params,
        { code_verifier: codeVerifier }
      );

      const userInfo = await client.userinfo(tokenSet.access_token);
      
      // Check if user exists
      let user = await storage.getUserByAuthId(userInfo.sub);
      
      if (!user) {
        // Create new user (pending approval)
        user = await storage.createUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email,
          authId: userInfo.sub,
          role: "user",
          isApproved: false,
        });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = false;
      
      // Redirect based on approval status
      if (user.isApproved) {
        res.redirect("/dashboard");
      } else {
        res.redirect("/pending-approval");
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
