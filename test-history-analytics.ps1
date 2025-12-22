# Test History and Analytics Endpoints
# This script tests the fixed endpoints to verify they now return data

$vehicleId = "cmjg5u8pc0002vhvsznrphxre"
$API_BASE = "http://localhost:3000/api/vehicle"

# You need to get a valid JWT token from the browser
# 1. Log in to http://localhost:3000
# 2. Open DevTools (F12) -> Console
# 3. Run: localStorage.getItem('token')
# 4. Copy the token value (without quotes)
# 5. Paste it below

$token = "YOUR_JWT_TOKEN_HERE"  # REPLACE THIS

Write-Host "=== TESTING HISTORY & ANALYTICS ENDPOINTS ===" -ForegroundColor Cyan
Write-Host ""

# Calculate date range (last 24 hours)
$dateFrom = (Get-Date).AddDays(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$dateTo = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Test 1: History Endpoint
Write-Host "Test 1: Fetching vehicle history..." -ForegroundColor Yellow
$historyUrl = "$API_BASE/$vehicleId/history?date_from=$dateFrom&date_to=$dateTo"

try {
    $headers = @{
        "Cookie" = "token=$token"
    }
    
    $historyResponse = Invoke-RestMethod -Uri $historyUrl -Method Get -Headers $headers
    
    if ($historyResponse.data -and $historyResponse.data.Count -gt 0) {
        Write-Host "✓ SUCCESS: Found $($historyResponse.data.Count) tracking records" -ForegroundColor Green
        Write-Host "  First record:" -ForegroundColor Gray
        Write-Host "    Lat: $($historyResponse.data[0].lat)" -ForegroundColor Gray
        Write-Host "    Lon: $($historyResponse.data[0].lon)" -ForegroundColor Gray
        Write-Host "    Time: $($historyResponse.data[0].time_from)" -ForegroundColor Gray
    }
    else {
        Write-Host "✗ No data returned (might be no tracking data in range)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Analytics Endpoint  
Write-Host "Test 2: Fetching vehicle analytics..." -ForegroundColor Yellow
$analyticsUrl = "$API_BASE/$vehicleId/analytics?date_from=$dateFrom&date_to=$dateTo"

try {
    $analyticsResponse = Invoke-RestMethod -Uri $analyticsUrl -Method Get -Headers $headers
    
    if ($analyticsResponse.data -and $analyticsResponse.data.Count -gt 0) {
        Write-Host "✓ SUCCESS: Found $($analyticsResponse.data.Count) time intervals" -ForegroundColor Green
        Write-Host "  Sample interval data:" -ForegroundColor Gray
        $sample = $analyticsResponse.data[0].data
        Write-Host "    Avg Speed: $($sample.speed)" -ForegroundColor Gray
        Write-Host "    Drive Time: $($sample.drive_time)" -ForegroundColor Gray
        Write-Host "    Park Time: $($sample.park_time)" -ForegroundColor Gray
    }
    else {
        Write-Host "✗ No data returned (might be no tracking data in range)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: If you get 401 errors, you need to:" -ForegroundColor Yellow
Write-Host "1. Log in to http://localhost:3000"
Write-Host "2. Open DevTools (F12) -> Application -> Cookies"
Write-Host "3. Copy the 'token' value"
Write-Host "4. Update this script with your token"
