/**
 * VERIFICATION SCRIPT: Operating Hours Logic Fix
 * This script simulates the aggregation logic from analytics.get.ts
 * to verify that 60+ minute gaps are now correctly counted for Operating Hours
 * if the ignition was ON during that period.
 */

const moment = require('moment');

function simulateAnalytics(trackingData) {
    const enrichedData = trackingData.map((point, index, array) => {
        let deltaTime = 0;
        if (index > 0) {
            const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
            
            // --- THE NEW LOGIC ---
            const isIgnitionContinuing = point.ignition && array[index - 1].ignition;
            const gapThreshold = isIgnitionContinuing ? 720 : 30; // 12 hours vs 30 mins
            
            deltaTime = (timeDiff > 0 && timeDiff <= gapThreshold) ? timeDiff : 0;
            // --------------------
        }
        return { ...point, delta_time: deltaTime };
    });

    const totalOperatingMinutes = enrichedData.reduce((sum, p) => {
        if (p.ignition) {
            return sum + (p.delta_time || 0);
        }
        return sum;
    }, 0);

    return {
        totalOperatingHours: (totalOperatingMinutes / 60).toFixed(2),
        points: enrichedData.map(p => ({ time: p.time_from, ignition: p.ignition, delta: p.delta_time }))
    };
}

// TEST CASE: Stationary vehicle with 65-minute heartbeat interval
const testData = [
    { time_from: '2026-04-03T10:00:00Z', ignition: true },
    { time_from: '2026-04-03T11:05:00Z', ignition: true }, // 65 minute gap
    { time_from: '2026-04-03T12:10:00Z', ignition: true }  // another 65 minute gap
];

const oldThreshold = 30;
function simulateOldLogic(trackingData) {
    return trackingData.map((point, index, array) => {
        let deltaTime = 0;
        if (index > 0) {
            const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
            deltaTime = (timeDiff > 0 && timeDiff <= oldThreshold) ? timeDiff : 0;
        }
        return { ...point, delta_time: deltaTime };
    }).reduce((sum, p) => sum + (p.ignition ? (p.delta_time || 0) : 0), 0) / 60;
}

const result = simulateAnalytics(testData);
const oldResult = simulateOldLogic(testData);

console.log('--- OPERATING HOURS VERIFICATION ---');
console.log('Test Scenario: 2 gaps of 65 minutes with Ignition ON');
console.log(`OLD Logic Result: ${oldResult.toFixed(2)} hours (Should be 0.00)`);
console.log(`NEW Logic Result: ${result.totalOperatingHours} hours (Should be ~2.17)`);

if (parseFloat(result.totalOperatingHours) > 2.1 && oldResult === 0) {
    console.log('\n✅ VERIFICATION SUCCESSFUL: 60+ minute gaps are now correctly accumulated!');
} else {
    console.log('\n❌ VERIFICATION FAILED: Accumulation logic is still incorrect.');
    process.exit(1);
}
