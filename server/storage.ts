import { type User, type InsertUser, type CompanySettings, type AttendanceRecord, type InsertAttendanceRecord } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, companySettings, attendanceRecords } from "@shared/schema";
import { eq, or, and, gte, lte, desc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined>;
  getUserByAuthId(authId: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  approveUser(id: string): Promise<User | undefined>;
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  
  // Attendance methods
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined>;
  getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined>;
  getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companySettings: CompanySettings;

  constructor() {
    this.users = new Map();
    this.companySettings = {
      id: randomUUID(),
      companyName: "NexaHR",
      logoUrl: null,
      faviconUrl: null,
      attendanceBufferMinutes: 15,
      updatedAt: new Date(),
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === emailOrUsername || user.username === username,
    );
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.authId === authId,
    );
  }

  async createUser(insertUser: Partial<User>): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      name: insertUser.name!,
      email: insertUser.email!,
      username: insertUser.username ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      mobileNumber: insertUser.mobileNumber ?? null,
      authId: insertUser.authId ?? null,
      role: insertUser.role ?? "user",
      isApproved: insertUser.isApproved ?? false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async approveUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, isApproved: true };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    return this.companySettings;
  }

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    this.companySettings = {
      ...this.companySettings,
      ...settings,
      updatedAt: new Date(),
    };
    return this.companySettings;
  }

  // Attendance methods - stub implementations for MemStorage
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    throw new Error("MemStorage attendance not implemented");
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }
}

// PostgreSQL-backed storage implementation
export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(
        eq(users.email, emailOrUsername),
        eq(users.username, username)
      )
    );
    return user;
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authId, authId));
    return user;
  }

  async createUser(insertUser: Partial<User>): Promise<User> {
    const [user] = await db.insert(users).values({
      name: insertUser.name!,
      email: insertUser.email!,
      username: insertUser.username ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      mobileNumber: insertUser.mobileNumber ?? null,
      authId: insertUser.authId ?? null,
      role: insertUser.role ?? "user",
      isApproved: insertUser.isApproved ?? false,
    }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async approveUser(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isApproved: true })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const [settings] = await db.select().from(companySettings).limit(1);
    
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(companySettings).values({
        companyName: "NexaHR",
        logoUrl: null,
        faviconUrl: null,
      }).returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
    // Get or create settings first
    let settings = await this.getCompanySettings();
    
    // Update the settings
    const [updated] = await db.update(companySettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(companySettings.id, settings.id))
      .returning();
    
    return updated;
  }

  // Attendance methods
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [attendanceRecord] = await db.insert(attendanceRecords)
      .values(record)
      .returning();
    return attendanceRecord;
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined> {
    const [updated] = await db.update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return updated;
  }

  async getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.date, date)
        )
      )
      .limit(1);
    return record;
  }

  async getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
  }

  async getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
  }
}

export const storage = new PgStorage();
