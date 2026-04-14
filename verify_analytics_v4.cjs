/**
 * VERIFICATION SCRIPT V4: Predecessor Padding
 */
const moment = require('moment');

function simulateAnalytics(trackingData, dateFrom) {
    const enrichedData = trackingData.map((point, index, array) => {
        let deltaTime = 0;
        if (index > 0) {
            const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
            
            const isIgnitionOn = !!point.ignition;
            const isPrevIgnitionOff = array[index - 1].ignition === false;
            const gapThreshold = (isIgnitionOn && !isPrevIgnitionOff) ? 720 : 30;
            
            deltaTime = (timeDiff > 0 && timeDiff <= gapThreshold) ? timeDiff : 0;
        }
        return { ...point, delta_time: deltaTime };
    });

    // Filter out the predecessor for the final tally (mimics interval groups filter)
    const finalPoints = enrichedData.filter(p => moment(p.time_from).isSameOrAfter(dateFrom));
    
    const totalMinutes = finalPoints.reduce((sum, p) => sum + (p.ignition ? (p.delta_time || 0) : 0), 0);
    return {
        totalHours: (totalMinutes / 60).toFixed(2),
        paddedPointsCount: enrichedData.length,
        finalPointsCount: finalPoints.length,
        durations: finalPoints.map(p => p.delta_time)
    };
}

// TEST SCENARIO: 24-hour range starting at 10:00 PM (22:00)
const dateFrom = '2026-04-03T22:00:00Z';

// Data set
const testData = [
    { time_from: '2026-04-03T21:00:00Z', ignition: true }, // THE PREDECESSOR (1 hour before range)
    { time_from: '2026-04-03T22:05:00Z', ignition: true }, // FIRST POINT IN RANGE (65 min gap)
    { time_from: '2026-04-03T23:10:00Z', ignition: true }  // 65 min gap
];

const result = simulateAnalytics(testData, dateFrom);

console.log('--- ANALYTICS VERIFICATION V4 ---');
console.log('Scenario: 65-min gaps with one predecessor point');
console.log(`Total Hours in Range: ${result.totalHours} hours`);
console.log(`Calculated Durations: ${JSON.stringify(result.durations)}`);

// Expected: 2.17 hours (65 + 65 = 130 mins)
if (parseFloat(result.totalHours) > 2.1) {
    console.log('✅ SUCCESS: Predecessor padding correctly captured the duration for the first point in range.');
} else {
    console.log('❌ FAILURE: First point still has 0 duration.');
    process.exit(1);
}
