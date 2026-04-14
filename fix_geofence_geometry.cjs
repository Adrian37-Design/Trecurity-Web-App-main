/**
 * fix_geofence_geometry.cjs
 * 
 * Fixes geofences whose geometry was stored as a JSON-encoded STRING
 * (e.g. "[{\"lat\":...}]") instead of a proper JSON ARRAY.
 * 
 * This happened because geofence-upsert.ts incorrectly used JSON.stringify()
 * before passing geometry to Prisma's Json column.
 * 
 * Run with: node fix_geofence_geometry.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGeofenceGeometry() {
    console.log('Checking for corrupted geofence geometry...');

    const geofences = await prisma.geofence.findMany({
        include: { vehicle: { select: { number_plate: true } } }
    });

    let fixed = 0;
    let skipped = 0;

    for (const geofence of geofences) {
        const geo = geofence.geometry;

        // If geometry is a string (double-encoded JSON), fix it
        if (typeof geo === 'string') {
            try {
                const parsed = JSON.parse(geo);
                console.log(`  [FIX] Vehicle ${geofence.vehicle?.number_plate}: repairing string geometry → array (${parsed.length} points)`);
                await prisma.geofence.update({
                    where: { id: geofence.id },
                    data: { geometry: parsed }  // Store as proper JSON array
                });
                fixed++;
            } catch (e) {
                console.error(`  [ERROR] Vehicle ${geofence.vehicle?.number_plate}: could not parse geometry:`, geo);
            }
        } else if (Array.isArray(geo)) {
            console.log(`  [OK] Vehicle ${geofence.vehicle?.number_plate}: geometry is already an array (${geo.length} points)`);
            skipped++;
        } else {
            console.log(`  [WARN] Vehicle ${geofence.vehicle?.number_plate}: unexpected geometry type: ${typeof geo}`);
        }
    }

    console.log(`\nDone. Fixed: ${fixed}, Already OK: ${skipped}`);
    await prisma.$disconnect();
}

fixGeofenceGeometry().catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
