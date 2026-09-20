/**
 * ORGANIZATIONS SEED SCRIPT
 * Seeds sample organizations for multi-tenant testing
 */

import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig.js';
import {
    getFirestore,
    collection,
    setDoc,
    doc,
    serverTimestamp,
} from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const organizations = [
    {
        id: 'iit-delhi',
        name: 'Indian Institute of Technology, Delhi',
        shortName: 'IIT Delhi',
        type: 'university',
        location: 'New Delhi, India',
        email: 'admin@iitd.ac.in',
        phone: '+91 11 2659 1000',
        website: 'https://home.iitd.ac.in',
        status: 'active',
        verified: true,
        totalUsers: 15420,
        totalStudents: 12000,
        totalFaculty: 850,
    },
    {
        id: 'stanford',
        name: 'Stanford University',
        shortName: 'Stanford',
        type: 'university',
        location: 'Stanford, California, USA',
        email: 'admin@stanford.edu',
        phone: '+1 650-723-2300',
        website: 'https://www.stanford.edu',
        status: 'active',
        verified: true,
        totalUsers: 12850,
        totalStudents: 10200,
        totalFaculty: 720,
    },
    {
        id: 'nit-warangal',
        name: 'National Institute of Technology, Warangal',
        shortName: 'NIT Warangal',
        type: 'institute',
        location: 'Warangal, Telangana, India',
        email: 'admin@nitw.ac.in',
        phone: '+91 870 246 2000',
        website: 'https://www.nitw.ac.in',
        status: 'active',
        verified: true,
        totalUsers: 8920,
        totalStudents: 7500,
        totalFaculty: 520,
    },
    {
        id: 'dtu',
        name: 'Delhi Technological University',
        shortName: 'DTU',
        type: 'university',
        location: 'New Delhi, India',
        email: 'admin@dtu.ac.in',
        phone: '+91 11 2787 1023',
        website: 'http://www.dtu.ac.in',
        status: 'pending',
        verified: false,
        totalUsers: 7650,
        totalStudents: 6200,
        totalFaculty: 480,
    },
    {
        id: 'mit',
        name: 'Massachusetts Institute of Technology',
        shortName: 'MIT',
        type: 'university',
        location: 'Cambridge, Massachusetts, USA',
        email: 'admin@mit.edu',
        phone: '+1 617-253-1000',
        website: 'https://www.mit.edu',
        status: 'active',
        verified: true,
        totalUsers: 18500,
        totalStudents: 14800,
        totalFaculty: 1050,
    },
    {
        id: 'bits-pilani',
        name: 'BITS Pilani',
        shortName: 'BITS',
        type: 'institute',
        location: 'Pilani, Rajasthan, India',
        email: 'admin@bits-pilani.ac.in',
        phone: '+91 1596 245 073',
        website: 'https://www.bits-pilani.ac.in',
        status: 'pending',
        verified: false,
        totalUsers: 9200,
        totalStudents: 7800,
        totalFaculty: 620,
    },
];

async function main() {
    console.log('🏢 Seeding Organizations...');

    for (const org of organizations) {
        await setDoc(doc(db, 'organizations', org.id), {
            ...org,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log(`  ✓ Created: ${org.name}`);
    }

    console.log('\\n✅ Organizations seeding complete!');
    console.log(`Total organizations: ${organizations.length}`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
