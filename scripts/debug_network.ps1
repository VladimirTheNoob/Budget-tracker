# Network and Server Debugging Script

# Check network interfaces
Write-Host "Network Interfaces:" -ForegroundColor Green
Get-NetIPConfiguration | Format-Table InterfaceAlias, IPv4Address

# Check listening ports
Write-Host "`nListening Ports:" -ForegroundColor Green
Get-NetTCPConnection | Where-Object { $_.State -eq 'Listen' } | Format-Table LocalAddress, LocalPort, State

# Check specific ports for our application
Write-Host "`nChecking Ports 3000 and 5000:" -ForegroundColor Green
@(3000, 5000) | ForEach-Object {
    $port = $_
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Port ${port} is in use:" -ForegroundColor Yellow
        $process | Format-Table LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess
        
        $processDetails = Get-Process -Id $process.OwningProcess
        Write-Host "Process Details:" -ForegroundColor Yellow
        $processDetails | Format-Table Id, ProcessName, Path
    } else {
        Write-Host "Port ${port} is not in use." -ForegroundColor Green
    }
}

# Test network connectivity
Write-Host "`nTesting Network Connectivity:" -ForegroundColor Green
@('localhost', '127.0.0.1') | ForEach-Object {
    Write-Host "Testing $_:" -ForegroundColor Cyan
    Test-NetConnection $_ -Port 5000
}

# Attempt to fetch employees endpoint
Write-Host "`nTesting API Endpoint:" -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/employees" -Method Get
    Write-Host "API Endpoint Response:" -ForegroundColor Green
    Write-Host ($response | Format-List | Out-String)
} catch {
    Write-Host "Error accessing API endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message
} 