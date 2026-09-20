import { initializeApp } from "firebase/app";
import { firebaseConfig } from './firebaseConfig.js';
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const departments = [
  "Computer Science & Engineering",
  "Electronics & Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Production & Industrial Engineering",
];

async function seedChatRooms() {
  const orgId = "pec";
  console.log("🔥 Seeding chat rooms...");

  // 1. General Chat
  await setDoc(doc(db, "chatRooms", "general"), {
    type: "general",
    organizationId: orgId,
    title: "General Chat",
    createdAt: serverTimestamp()
  });

  // 2. Semester Chats (1-8)
  for (let sem = 1; sem <= 8; sem++) {
    await setDoc(doc(db, "chatRooms", `semester-${sem}`), {
      type: "semester",
      semester: sem,
      organizationId: orgId,
      title: `Semester ${sem} Chat`,
      createdAt: serverTimestamp()
    });
  }

  // 3. Department Chats
  for (const dept of departments) {
    const deptId = dept.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
    await setDoc(doc(db, "chatRooms", `dept-${deptId}`), {
      type: "department",
      department: dept, // Matches your DB requirement
      organizationId: orgId,
      title: `${dept} Chat`,
      createdAt: serverTimestamp()
    });
    console.log(`✅ Created: ${dept}`);
  }

  console.log("\n🚀 All rooms seeded successfully!");
  process.exit(0);
}

seedChatRooms().catch(console.error);