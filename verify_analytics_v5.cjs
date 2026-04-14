/**
 * VERIFICATION SCRIPT V5: Type-Safe Analytics
 */
const moment = require('moment');

function simulateAnalytics(trackingData, dateFrom) {
    const enrichedData = trackingData.map((point, index, array) => {
        let deltaTime = 0;
        if (index > 0) {
            const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
            
            // --- THE NEW TYPE-SAFE LOGIC ---
            const isIgnitionOn = point.ignition === true || point.ignition === 'true' || point.ignition === 1 || point.ignition === '1';
            const isPrevIgnitionOff = (array[index - 1].ignition === false || array[index - 1].ignition === 'false' || array[index - 1].ignition === 0 || array[index - 1].ignition === '0');
            const gapThreshold = (isIgnitionOn && !isPrevIgnitionOff) ? 720 : 30;
            
            deltaTime = (timeDiff > 0 && timeDiff <= gapThreshold) ? timeDiff : 0;
        }
        return { ...point, delta_time: deltaTime };
    });

    const finalPoints = enrichedData.filter(p => moment(p.time_from).isSameOrAfter(dateFrom));
    const totalMinutes = finalPoints.reduce((sum, p) => {
        const isCurrentlyOn = p.ignition === true || p.ignition === 'true' || p.ignition === 1 || p.ignition === '1';
        return sum + (isCurrentlyOn ? (p.delta_time || 0) : 0);
    }, 0);

    return {
        totalHours: (totalMinutes / 60).toFixed(2),
        points: finalPoints.map(p => ({ ignition: p.ignition, delta: p.delta_time }))
    };
}

// TEST SCENARIO: Mixed Type Data (Booleans, Strings, Numbers)
const dateFrom = '2026-04-03T22:00:00Z';
const testData = [
    { time_from: '2026-04-03T21:00:00Z', ignition: "1" },  // String "1"
    { time_from: '2026-04-03T22:05:00Z', ignition: 1 },    // Number 1
    { time_from: '2026-04-03T23:10:00Z', ignition: "true" } // String "true"
];

const result = simulateAnalytics(testData, dateFrom);

console.log('--- ANALYTICS VERIFICATION V5 ---');
console.log('Scenario: String/Number ignition reports across a 2.17h period');
console.log(`Total Hours: ${result.totalHours}`);

// Expected: 2.17 hours
if (parseFloat(result.totalHours) > 2.1) {
    console.log('✅ SUCCESS: Type-safe parsing correctly identified ignition status.');
} else {
    console.log('❌ FAILURE: Total hours is 0 or low. Type-safe parsing failed.');
    process.exit(1);
}
