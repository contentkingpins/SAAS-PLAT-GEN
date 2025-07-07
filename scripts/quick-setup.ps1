# UPS Integration Quick Setup Script
# Automates validation and provides step-by-step setup guidance

param(
    [switch]$TestOnly,
    [switch]$Verbose
)

Write-Host "🚀 UPS Integration Quick Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$WebhookCredential = "1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d"
$UpsAccountNumber = "J22653"
$BaseUrl = "https://saasplat.amplifyapp.com"

function Test-Prerequisites {
    Write-Host "📋 Checking Prerequisites..." -ForegroundColor Yellow
    
    $results = @{}
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        $results["Node.js"] = $true
        Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        $results["Node.js"] = $false
        Write-Host "   ❌ Node.js: Not installed" -ForegroundColor Red
    }
    
    # Check npm
    try {
        $npmVersion = npm --version 2>$null
        $results["npm"] = $true
        Write-Host "   ✅ npm: $npmVersion" -ForegroundColor Green
    } catch {
        $results["npm"] = $false
        Write-Host "   ❌ npm: Not installed" -ForegroundColor Red
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        $results["Git"] = $true
        Write-Host "   ✅ Git: $gitVersion" -ForegroundColor Green
    } catch {
        $results["Git"] = $false
        Write-Host "   ❌ Git: Not installed" -ForegroundColor Red
    }
    
    Write-Host ""
    return $results
}

