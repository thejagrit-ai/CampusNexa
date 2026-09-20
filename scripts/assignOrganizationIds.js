/**
 * ASSIGN ORGANIZATION IDS TO EXISTING USERS
 * Makes existing users multi-tenant ready
 */

import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig.js';
import {
    getFirestore,
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
} from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function assignOrganizationIds() {
    console.log('🔄 Assigning organizationId to existing users...\n');

    try {
        // Get all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs;

        console.log(`Found ${users.length} users`);

        // Assign all existing users to PEC organization
        // In a real multi-tenant system, you'd determine this based on user data
        const defaultOrgId = 'pec'; // Punjab Engineering College

        let updated = 0;
        let skipped = 0;

        for (const userDoc of users) {
            const userData = userDoc.data();

            // Skip if already has organizationId
            if (userData.organizationId) {
                console.log(`  ⚠ Skipped ${userData.email || userDoc.id} - already has organizationId`);
                skipped++;
                continue;
            }

            // Update user with organizationId
            await updateDoc(doc(db, 'users', userDoc.id), {
                organizationId: defaultOrgId,
                updatedAt: serverTimestamp(),
            });

            console.log(`  ✓ Updated ${userData.email || userDoc.id} → organizationId: ${defaultOrgId}`);
            updated++;
        }

        console.log('\n✅ Organization ID assignment complete!');
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${users.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

assignOrganizationIds();
