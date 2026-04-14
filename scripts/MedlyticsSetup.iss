; ==============================================================================
; Medlytics Pro - Inno Setup Script
; Finalidade: Gerar o instalador .EXE definitivo para Windows.
; ==============================================================================

[Setup]
AppName=Medlytics Pro Dashboard
AppVersion=1.0.0
DefaultDirName={autopf}\MedlyticsPro
DefaultGroupName=Medlytics
UninstallDisplayIcon={app}\public\favicon.ico
Compression=lzma2
SolidCompression=yes
OutputDir=..
OutputBaseFilename=MedlyticsPro_Setup
; Requer Privilégios Administrativos
PrivilegesRequired=admin

[Files]
; Copia todos os arquivos do projeto (excluindo node_modules para o instalador ser leve)
Source: "*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs; Excludes: "node_modules\*, .next\*, .venv\*, .git\*"

[Icons]
Name: "{group}\Medlytics Pro Dashboard"; Filename: "{app}\server.js"
Name: "{group}\{cm:UninstallProgram,Medlytics Pro}"; Filename: "{uninstallexe}"

[Run]
; Executa o script PowerShell de instalação automática ao finalizar
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install.ps1"""; Flags: runascurrentuser waituntilterminated

[Messages]
WelcomeLabel2=Este assistente instalará o Medlytics Pro Dashboard e todas as dependências necessárias (Node.js, Python e Oracle Client).
