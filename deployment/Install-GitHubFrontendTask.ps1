param([string]$ServerRoot='C:\ProgramData\Amnikon\GitHubFrontendDeployment',[switch]$DoNotStart)
$ErrorActionPreference='Stop'
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Run the reviewed one-time task installer in Administrator PowerShell.'}
if($ServerRoot -cne 'C:\ProgramData\Amnikon\GitHubFrontendDeployment'){throw 'Unexpected installation root.'}
$taskName='Amnikon-Website-AutoDeploy'
if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){throw 'The deployment task already exists. Inspect it before upgrading.'}
Add-Type -Path "$env:windir\System32\inetsrv\Microsoft.Web.Administration.dll"
$manager=New-Object Microsoft.Web.Administration.ServerManager
try{
 $site=$manager.Sites['Default Web Site']
 if($site.Applications['/'].ApplicationPoolName -ne 'DefaultAppPool' -or $site.Applications['/api'].ApplicationPoolName -ne 'CareerService'){throw 'Unexpected site/pool mapping.'}
 $frontend=[string]$site.Applications['/'].VirtualDirectories['/'].PhysicalPath
 $backend=[string]$site.Applications['/api'].VirtualDirectories['/'].PhysicalPath
 if(-not $frontend.StartsWith('C:\Website\Amnikon-Releases\',[StringComparison]::OrdinalIgnoreCase) -or $backend -ne 'C:\Website\Amnikon-Releases\amnikon-20261109-220359-02d5a4ca\api'){throw 'Unexpected current IIS roots.'}
 [xml]$web=Get-Content -LiteralPath (Join-Path $frontend 'web.config') -Raw
 if($web.SelectNodes('//environmentVariable').Count){throw 'Frontend server template must contain no credentials.'}
 [IO.Directory]::CreateDirectory($ServerRoot)|Out-Null
 $acl=New-Object Security.AccessControl.DirectorySecurity;$acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @('S-1-5-18','S-1-5-32-544')){$identity=New-Object Security.Principal.SecurityIdentifier($sid);$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
 Set-Acl -LiteralPath $ServerRoot -AclObject $acl
 foreach($folder in @('bin','downloads','status')){[IO.Directory]::CreateDirectory((Join-Path $ServerRoot $folder))|Out-Null}
 $statusAcl=Get-Acl -LiteralPath (Join-Path $ServerRoot 'status')
 $users=New-Object Security.Principal.SecurityIdentifier('S-1-5-32-545')
 $statusAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($users,'ReadAndExecute','ContainerInherit,ObjectInherit','None','Allow')))
 Set-Acl -LiteralPath (Join-Path $ServerRoot 'status') -AclObject $statusAcl
 foreach($name in @('GitHubFrontend.Common.ps1','Sync-GitHubFrontend.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $ServerRoot ('bin\'+$name))}
 Copy-Item -LiteralPath (Join-Path $frontend 'web.config') -Destination (Join-Path $ServerRoot 'frontend.web.config')
 @{schemaVersion=1;repository='git2664/Amnikon-Website';siteName='Default Web Site';releaseRoot='C:\Website\Amnikon-Releases';backendRoot=$backend;frontendOnly=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $ServerRoot 'settings.json') -Encoding UTF8
 $scriptPath=Join-Path $ServerRoot 'bin\Sync-GitHubFrontend.ps1'
 $settingsPath=Join-Path $ServerRoot 'settings.json'
 $arguments='-NoProfile -NonInteractive -File "'+$scriptPath+'" -SettingsPath "'+$settingsPath+'"'
 $action=New-ScheduledTaskAction -Execute "$env:windir\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument $arguments -WorkingDirectory (Join-Path $ServerRoot 'bin')
 $trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2)
 $identity=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
 $options=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $identity -Settings $options -Description 'Pull successful main-branch static frontend releases only. Preserve API, SMTP credentials, bindings and private queues.'|Out-Null
 if(-not $DoNotStart){Start-ScheduledTask -TaskName $taskName}
 Write-Output ('Installed '+$taskName+'. No API or SMTP setting changed. Status: '+(Join-Path $ServerRoot 'status\latest.json'))
}finally{$manager.Dispose()}
