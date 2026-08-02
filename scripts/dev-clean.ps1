$ErrorActionPreference = 'Stop'

$ports = @(3000, 3001, 8081)
$killed = @()

$repoPath = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "[dev:clean] Stopping orphan Node processes from repo: $repoPath"
Get-CimInstance Win32_Process -Filter "name='node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($repoPath) } |
    ForEach-Object {
        try {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
            Write-Host "[dev:clean] Stopped repo node PID $($_.ProcessId)"
        } catch {
            Write-Host "[dev:clean] Could not stop repo node PID $($_.ProcessId): $($_.Exception.Message)"
        }
    }

function Get-PortPids {
    param([int]$Port)

    $result = @()

    try {
        $fromNetTcp = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
        if ($fromNetTcp) {
            $result += $fromNetTcp
        }
    } catch {
        # Fallback for environments where Get-NetTCPConnection is unavailable or restricted.
    }

    if ($result.Count -eq 0) {
        $fromNetstat = cmd /c "netstat -ano -p tcp | findstr :$Port"
        foreach ($line in $fromNetstat) {
            if ($line -match '\s+(\d+)$') {
                $result += [int]$Matches[1]
            }
        }
    }

    return @($result | Where-Object { $_ -and $_ -ne 0 } | Select-Object -Unique)
}

function Wait-PortReleased {
    param([int]$Port, [int]$MaxAttempts = 20)

    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $stillUsing = Get-PortPids -Port $Port
        if (-not $stillUsing -or $stillUsing.Count -eq 0) {
            return $true
        }
        Start-Sleep -Milliseconds 250
    }

    return $false
}

Write-Host "[dev:clean] Checking ports: $($ports -join ', ')"

foreach ($port in $ports) {
    $listeners = Get-PortPids -Port $port

    if (-not $listeners -or $listeners.Count -eq 0) {
        Write-Host "[dev:clean] No listener found on port $port"
        continue
    }

    foreach ($procId in $listeners) {
        if ($killed -contains $procId) {
            continue
        }

        try {
            $process = Get-Process -Id $procId -ErrorAction Stop
            Write-Host "[dev:clean] Stopping PID $procId ($($process.ProcessName)) on port $port"
            Stop-Process -Id $procId -Force -ErrorAction Stop
            $killed += $procId
        } catch {
            Write-Host "[dev:clean] Could not stop PID ${procId}: $($_.Exception.Message)"
        }
    }

    if (-not (Wait-PortReleased -Port $port)) {
        Write-Host "[dev:clean] Warning: port $port still appears busy after stop attempts"
    }
}

if ($killed.Count -eq 0) {
    Write-Host "[dev:clean] No processes needed to be stopped."
} else {
    Write-Host "[dev:clean] Stopped PIDs: $($killed -join ', ')"
}

Write-Host "[dev:clean] Starting monorepo dev environment..."
yarn dev --filter=backend --filter=frontend --filter=@neto-bastos/core
