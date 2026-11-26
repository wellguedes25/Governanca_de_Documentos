param(
    [switch]$PreferNode
)

$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RootDir

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Goverdoc Pro - Implantacao Hospitalar" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$DataDir = Join-Path $RootDir "data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

$EnvFile = Join-Path $RootDir ".env"
$EnvExample = Join-Path $RootDir ".env.example"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
    } else {
        New-Item -ItemType File -Path $EnvFile -Force | Out-Null
    }
    Write-Host "[INFO] Arquivo .env criado."
}

$EnvContent = Get-Content $EnvFile -Raw -ErrorAction SilentlyContinue
if ($null -eq $EnvContent) { $EnvContent = "" }

$HasValidKey = $false
if ($EnvContent -match "(?m)^ENCRYPTION_KEY=(.+)$") {
    $ExistingVal = $Matches[1].Trim()
    if ($ExistingVal.Length -ge 32) {
        $HasValidKey = $true
    }
}

if (-not $HasValidKey) {
    $Bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($Bytes)
    $HexKey = -join ($Bytes | ForEach-Object { $_.ToString("x2") })

    if ($EnvContent -match "(?m)^ENCRYPTION_KEY=.*$") {
        $EnvContent = [Regex]::Replace($EnvContent, "(?m)^ENCRYPTION_KEY=.*$", "ENCRYPTION_KEY=$HexKey")
    } else {
        if ($EnvContent.Length -gt 0 -and -not $EnvContent.EndsWith("`n")) {
            $EnvContent += "`n"
        }
        $EnvContent += "ENCRYPTION_KEY=$HexKey`n"
    }
    Set-Content -Path $EnvFile -Value $EnvContent -Encoding UTF8
    Write-Host "[OK] ENCRYPTION_KEY AES-256 gerada automaticamente em .env." -ForegroundColor Green
} else {
    Write-Host "[OK] ENCRYPTION_KEY ja configurada em .env." -ForegroundColor Green
}

$HasDocker = $false
if (-not $PreferNode) {
    $DockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -ne $DockerCmd) {
        try {
            & docker compose version | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $HasDocker = $true
            }
        } catch {
            $HasDocker = $false
        }
    }
}

if ($HasDocker) {
    Write-Host "[INFO] Docker Compose detectado. Subindo container goverdoc-pro..."
    & docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao subir docker compose."
    }
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "  Goverdoc Pro ONLINE via Docker!" -ForegroundColor Green
    Write-Host "  Acesse: http://localhost:3000" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    exit 0
}

Write-Host "[INFO] Modo Node.js local selecionado (sem Docker)." -ForegroundColor Yellow
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $NodeCmd) {
    throw "Node.js 20+ e Docker nao encontrados. Instale Docker Desktop ou Node.js 20 LTS."
}

Write-Host "[INFO] Instalando dependencias e gerando build de producao..."
& npm ci --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { throw "Falha no npm ci." }

& npm run build
if ($LASTEXITCODE -ne 0) { throw "Falha no npm run build." }

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Build concluido com sucesso!" -ForegroundColor Green
Write-Host "  Iniciando servidor na porta 3000 (Ctrl+C para parar)..." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
& npm run start
