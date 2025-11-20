import { type User, type InsertUser, type CompanySettings, type AttendanceRecord, type InsertAttendanceRecord, type UserSession, type InsertUserSession, type LoginChallenge, type InsertLoginChallenge, type PayslipRecord, type InsertPayslipRecord, type LeaveBalance, type InsertLeaveBalance, type LeaveApplication, type InsertLeaveApplication } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, companySettings, attendanceRecords, userSessions, loginChallenges, payslipRecords, leaveBalances, leaveApplications } from "@shared/schema";
import { eq, or, and, gte, lte, desc, isNull, not } from "drizzle-orm";

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
  
  // Session tracking methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getActiveSessions(userId: string): Promise<UserSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void>;
  updateSessionLastSeen(sessionId: string): Promise<void>;
  
  // Login challenge methods
  createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge>;
  getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined>;
  useLoginChallenge(challengeId: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<void>;
  
  // Payslip methods
  createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord>;
  updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined>;
  getPayslipById(id: string): Promise<PayslipRecord | undefined>;
  getPayslipsByUser(userId: string): Promise<PayslipRecord[]>;
  getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]>;
  getAllPayslips(): Promise<PayslipRecord[]>;
  
  // Leave management methods
  createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined>;
  getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]>;
  getAllLeaveBalances(year: number): Promise<LeaveBalance[]>;
  updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined>;
  
  createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication>;
  updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined>;
  getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined>;
  getUserLeaveApplications(userId: string): Promise<LeaveApplication[]>;
  getAllLeaveApplications(): Promise<LeaveApplication[]>;
  getPendingLeaveApplications(): Promise<LeaveApplication[]>;
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

  // Session tracking methods - stub implementations for MemStorage
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async revokeSession(sessionId: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async updateSessionLastSeen(sessionId: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async useLoginChallenge(challengeId: string): Promise<void> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async cleanupExpiredChallenges(): Promise<void> {
    throw new Error("MemStorage login challenge not implemented");
  }

  // Payslip methods - stub implementations
  async createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord> {
    throw new Error("MemStorage payslip not implemented");
  }

  async updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getPayslipById(id: string): Promise<PayslipRecord | undefined> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getAllPayslips(): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  // Leave management methods - stub implementations
  async createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    throw new Error("MemStorage leave not implemented");
  }

  async getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getAllLeaveBalances(year: number): Promise<LeaveBalance[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication> {
    throw new Error("MemStorage leave not implemented");
  }

  async updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getUserLeaveApplications(userId: string): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getPendingLeaveApplications(): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
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

  // Session tracking methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [userSession] = await db.insert(userSessions)
      .values(session)
      .returning();
    return userSession;
  }

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt)
        )
      )
      .orderBy(desc(userSessions.createdAt));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const conditions = [
      eq(userSessions.userId, userId),
      isNull(userSessions.revokedAt)
    ];
    
    if (exceptSessionId) {
      conditions.push(not(eq(userSessions.sessionId, exceptSessionId)));
    }
    
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(...conditions));
  }

  async updateSessionLastSeen(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ lastSeen: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  // Login challenge methods
  async createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge> {
    const [loginChallenge] = await db.insert(loginChallenges)
      .values(challenge)
      .returning();
    return loginChallenge;
  }

  async getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined> {
    const [challenge] = await db.select()
      .from(loginChallenges)
      .where(eq(loginChallenges.challengeToken, challengeToken))
      .limit(1);
    return challenge;
  }

  async useLoginChallenge(challengeId: string): Promise<void> {
    await db.update(loginChallenges)
      .set({ usedAt: new Date() })
      .where(eq(loginChallenges.id, challengeId));
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = new Date();
    await db.delete(loginChallenges)
      .where(lte(loginChallenges.expiresAt, now));
  }

  // Payslip methods
  async createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord> {
    const [record] = await db.insert(payslipRecords)
      .values(payslip)
      .returning();
    return record;
  }

  async updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined> {
    const [updated] = await db.update(payslipRecords)
      .set(updates)
      .where(eq(payslipRecords.id, id))
      .returning();
    return updated;
  }

  async getPayslipById(id: string): Promise<PayslipRecord | undefined> {
    const [record] = await db.select()
      .from(payslipRecords)
      .where(eq(payslipRecords.id, id));
    return record;
  }

  async getPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .where(eq(payslipRecords.userId, userId))
      .orderBy(desc(payslipRecords.createdAt));
  }

  async getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .where(
        and(
          eq(payslipRecords.userId, userId),
          eq(payslipRecords.status, "approved")
        )
      )
      .orderBy(desc(payslipRecords.createdAt));
  }

  async getAllPayslips(): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .orderBy(desc(payslipRecords.createdAt));
  }

  // Leave management methods
  async createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    // Check if balance already exists
    const [existing] = await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, balance.userId),
          eq(leaveBalances.leaveType, balance.leaveType),
          eq(leaveBalances.year, balance.year)
        )
      );

    if (existing) {
      // Update existing balance
      const [updated] = await db.update(leaveBalances)
        .set({
          totalDays: balance.totalDays,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new balance
      const [created] = await db.insert(leaveBalances)
        .values(balance)
        .returning();
      return created;
    }
  }

  async getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined> {
    const [balance] = await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.leaveType, leaveType),
          eq(leaveBalances.year, year)
        )
      );
    return balance;
  }

  async getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]> {
    return await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.year, year)
        )
      )
      .orderBy(leaveBalances.leaveType);
  }

  async getAllLeaveBalances(year: number): Promise<LeaveBalance[]> {
    return await db.select()
      .from(leaveBalances)
      .where(eq(leaveBalances.year, year))
      .orderBy(leaveBalances.userId, leaveBalances.leaveType);
  }

  async updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined> {
    const [updated] = await db.update(leaveBalances)
      .set({
        usedDays,
        updatedAt: new Date(),
      })
      .where(eq(leaveBalances.id, id))
      .returning();
    return updated;
  }

  async createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication> {
    const [created] = await db.insert(leaveApplications)
      .values(application)
      .returning();
    return created;
  }

  async updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined> {
    const [updated] = await db.update(leaveApplications)
      .set(updates)
      .where(eq(leaveApplications.id, id))
      .returning();
    return updated;
  }

  async getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined> {
    const [application] = await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.id, id));
    return application;
  }

  async getUserLeaveApplications(userId: string): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.userId, userId))
      .orderBy(desc(leaveApplications.createdAt));
  }

  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .orderBy(desc(leaveApplications.createdAt));
  }

  async getPendingLeaveApplications(): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.status, "pending"))
      .orderBy(leaveApplications.createdAt);
  }
}

export const storage = new PgStorage();