function Test-Environment {
    Write-Host "🔧 Checking Environment Variables..." -ForegroundColor Yellow
    
    $envVars = @(
        "UPS_WEBHOOK_CREDENTIAL",
        "UPS_ACCESS_KEY", 
        "UPS_USERNAME",
        "UPS_PASSWORD",
        "UPS_ACCOUNT_NUMBER"
    )
    
    $results = @{}
    
    foreach ($var in $envVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        $isSet = -not [string]::IsNullOrEmpty($value)
        $results[$var] = $isSet
        
        if ($isSet) {
            Write-Host "   ✅ $var : Set" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $var : Missing" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    return $results
}

function Test-Files {
    Write-Host "📁 Checking Required Files..." -ForegroundColor Yellow
    
    $requiredFiles = @(
        "src/lib/services/upsService.ts",
        "src/app/api/webhooks/ups-tracking/route.ts", 
        "src/app/api/admin/ship-lead/route.ts",
        "src/lib/services/notificationService.ts",
        "AWS_AMPLIFY_UPS_SETUP.md",
        "CREDENTIALS_CHECKLIST.md"
    )
    
    $results = @{}
    
    foreach ($file in $requiredFiles) {
        $exists = Test-Path $file
        $results[$file] = $exists
        
        if ($exists) {
            Write-Host "   ✅ $file : Exists" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $file : Missing" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    return $results
}

function Test-Deployment {
    Write-Host "🌐 Testing Deployment Status..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/webhooks/ups-tracking" -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 405) {
            # Method not allowed is expected for GET on webhook endpoint
            Write-Host "   ✅ Webhook endpoint: Deployed and accessible" -ForegroundColor Green
            return $true
        } elseif ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Webhook endpoint: Deployed and accessible" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  Webhook endpoint: Deployed but unexpected response ($($response.StatusCode))" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "   ❌ Webhook endpoint: Not accessible" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
}

function Show-NextSteps {
    Write-Host "🎯 NEXT STEPS FOR YOU:" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "1. 🔑 GET UPS CREDENTIALS (5 minutes)" -ForegroundColor White
    Write-Host "   • Go to: https://www.ups.com/upsdeveloperkit" -ForegroundColor Gray
    Write-Host "   • Login with your UPS account" -ForegroundColor Gray
    Write-Host "   • Navigate to 'DELIVERY TRACKING' app (Account: J22653)" -ForegroundColor Gray
    Write-Host "   • Copy the API Access Key" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. 🔧 ADD TO AWS AMPLIFY (5 minutes)" -ForegroundColor White
    Write-Host "   • Go to: https://console.aws.amazon.com/amplify" -ForegroundColor Gray
    Write-Host "   • Select your SAAS-PLAT-GEN app" -ForegroundColor Gray
    Write-Host "   • Go to Environment Variables" -ForegroundColor Gray
    Write-Host "   • Add these 5 variables:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "     UPS_WEBHOOK_CREDENTIAL=$WebhookCredential" -ForegroundColor DarkCyan
    Write-Host "     UPS_ACCESS_KEY=your-api-access-key-from-step-1" -ForegroundColor DarkCyan
    Write-Host "     UPS_USERNAME=your-ups-username" -ForegroundColor DarkCyan
    Write-Host "     UPS_PASSWORD=your-ups-password" -ForegroundColor DarkCyan
    Write-Host "     UPS_ACCOUNT_NUMBER=$UpsAccountNumber" -ForegroundColor DarkCyan
    Write-Host ""
    
    Write-Host "3. 🔗 CONFIGURE UPS WEBHOOK (2 minutes)" -ForegroundColor White
    Write-Host "   • In UPS Developer Kit → Webhooks/Notifications" -ForegroundColor Gray
    Write-Host "   • Webhook URL: $BaseUrl/api/webhooks/ups-tracking" -ForegroundColor Gray
    Write-Host "   • Credential: $WebhookCredential" -ForegroundColor Gray
    Write-Host "   • Events: Package Tracking, Delivery Notifications, Exceptions" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "4. 🧪 TEST INTEGRATION (3 minutes)" -ForegroundColor White
    Write-Host "   • Run: node scripts/validate-ups-setup.js" -ForegroundColor Gray
    Write-Host "   • Run: node scripts/test-webhook.js" -ForegroundColor Gray
    Write-Host "   • Should see 100% score and successful webhook tests" -ForegroundColor Gray
    Write-Host ""
}

function Show-TestCommands {
    Write-Host "🧪 TESTING COMMANDS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "• Validate setup:" -ForegroundColor White
    Write-Host "  node scripts/validate-ups-setup.js" -ForegroundColor Gray
    Write-Host ""
    Write-Host "• Test webhook:" -ForegroundColor White
    Write-Host "  node scripts/test-webhook.js" -ForegroundColor Gray
    Write-Host ""
    Write-Host "• Test specific endpoint:" -ForegroundColor White
    Write-Host "  curl -X POST $BaseUrl/api/webhooks/ups-tracking \\" -ForegroundColor Gray
    Write-Host "    -H 'UPS-Webhook-Credential: $WebhookCredential' \\" -ForegroundColor Gray
    Write-Host "    -H 'Content-Type: application/json' \\" -ForegroundColor Gray
    Write-Host "    -d @test-webhook-payload.json" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
Write-Host "Starting automated checks..." -ForegroundColor White
Write-Host ""

$prereqResults = Test-Prerequisites
$envResults = Test-Environment  
$fileResults = Test-Files
$deploymentResult = Test-Deployment

# Calculate overall score
$allTests = @($prereqResults.Values) + @($envResults.Values) + @($fileResults.Values) + @($deploymentResult)
$passedTests = ($allTests | Where-Object { $_ -eq $true }).Count
$totalTests = $allTests.Count
$score = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "📊 SETUP STATUS REPORT" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Overall Score: $score% ($passedTests/$totalTests checks passed)" -ForegroundColor White
Write-Host ""

if ($score -eq 100) {
    Write-Host "🎉 STATUS: EXCELLENT - Ready for production!" -ForegroundColor Green
} elseif ($score -ge 80) {
    Write-Host "✅ STATUS: GOOD - Minor configuration needed" -ForegroundColor Green
} elseif ($score -ge 60) {
    Write-Host "⚠️  STATUS: NEEDS ATTENTION - Setup incomplete" -ForegroundColor Yellow
} else {
    Write-Host "❌ STATUS: CRITICAL - Major setup required" -ForegroundColor Red
}

Write-Host ""

if (-not $TestOnly) {
    Show-NextSteps
    Show-TestCommands
}

Write-Host "💡 TIP: Run this script again after completing steps to see progress!" -ForegroundColor Blue
Write-Host "Usage: .\scripts\quick-setup.ps1 -TestOnly (for validation only)" -ForegroundColor Blue 