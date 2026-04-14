const moment = require('moment');

// Mock data and interval generation
function floorTime(time) {
    const date = new Date(time);
    if (date.getMinutes() <= 30 || (date.getMinutes() === 30 && date.getSeconds() === 0 && date.getMilliseconds() === 0)) {
        date.setMinutes(30, 0, 0)
    } else {
        date.setHours(date.getHours() + 1)
        date.setMinutes(0, 0, 0)
    }
    return date;
}

const dateFrom = new Date("2026-04-04T07:00:00Z");
const dateTo = new Date("2026-04-04T09:00:00Z");

// Mock point: 8:00 AM report with 60 min delta
const pTime = new Date("2026-04-04T08:00:00Z");
const deltaTime = 60; // 1 hour duration (starts at 7:00 AM)
const enrichedPoint = {
    time_from: pTime,
    delta_time: deltaTime,
    window_end: pTime,
    window_start: moment(pTime).subtract(deltaTime, 'minutes').toDate()
};

const enrichedTrackingData = [enrichedPoint];

// Interval generation
const diff = moment(dateTo).diff(dateFrom, 'minutes');
let interval_groups = Array.from({ length: Math.floor(diff / 30) }, (_, k) => {
    return moment(floorTime(dateFrom)).add((30 * (k + 1)), 'minutes').toDate()
});
interval_groups = [floorTime(dateFrom), ...interval_groups, floorTime(dateTo)]
interval_groups = interval_groups.map(i => i.toString())
interval_groups = [...new Set(interval_groups)]

console.log('--- VERIFYING V6 DISTRIBUTION ---');
console.log('Point window:', enrichedPoint.window_start.toISOString(), 'to', enrichedPoint.window_end.toISOString());

const finalData = interval_groups.map((interval_group) => {
    const iStart = moment(new Date(interval_group)).subtract(30, 'minutes').toDate();
    const iEnd = new Date(interval_group);

    const data = enrichedTrackingData.map(pt => {
        const overlapStart = Math.max(pt.window_start.getTime(), iStart.getTime());
        const overlapEnd = Math.min(pt.window_end.getTime(), iEnd.getTime());
        const overlapMins = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60));

        if (overlapMins > 0) {
            return { delta_time: overlapMins };
        }
        return null;
    }).filter(x => x !== null);

    const totalIntervalMins = data.reduce((sum, item) => sum + item.delta_time, 0);
    return { interval_group, totalIntervalMins };
});

let totalDistributed = 0;
finalData.forEach(item => {
    console.log(`Interval: ${item.interval_group} | Mins: ${item.totalIntervalMins}`);
    totalDistributed += item.totalIntervalMins;
});

console.log(`\nTotal distributed: ${totalDistributed} mins`);

if (totalDistributed === 60) {
    console.log('✅ SUCCESS: Time distributed correctly!');
} else {
    console.log(`❌ FAILURE: Distribution error. Expected 60, got ${totalDistributed}`);
}
