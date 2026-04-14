/**
 * VERIFICATION SCRIPT V3: Loose Operating Hours Logic
 */
const moment = require('moment');

function simulateAnalytics(trackingData) {
    const enrichedData = trackingData.map((point, index, array) => {
        let deltaTime = 0;
        if (index > 0) {
            const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
            
            // --- THE NEW LOOSE LOGIC ---
            const isIgnitionOn = !!point.ignition;
            const isPrevIgnitionOff = array[index - 1].ignition === false;
            const gapThreshold = (isIgnitionOn && !isPrevIgnitionOff) ? 720 : 30;
            
            deltaTime = (timeDiff > 0 && timeDiff <= gapThreshold) ? timeDiff : 0;
        }
        return { ...point, delta_time: deltaTime };
    });

    const totalMinutes = enrichedData.reduce((sum, p) => sum + (p.ignition ? (p.delta_time || 0) : 0), 0);
    return {
        totalHours: (totalMinutes / 60).toFixed(2),
        points: enrichedData.map(p => ({ ignition: p.ignition, prevIgnition: p.prev, delta: p.delta_time }))
    };
}

// TEST SCENARIO: Heartbeat sequence with imperfect ignition data
// Interval: 65 mins
const testData = [
    { time_from: '2026-04-03T10:00:00Z', ignition: null }, // Unknown start
    { time_from: '2026-04-03T11:05:00Z', ignition: true }, // 65 min gap, Current is ON
    { time_from: '2026-04-03T12:10:00Z', ignition: true }  // 65 min gap, Continuing ON
];

const result = simulateAnalytics(testData);

// OLD Logic would return 0.00 because index 0 was null.
console.log('--- OPERATING HOURS VERIFICATION V3 ---');
console.log('Scenario: 65-min gaps starting with null status');
console.log(`Result: ${result.totalHours} hours`);

if (parseFloat(result.totalHours) > 2.1) {
    console.log('✅ SUCCESS: Gaps are now correctly counted as long as the current point is ON.');
} else {
    console.log('❌ FAILURE: Gaps are still being discarded.');
    process.exit(1);
}
