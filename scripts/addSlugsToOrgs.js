/**
 * ADD SLUGS TO EXISTING ORGANIZATIONS
 * Updates all organizations with URL-friendly slugs
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

// Predefined slugs for existing organizations
const orgSlugs = {
    'pec': 'pec',
    'iit-delhi': 'iit-delhi',
    'stanford': 'stanford',
    'nit-warangal': 'nit-warangal',
    'dtu': 'dtu',
    'mit': 'mit',
    'bits-pilani': 'bits-pilani',
};

function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

async function addSlugsToOrganizations() {
    console.log('🔄 Adding slugs to organizations...\n');

    try {
        const orgsSnapshot = await getDocs(collection(db, 'organizations'));
        const orgs = orgsSnapshot.docs;

        console.log(`Found ${orgs.length} organizations`);

        let updated = 0;
        let skipped = 0;

        for (const orgDoc of orgs) {
            const orgData = orgDoc.data();
            const orgId = orgDoc.id;

            // Skip if already has slug
            if (orgData.slug) {
                console.log(`  ⚠ Skipped ${orgData.name || orgId} - already has slug: ${orgData.slug}`);
                skipped++;
                continue;
            }

            // Use predefined slug or generate from name
            const slug = orgSlugs[orgId] || generateSlug(orgData.name || orgId);

            // Update organization with slug
            await updateDoc(doc(db, 'organizations', orgId), {
                slug: slug,
                updatedAt: serverTimestamp(),
            });

            console.log(`  ✓ Updated ${orgData.name || orgId} →  slug: ${slug}`);
            updated++;
        }

        console.log('\n✅ Slug assignment complete!');
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${orgs.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

addSlugsToOrganizations();
