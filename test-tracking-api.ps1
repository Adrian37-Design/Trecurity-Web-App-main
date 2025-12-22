# Manual API Testing Script for Offline Data Synchronization
# This script demonstrates how to send tracking data to the API

$API_URL = "http://localhost:3000/api/device/tracking-data"

# Get vehicle ID (replace with actual ID from your database)
$VEHICLE_ID = "clxyz123example"  # REPLACE THIS AFTER RUNNING THE QUERY

Write-Host "=== MANUAL API TESTING ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Send a single tracking point
Write-Host "Test 1: Sending single tracking point..." -ForegroundColor Yellow

$singlePoint = @{
    vehicle_id = $VEHICLE_ID
    lat = -17.8252
    lon = 31.0335
    speed = 60
    time_from = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    time_to = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    altitude = 1500
    course = 90
    hdop = 1.2
    signal_strength = 95
    satellites = 12
    ip_address = "192.168.1.100"
    state = "MOVING"
    age = 0
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $API_URL -Method Post -Body $singlePoint -ContentType "application/json"
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Send batch of tracking points (simulating offline sync)
Write-Host "Test 2: Sending batch of 3 tracking points..." -ForegroundColor Yellow

$now = Get-Date
$batchPoints = @(
    @{
        vehicle_id = $VEHICLE_ID
        lat = -17.8250
        lon = 31.0330
        speed = 50
        time_from = $now.AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        time_to = $now.AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        altitude = 1495
        course = 85
        hdop = 1.1
        signal_strength = 90
        satellites = 11
        ip_address = "192.168.1.100"
        state = "MOVING"
        age = 0
    },
    @{
        vehicle_id = $VEHICLE_ID
        lat = -17.8255
        lon = 31.0340
        speed = 65
        time_from = $now.AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        time_to = $now.AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        altitude = 1505
        course = 95
        hdop = 1.0
        signal_strength = 98
        satellites = 13
        ip_address = "192.168.1.100"
        state = "MOVING"
        age = 0
    },
    @{
        vehicle_id = $VEHICLE_ID
        lat = -17.8260
        lon = 31.0350
        speed = 70
        time_from = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        time_to = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        altitude = 1510
        course = 100
        hdop = 0.9
        signal_strength = 100
        satellites = 14
        ip_address = "192.168.1.100"
        state = "MOVING"
        age = 0
    }
) | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $API_URL -Method Post -Body $batchPoints -ContentType "application/json"
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TESTING COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check vehicle 'last_seen' in dashboard: http://localhost:3000" 
Write-Host "2. View tracking history for this vehicle"
Write-Host "3. Verify old data doesn't overwrite newer positions"
