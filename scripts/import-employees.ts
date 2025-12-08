import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const employeesData = [
  { code: "06001", name: "RAMADAS JAYARAM GOVINDASAMY", shortName: "MR. DAS", nricFin: "S1485384G", gender: "MALE", department: "SENIOR MANAGEMENT", section: "SINGAPOREAN", designation: "DIRECTOR", fingerId: "06001", email: "DASJG@3SI.COM.SG", joinDate: "20-11-2006", resignDate: "" },
  { code: "06002", name: "MANICKAN JAMUNA RANI", shortName: "", nricFin: "S1415749B", gender: "FEMALE", department: "SENIOR MANAGEMENT", section: "SINGAPOREAN", designation: "DIRECTOR", fingerId: "06002", email: "RANI@3SI.COM.SG", joinDate: "20-11-2006", resignDate: "" },
  { code: "06003", name: "YUGUMARAN R", shortName: "MR. YUGU", nricFin: "S1538084E", gender: "MALE", department: "SENIOR MANAGEMENT", section: "SINGAPOREAN", designation: "DIRECTOR", fingerId: "06003", email: "YUGU.R@3SI.COM.SG", joinDate: "20-11-2006", resignDate: "" },
  { code: "14001", name: "MOSTAFIZUR RAHMAN", shortName: "MOS", nricFin: "F8205893K", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "PROJECT MANAGER", fingerId: "14001", email: "MOS@3SI.COM.SG", joinDate: "22-05-2014", resignDate: "" },
  { code: "15001", name: "VELLAIKKANNU VADIVELU", shortName: "VELU", nricFin: "F8156721L", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "SENIOR PROJECT ENGINEER", fingerId: "15001", email: "VELU@3SI.COM.SG", joinDate: "17-12-2015", resignDate: "" },
  { code: "16002", name: "PERUMAL GOVINDARASU", shortName: "GOVIN", nricFin: "G7735599K", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "SUPERVISOR", fingerId: "16002", email: "GOVIN@3SI.COM.SG", joinDate: "15-12-2016", resignDate: "" },
  { code: "17001", name: "MALAIKKOLUNDHU KUMARAVEL", shortName: "MALAI", nricFin: "G2431208P", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "SENIOR SERVICE ENGINEER", fingerId: "17001", email: "MALAI@3SI.COM.SG", joinDate: "10-08-2017", resignDate: "" },
  { code: "17004", name: "VISHNU PRAVIN S/O R RAMAYA", shortName: "", nricFin: "S9108646H", gender: "MALE", department: "SYSTEM", section: "SINGAPOREAN", designation: "SYSTEM ENGINEER", fingerId: "17004", email: "VISHNU@3SI.COM.SG", joinDate: "17-12-2017", resignDate: "" },
  { code: "18001", name: "THIBAN RAMADAS", shortName: "THIBAN", nricFin: "S8611739H", gender: "MALE", department: "SENIOR MANAGEMENT", section: "SINGAPOREAN", designation: "SALES MANAGER", fingerId: "18001", email: "THIBAN@3SI.COM.SG", joinDate: "19-03-2018", resignDate: "" },
  { code: "18003", name: "SUJAN AHMED", shortName: "SUJAN", nricFin: "G8122013T", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "PROJECT ENGINEER", fingerId: "18003", email: "SUJAN@3SI.COM.SG", joinDate: "28-06-2018", resignDate: "" },
  { code: "21001", name: "HAQ AMINUL", shortName: "", nricFin: "G8464511M", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "21001", email: "BABUAHAMED1281@GMAIL.COM", joinDate: "15-04-2021", resignDate: "" },
  { code: "21003", name: "SEENUVASAN RATHINAKUMAR", shortName: "KUMAR", nricFin: "G7670588M", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "21003", email: "RATHNA9131@GMAIL.COM", joinDate: "16-07-2021", resignDate: "" },
  { code: "21004", name: "GOVINDARAJU ANBALAGAN", shortName: "ANBA", nricFin: "S2653281G", gender: "MALE", department: "DESIGN", section: "SINGAPOREAN", designation: "SENIOR DRAFTER", fingerId: "21004", email: "GANBA2102@GMAIL.COM", joinDate: "18-10-2021", resignDate: "" },
  { code: "21005", name: "JUSTINDRAN Y", shortName: "JUSTIN", nricFin: "S9324515F", gender: "MALE", department: "AUDIT", section: "SINGAPOREAN", designation: "INTERNAL AUDITOR", fingerId: "21005", email: "JUSTINDRAN@3SI.COM.SG", joinDate: "01-09-2021", resignDate: "" },
  { code: "22002", name: "MIAH RASEL", shortName: "", nricFin: "G7967893M", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "22002", email: "RASELKHAN669901@GMAIL.COM", joinDate: "16-06-2022", resignDate: "" },
  { code: "22004", name: "SAMIGOVINDHAN VIJAYAKUMAR", shortName: "VIJAY", nricFin: "G8917642K", gender: "MALE", department: "SYSTEM", section: "FOREIGN", designation: "SYSTEM MAINTENANCE TECHNICIAN", fingerId: "22004", email: "VIJAY@3SI.COM.SG", joinDate: "27-06-2022", resignDate: "" },
  { code: "22006", name: "MOHAMMAD BILLAL", shortName: "BILLAL", nricFin: "G2227840T", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "SUPERVISOR", fingerId: "22006", email: "BILAL@3SI.COM.SG", joinDate: "26-07-2022", resignDate: "" },
  { code: "22009", name: "KARUNAKARAN PERIYASAMY", shortName: "", nricFin: "G8114161X", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "SUPERVISOR", fingerId: "22009", email: "KARUNA@3SI.COM.SG", joinDate: "26-09-2022", resignDate: "" },
  { code: "23003", name: "SELVARAJ SATHIYASEELAN", shortName: "SATHIA", nricFin: "M3218029Q", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "23003", email: "SATHIYASEELANCSE@GMAIL.COM", joinDate: "01-02-2023", resignDate: "" },
  { code: "23004", name: "KANNAN SURYAPRAKASH", shortName: "SURYA", nricFin: "M3200589J", gender: "MALE", department: "DESIGN", section: "FOREIGN", designation: "DRAFTER / TECHNICIAN", fingerId: "23004", email: "SURYA@3SI.COM.SG", joinDate: "01-02-2023", resignDate: "" },
  { code: "23006", name: "RAJA ARULKUMAR", shortName: "ARUL", nricFin: "G2663565P", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "23006", email: "ARULARASI301107@GMAIL.COM", joinDate: "15-03-2023", resignDate: "" },
  { code: "23010", name: "KATHIRVEL RAMASAMY", shortName: "RAM", nricFin: "G6831665R", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "23010", email: "MITHUNRAM4819@GMAIL.COM", joinDate: "01-07-2023", resignDate: "" },
  { code: "23011", name: "KISHANRAJ PANNIR SELVAM", shortName: "", nricFin: "M3365072P", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "ASSISTANT PROJECT ENGINEER", fingerId: "23011", email: "KISHANRAJ36@GMAIL.COM", joinDate: "01-11-2023", resignDate: "" },
  { code: "23012", name: "MARTIN NG SOO LEONG", shortName: "MARTIN", nricFin: "S7607758D", gender: "MALE", department: "PROCUREMENT", section: "SINGAPOREAN", designation: "PROCUREMENT OFFICER", fingerId: "23012", email: "MARTIN@3SI.COM.SG", joinDate: "01-11-2023", resignDate: "" },
  { code: "23014", name: "MURUGAN SATHISHKUMAR", shortName: "SATHISH", nricFin: "G8824707N", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "23014", email: "SATHISH113248@GMAIL.COM", joinDate: "20-11-2023", resignDate: "" },
  { code: "23016", name: "LAVANIAH PUNNIYAMUTHY", shortName: "LAVANIAH", nricFin: "M3365162N", gender: "FEMALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "ADMIN SUPPORT EXECUTIVE", fingerId: "23016", email: "P.LAVANIAH2912@GMAIL.COM", joinDate: "20-11-2023", resignDate: "" },
  { code: "23020", name: "MUTHUSAMY RAGAVAN", shortName: "", nricFin: "G8784711Q", gender: "MALE", department: "PROJECT", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "23020", email: "RAGAVMUTHU993@GMAIL.COM", joinDate: "13-12-2023", resignDate: "" },
  { code: "24003", name: "LOGESH A/L VEJAYAKUMURAN", shortName: "LOGESH", nricFin: "G6978581L", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "MAINTENANCE & SERVICES COORDINATOR", fingerId: "24003", email: "LOGESH@3SI.COM.SG", joinDate: "04-03-2024", resignDate: "" },
  { code: "24004", name: "ABOOL FEDEBRIC MORIL", shortName: "", nricFin: "G6377427N", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "MAINTENANCE MANAGER", fingerId: "24004", email: "FEDEBRIC@3SI.COM.SG", joinDate: "18-03-2024", resignDate: "" },
  { code: "24007", name: "NIRHUMALAN GANGAN", shortName: "", nricFin: "M3369214L", gender: "MALE", department: "SYSTEM", section: "FOREIGN", designation: "SYSTEM TECHNICIAN", fingerId: "24007", email: "NIRHUMALAN@3SI.COM.SG", joinDate: "20-05-2024", resignDate: "" },
  { code: "24008", name: "HOSSAIN ABIR", shortName: "", nricFin: "M3264632P", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "24008", email: "ABIR7064823@GMAIL.COM", joinDate: "10-06-2024", resignDate: "" },
  { code: "24014", name: "ALI MD ROMJAN", shortName: "HASSAN", nricFin: "G2702820P", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "24014", email: "ALIMDROMJAN15051987@GAMIL.COM", joinDate: "22-07-2024", resignDate: "" },
  { code: "24016", name: "TRIE NOVIYANI BINTI KODIRON", shortName: "TRIE", nricFin: "S9042801B", gender: "FEMALE", department: "SALES & MARKETING", section: "SINGAPOREAN", designation: "ADMIN SUPPORT EXECUTIVE", fingerId: "24016", email: "TRIEKODIRON90@GMAIL.COM", joinDate: "29-07-2024", resignDate: "" },
  { code: "24020", name: "MOLLA FIROZ", shortName: "FIROZ", nricFin: "G2147952M", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "SAFETY COORDINATOR", fingerId: "24020", email: "MOLLAFIROZ4220@GMAIL.COM", joinDate: "02-10-2024", resignDate: "" },
  { code: "24029", name: "NATARAJAN ARAVINDA KUMAR", shortName: "ARAVINDA", nricFin: "M3138902R", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "SYSTEM ENGINEER", fingerId: "24029", email: "ARAVINDA24029@nexahr.local", joinDate: "25-11-2024", resignDate: "" },
  { code: "24030", name: "GOVINDARAJ KOORI SELVAM", shortName: "KOORI", nricFin: "M3016114Q", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "24030", email: "KOORI24030@nexahr.local", joinDate: "25-11-2024", resignDate: "" },
  { code: "24031", name: "TULASI DASS S/O JAYARAM GOVINDASAMY", shortName: "TULASI", nricFin: "S1556513F", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "SINGAPOREAN", designation: "STORE MANAGER", fingerId: "24031", email: "TULASIDASS@3SI.COM.SG", joinDate: "25-11-2024", resignDate: "" },
  { code: "25001", name: "SHIL SHAM SUNDAR", shortName: "", nricFin: "G8156931U", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "25001", email: "SHAMSUNDARSHIL1984@GMAIL.COM", joinDate: "06-02-2025", resignDate: "" },
  { code: "25002", name: "NAVENH PATMANATHAN MOHAN RAJ", shortName: "", nricFin: "M3574913J", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "25002", email: "NAVENHALEXANDER@GMAIL.COM", joinDate: "10-02-2025", resignDate: "" },
  { code: "25003", name: "OSMAN GONI MOHAMMAD", shortName: "", nricFin: "G2139800X", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "25003", email: "OSMANGONIBDRC@GMAIL.COM", joinDate: "11-02-2025", resignDate: "" },
  { code: "25004", name: "PRABHAHARAN RAMASAMY", shortName: "", nricFin: "G3475546P", gender: "MALE", department: "SYSTEM", section: "FOREIGN", designation: "SENIOR SYSTEM ENGINEER", fingerId: "25004", email: "PRABHA@3SI.COM.SG", joinDate: "20-02-2025", resignDate: "" },
  { code: "25005", name: "RAVINDRAN SIVAPRAKASAM", shortName: "", nricFin: "G6165576Q", gender: "MALE", department: "SALES & TECHNOLOGY", section: "FOREIGN", designation: "SALES & TECHNOLOGY MANAGER", fingerId: "25005", email: "SIVAPRAKASHAM@HOTMAIL.COM", joinDate: "02-04-2025", resignDate: "" },
  { code: "25006", name: "RAMACHANDRAN MOHAN DINESH KUMAR", shortName: "", nricFin: "G6071918M", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICAL MANAGER", fingerId: "25006", email: "DINESH4762@YAHOO.CO.IN", joinDate: "10-03-2025", resignDate: "" },
  { code: "25010", name: "GIRIDHARI RAMAMOORTHY", shortName: "GIRI", nricFin: "G6006500X", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "REGIONAL MANAGER", fingerId: "25010", email: "GIRIDHARI.R@3SI.COM.SG", joinDate: "01-10-2025", resignDate: "" },
  { code: "25011", name: "SHAGIV RAJ DAVID", shortName: "", nricFin: "T0236747A", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "SINGAPOREAN", designation: "SERVICE ENGINEER", fingerId: "25011", email: "SHAGIV.D@3SI.COM.SG", joinDate: "01-06-2025", resignDate: "" },
  { code: "25012", name: "MUTHALIAPPAN KAILASANATHAN", shortName: "", nricFin: "M3142534K", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "SYSTEM TECHNICIAN", fingerId: "25012", email: "KAILASKOJO@GMAIL.COM", joinDate: "23-07-2025", resignDate: "" },
  { code: "25014", name: "SATHISKUMAR RAMA", shortName: "", nricFin: "G8667291Q", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "FOREIGN", designation: "TECHNICIAN", fingerId: "25014", email: "SATHISKUMAR9653@GMAIL.COM", joinDate: "01-09-2025", resignDate: "" },
  { code: "25015", name: "MOHAMED ALAUDEEN MOHAMED ASLAM", shortName: "", nricFin: "T0172153J", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "NONE", designation: "INTERN", fingerId: "25015", email: "MOHAMEDASLAM453@GMAIL.COM", joinDate: "15-09-2025", resignDate: "" },
  { code: "25016", name: "RANA", shortName: "", nricFin: "G6892545U", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "NONE", designation: "TECHNICIAN", fingerId: "25016", email: "RANAHAMID3205@GMAIL.COM", joinDate: "12-09-2025", resignDate: "" },
  { code: "25017", name: "FAITH JR. NEGAPATAN", shortName: "", nricFin: "G3113184M", gender: "MALE", department: "FINANCE", section: "SINGAPORE PR", designation: "ACCOUNTANT", fingerId: "25017", email: "FAITHJR.NEGAPATAN@YAHOO.COM", joinDate: "17-09-2025", resignDate: "" },
  { code: "25018", name: "MUHAMMAD HAQQ ARSHAQ MUHAMMAD NUR HAZLI", shortName: "", nricFin: "T0721944F", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "SINGAPOREAN", designation: "INTERN", fingerId: "25018", email: "HAQQARSHAQ@GMAIL.COM", joinDate: "30-10-2025", resignDate: "" },
  { code: "25019", name: "TAY SHANE", shortName: "", nricFin: "T0720948C", gender: "MALE", department: "OPERATION / MAINTENANCE & SERVICES", section: "SINGAPOREAN", designation: "INTERN", fingerId: "25019", email: "CABBY.WAIST.0X@ICLOUD.COM", joinDate: "30-10-2025", resignDate: "" },
  { code: "25020", name: "SAKTHIVEL MUTHULAKSHMI", shortName: "", nricFin: "G3120824L", gender: "FEMALE", department: "FINANCE", section: "FOREIGN", designation: "ACCOUNT ASSISTANT", fingerId: "25020", email: "MUTHULAXMIPERIYASAMY@GMAIL.COM", joinDate: "15-10-2025", resignDate: "" },
  { code: "25021", name: "MUHAMMAD DANISH BIN YUSRI", shortName: "DANISH", nricFin: "", gender: "MALE", department: "PROJECT", section: "SINGAPOREAN", designation: "INTERN", fingerId: "25021", email: "HULKDANISH22@GMAIL.COM", joinDate: "10-11-2025", resignDate: "" },
  { code: "25022", name: "ALI MUSLIH BIN MOHAMED AFANDI", shortName: "", nricFin: "", gender: "MALE", department: "PROJECT", section: "SINGAPOREAN", designation: "INTERN", fingerId: "25022", email: "ALIAZTEC58@GMAIL.COM", joinDate: "10-11-2025", resignDate: "" },
  { code: "25023", name: "MOHAMMAD ERYAN SHAH BIN SAMSUDIN", shortName: "", nricFin: "", gender: "MALE", department: "PROJECT", section: "SINGAPOREAN", designation: "INTERN", fingerId: "25023", email: "ERYANSHAH@GMAIL.COM", joinDate: "10-11-2025", resignDate: "" },
];

async function importEmployees() {
  console.log("Starting employee import...");
  
  let created = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const emp of employeesData) {
    try {
      const existingByEmail = await db.select().from(users).where(eq(users.email, emp.email.toLowerCase())).limit(1);
      const existingByCode = await db.select().from(users).where(eq(users.employeeCode, emp.code)).limit(1);
      
      if (existingByEmail.length > 0 || existingByCode.length > 0) {
        console.log(`Skipping ${emp.name} - already exists`);
        skipped++;
        continue;
      }

      const username = emp.code.toLowerCase();
      const nricSuffix = emp.nricFin ? emp.nricFin.slice(-4) : Math.random().toString(36).substring(2, 6);
      const initialPassword = `${emp.code}${nricSuffix}`;
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      await db.insert(users).values({
        email: emp.email.toLowerCase(),
        username,
        name: emp.name,
        passwordHash,
        role: "user",
        isApproved: true,
        employeeCode: emp.code,
        shortName: emp.shortName || null,
        nricFin: emp.nricFin || null,
        gender: emp.gender || null,
        department: emp.department || null,
        section: emp.section || null,
        designation: emp.designation || null,
        fingerId: emp.fingerId || null,
        joinDate: emp.joinDate || null,
        resignDate: emp.resignDate || null,
      });

      console.log(`Created user: ${emp.name} (${username})`);
      created++;
    } catch (error: any) {
      console.error(`Error creating ${emp.name}:`, error.message);
      errors.push(`${emp.name}: ${error.message}`);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log("Errors:", errors);
  }

  process.exit(0);
}

importEmployees().catch(console.error);
