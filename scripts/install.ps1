# ==============================================================================
# Medlytics Pro - Windows Installation Engine
# Purpose: Automated setup of Node.js, Python, Oracle Client and Windows Service.
# ==============================================================================

$ErrorActionPreference = "Stop"

function Write-Host-Color($msg, $color = "Cyan") {
    Write-Host "`n[Medlytics] " -NoNewline -ForegroundColor White
    Write-Host $msg -ForegroundColor $color
}

# 1. Check for Administrative Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host-Color "ERRO: Por favor, execute este script como ADMINISTRADOR." "Red"
    exit
}

Write-Host-Color "Iniciando instalação automatizada do Medlytics Pro Dashboard..." "Green"

# 2. Requisitos: Node.js e Python via Winget
function Install-Dependency($name, $id) {
    if (Get-Command $name -ErrorAction SilentlyContinue) {
        Write-Host-Color "$name já está instalado." "Gray"
    } else {
        Write-Host-Color "Instalando $name via winget..." "Yellow"
        winget install --id $id --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Host-Color "Falha ao instalar $id automaticamente. Por favor, instale manualmente." "Red"
        }
    }
}

Install-Dependency "node" "OpenJS.NodeJS.LTS"
Install-Dependency "python" "Python.Python.3.12"

# 3. Preparar Pasta do Oracle Instant Client
$oracleDir = "C:\oracle\instantclient_21_1"
if (-not (Test-Path $oracleDir)) {
    Write-Host-Color "Configurando Oracle Instant Client (Thick Mode)..." "Yellow"
    New-Item -ItemType Directory -Path "C:\oracle" -Force | Out-Null
    $zipPath = "C:\oracle\instantclient.zip"
    
    # Download direto
    $url = "https://download.oracle.com/otn_software/nt/instantclient/211000/instantclient-basic-windows.x64-21.3.0.0.0.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath "C:\oracle" -Force
    Remove-Item $zipPath
    Write-Host-Color "Oracle Client configurado em $oracleDir" "Green"
}

# 4. Configurar Ambiente Python Local
Write-Host-Color "Configurando ambiente virtual Python..." "Yellow"
cd "$PSScriptRoot/.."
python -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\pip.exe" install pandas oracledb python-dotenv
Write-Host-Color "Dependências Python instaladas." "Green"

# 5. Instalar Dependências Node e Build
Write-Host-Color "Instalando dependências do Dashboard..." "Yellow"
npm install --omit=dev
Write-Host-Color "Realizando Build de Produção..." "Yellow"
npm run build

# 6. Registro como Serviço do Windows (Opcional se usar o instalador .exe final)
# Aqui sugerimos o uso do WinSW para rodar o app em background
Write-Host-Color "Configuração Finalizada!" "Green"
Write-Host-Color "Para iniciar a aplicação manualmente: npm run build && npm run start" "Cyan"
Write-Host-Color "Acesse: http://localhost:3000" "Cyan"
