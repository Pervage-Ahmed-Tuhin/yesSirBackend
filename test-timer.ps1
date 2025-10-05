# Test Server Attendance Timer

Write-Host "=== Testing Attendance Timer Server ===" -ForegroundColor Cyan
Write-Host ""

# Get classroom ID from user
$classroomId = Read-Host "Enter Classroom ID to test (or press Enter for test ID)"
if ([string]::IsNullOrWhiteSpace($classroomId)) {
    $classroomId = "test-classroom-123"
    Write-Host "Using test classroom ID: $classroomId" -ForegroundColor Yellow
}

$baseUrl = "http://localhost:3000/api/attendance"

Write-Host ""
Write-Host "1. Starting Attendance Session..." -ForegroundColor Green
$startResponse = Invoke-RestMethod -Uri "$baseUrl/start-session/$classroomId" -Method Post -ContentType "application/json"

Write-Host "Response:" -ForegroundColor Cyan
$startResponse | ConvertTo-Json -Depth 5

if ($startResponse.success) {
    Write-Host ""
    Write-Host "✓ Session started successfully!" -ForegroundColor Green
    Write-Host "  Session ID: $($startResponse.sessionId)" -ForegroundColor Gray
    Write-Host "  Started At: $($startResponse.startedAt)" -ForegroundColor Gray
    Write-Host "  Expires At: $($startResponse.expiresAt)" -ForegroundColor Gray
    Write-Host "  Duration: $($startResponse.durationMinutes) minutes" -ForegroundColor Gray
    
    # Parse timestamps
    $startTime = [DateTime]::Parse($startResponse.startedAt)
    $expiryTime = [DateTime]::Parse($startResponse.expiresAt)
    $duration = ($expiryTime - $startTime).TotalMinutes
    
    Write-Host ""
    Write-Host "Verification:" -ForegroundColor Yellow
    Write-Host "  Calculated duration: $duration minutes" -ForegroundColor Gray
    if ($duration -eq $startResponse.durationMinutes) {
        Write-Host "  ✓ Duration matches!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Duration mismatch!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "2. Checking Session Status..." -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/session-status/$classroomId" -Method Get
    Write-Host "Response:" -ForegroundColor Cyan
    $statusResponse | ConvertTo-Json -Depth 5
    
    if ($statusResponse.success -and $statusResponse.isActive) {
        Write-Host ""
        Write-Host "✓ Session is active!" -ForegroundColor Green
        Write-Host "  Time Remaining: $($statusResponse.timeRemaining) seconds" -ForegroundColor Gray
        Write-Host "  Time Remaining: $([Math]::Floor($statusResponse.timeRemaining / 60)):$($statusResponse.timeRemaining % 60)" -ForegroundColor Gray
        Write-Host "  Expires At: $($statusResponse.expiresAt)" -ForegroundColor Gray
        
        # Calculate remaining time manually
        $now = Get-Date
        $expiryTime = [DateTime]::Parse($statusResponse.expiresAt)
        $manualRemaining = [Math]::Max(0, ($expiryTime - $now).TotalSeconds)
        
        Write-Host ""
        Write-Host "Verification:" -ForegroundColor Yellow
        Write-Host "  Server says: $($statusResponse.timeRemaining)s remaining" -ForegroundColor Gray
        Write-Host "  Manual calc: $([Math]::Floor($manualRemaining))s remaining" -ForegroundColor Gray
        
        $diff = [Math]::Abs($statusResponse.timeRemaining - $manualRemaining)
        if ($diff -le 2) {
            Write-Host "  ✓ Time calculation is correct!" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Time calculation seems off (diff: ${diff}s)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "3. Monitoring timer for 10 seconds..." -ForegroundColor Green
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/session-status/$classroomId" -Method Get -ErrorAction SilentlyContinue
        if ($statusResponse.success) {
            $timeLeft = $statusResponse.timeRemaining
            $mins = [Math]::Floor($timeLeft / 60)
            $secs = $timeLeft % 60
            Write-Host "  [$($i+1)/10] Time remaining: ${mins}:$($secs.ToString().PadLeft(2,'0'))" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "✓ Timer test complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Session will auto-expire in $($startResponse.durationMinutes) minutes" -ForegroundColor Yellow
    
} else {
    Write-Host ""
    Write-Host "✗ Failed to start session!" -ForegroundColor Red
    Write-Host "  Error: $($startResponse.message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
