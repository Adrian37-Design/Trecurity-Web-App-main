#!/bin/bash
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:?'DB_PASS must be set'}"
DB_NAME="${DB_NAME:-trecurity}"

echo "--- PRODUCTION SERVER AUDIT FOR XCELAV1 ---"
echo "Current Server Time: $(date)"

# 1. Get Vehicle ID and Last Seen
VEHICLE_INFO=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -N -e "SELECT id, last_seen FROM vehicle WHERE number_plate='XCELAV1'")
V_ID=$(echo $VEHICLE_INFO | awk '{print $1}')
LAST_SEEN=$(echo $VEHICLE_INFO | awk '{print $2, $3}')

if [ -z "$V_ID" ]; then
    echo "❌ ERROR: Vehicle XCELAV1 not found in 'vehicle' table."
    exit 1
fi

echo "Vehicle ID: $V_ID"
echo "Last Seen: $LAST_SEEN"

# 2. Count points in the last 12 hours
POINT_COUNT=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -N -e "SELECT COUNT(*) FROM tracking_data WHERE vehicle_id='$V_ID' AND time_from > DATE_SUB(NOW(), INTERVAL 12 HOUR)")
echo "Points in last 12 hours: $POINT_COUNT"

# 3. Get the very latest point
LATEST_POINT=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -N -e "SELECT time_from, ignition FROM tracking_data WHERE vehicle_id='$V_ID' ORDER BY time_from DESC LIMIT 1")
echo "Latest Point in DB: $LATEST_POINT"

# 4. Check for any points in the last hour specifically
RECENT_POINTS=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "SELECT time_from, ignition, state, speed FROM tracking_data WHERE vehicle_id='$V_ID' AND time_from > DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY time_from DESC")
echo -e "\nRecent Points (Last 1 hour):\n$RECENT_POINTS"
