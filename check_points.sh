#!/bin/bash
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:?'DB_PASS must be set'}"
DB_NAME="${DB_NAME:-trecurity}"

# Get Vehicle ID
V_ID=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -N -e "SELECT id FROM vehicle WHERE number_plate='XCELAV1'")

if [ -z "$V_ID" ]; then
    echo "Vehicle XCELAV1 not found."
    exit 1
fi

echo "--- TRACKING DATA LOGS FOR XCELAV1 ($V_ID) ---"
mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "SELECT time_from, ignition, state, speed, lat, lon FROM tracking_data WHERE vehicle_id='$V_ID' ORDER BY time_from DESC LIMIT 20;"
echo "--- END OF LOGS ---"
