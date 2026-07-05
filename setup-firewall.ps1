# Vignus IRL Studio - Firewall Configuration Script
# Run this as Administrator: Right-click PowerShell -> Run as Administrator -> cd to project dir -> .\setup-firewall.ps1

Write-Host "Setting up Windows Firewall rules for Vignus IRL Studio..." -ForegroundColor Cyan

$rules = @(
    @{ Name = "Vignus SRT Ingest";  Port = 8890; Protocol = "UDP" },
    @{ Name = "Vignus RTMP Ingest"; Port = 1935; Protocol = "TCP" },
    @{ Name = "Vignus WebRTC WHEP"; Port = 8889; Protocol = "TCP" },
    @{ Name = "Vignus WebRTC UDP";  Port = 8189; Protocol = "UDP" },
    @{ Name = "Vignus HLS Server";  Port = 8888; Protocol = "TCP" },
    @{ Name = "Vignus API Server";  Port = 9997; Protocol = "TCP" },
    @{ Name = "Vignus HTTP Server"; Port = 3000; Protocol = "TCP" }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  [OK] Rule '$($rule.Name)' already exists." -ForegroundColor Green
    } else {
        try {
            New-NetFirewallRule -DisplayName $rule.Name `
                -Direction Inbound `
                -Action Allow `
                -Protocol $rule.Protocol `
                -LocalPort $rule.Port `
                -Enabled True `
                -Profile Any `
                -Description "Required by Vignus IRL Studio for MediaMTX streaming server" | Out-Null
            Write-Host "  [CREATED] $($rule.Name) - Port $($rule.Port)/$($rule.Protocol)" -ForegroundColor Yellow
        } catch {
            Write-Host "  [FAILED] $($rule.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Done! Firewall rules are configured." -ForegroundColor Green
Write-Host "You can now connect from IRL Pro via Tailscale." -ForegroundColor Cyan
