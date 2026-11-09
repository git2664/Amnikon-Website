param([Parameter(Mandatory=$true)][string]$SettingsPath,[switch]$CheckOnly)
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
. (Join-Path $PSScriptRoot 'GitHubFrontend.Common.ps1')
$settings=Read-FrontendJson $SettingsPath
if($settings.repository -cne 'git2664/Amnikon-Website' -or $settings.siteName -cne 'Default Web Site' -or $settings.releaseRoot -cne 'C:\Website\Amnikon-Releases'){throw 'unexpected-server-settings'}
$root=Split-Path -Parent $SettingsPath
$statusPath=Join-Path $root 'status\latest.json'
$statePath=Join-Path $root 'state.json'
$status=[ordered]@{checkedUtc=[DateTime]::UtcNow.ToString('o');state='checking';frontendOnly=$true;backendChanged=$false;credentialsRead=$false}
$mutex=New-Object Threading.Mutex($false,'Global\AmnikonGitHubFrontendDeployment')
$held=$false;$manager=$null;$switched=$false;$oldFrontend=$null;$stage='github-release'
function Save-SyncStatus{
 $status.stage=$script:stage
 $temporary=$statusPath+'.tmp'
 $status|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $temporary -Encoding UTF8
 Move-Item -LiteralPath $temporary -Destination $statusPath -Force
}
function Get-GitHubJson([string]$Url){
 return Invoke-RestMethod -Uri $Url -Headers @{'User-Agent'='AMNIKON-Frontend-Deployment';'Accept'='application/vnd.github+json'} -TimeoutSec 20
}
function Download-ReleaseFile($Asset,[string]$Tag,[string]$Directory){
 $name=[string]$Asset.name
 if($name -cnotin @('frontend.zip','artifact-manifest.json','search-settings.json','release-info.json','checksums.json') -or $Asset.uploader.login -cne 'github-actions[bot]'){throw 'unexpected-release-asset'}
 $expected='https://github.com/git2664/Amnikon-Website/releases/download/'+$Tag+'/'+$name
 if($Asset.browser_download_url -cne $expected -or $Asset.size -le 0 -or $Asset.size -gt $(if($name -eq 'frontend.zip'){256MB}else{2MB})){throw 'invalid-release-asset-url-or-size'}
 $destination=Join-Path $Directory $name
 if((Test-Path -LiteralPath $destination) -and (Get-Item -LiteralPath $destination).Length -eq $Asset.size){return}
 Invoke-WebRequest -Uri $expected -UseBasicParsing -OutFile ($destination+'.partial') -Headers @{'User-Agent'='AMNIKON-Frontend-Deployment'} -TimeoutSec 180
 if((Get-Item -LiteralPath ($destination+'.partial')).Length -ne $Asset.size){throw 'incomplete-release-download'}
 Move-Item -LiteralPath ($destination+'.partial') -Destination $destination -Force
}
try{
 try{$held=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$held=$true}
 if(-not $held){return}
 $repo='https://api.github.com/repos/git2664/Amnikon-Website'
 try{$release=Get-GitHubJson ($repo+'/releases/latest')}catch [Net.WebException]{if($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404){$status.state='waiting-for-first-release';Save-SyncStatus;return};throw}
 if($release.draft -or $release.prerelease -or $release.author.login -cne 'github-actions[bot]' -or $release.tag_name -cnotmatch '^website-([a-f0-9]{40})-run-(\d+)-attempt-(\d+)$'){throw 'untrusted-release'}
 $sha=$Matches[1];$runId=$Matches[2];$attempt=$Matches[3];$tag=[string]$release.tag_name
 $status.sourceSha=$sha;$status.workflowRunId=$runId;$status.releaseTag=$tag
 if(Test-Path -LiteralPath $statePath){$state=Read-FrontendJson $statePath;if([string]$state.releaseId -eq [string]$release.id){$status.state='up-to-date';$status.lastDeploymentUtc=$state.deployedUtc;Save-SyncStatus;return}}
 $stage='verify-main-workflow'
 $head=Get-GitHubJson ($repo+'/git/ref/heads/main')
 if($head.object.sha -cne $sha){$status.state='waiting-for-latest-main-build';Save-SyncStatus;return}
 $run=Get-GitHubJson ($repo+'/actions/runs/'+$runId)
 if($run.repository.full_name -cne 'git2664/Amnikon-Website' -or $run.head_sha -cne $sha -or $run.head_branch -cne 'main' -or $run.path -cne '.github/workflows/deploy.yml' -or $run.event -cnotin @('push','workflow_dispatch') -or [string]$run.run_attempt -ne $attempt){throw 'untrusted-workflow-run'}
 if($run.status -ne 'completed'){$status.state='waiting-for-workflow-completion';Save-SyncStatus;return}
 if($run.conclusion -ne 'success'){throw 'workflow-did-not-succeed'}
 $assets=@{}
 foreach($asset in $release.assets){if($assets.ContainsKey($asset.name)){throw 'duplicate-release-asset'};$assets[$asset.name]=$asset}
 if($assets.Count -ne 5){throw 'incomplete-release-assets'}
 foreach($name in @('frontend.zip','artifact-manifest.json','search-settings.json','release-info.json','checksums.json')){if(-not $assets.ContainsKey($name)){throw 'missing-release-asset'}}
 $directory=Join-Path $root ('downloads\'+$tag)
 [IO.Directory]::CreateDirectory($directory)|Out-Null
 $stage='download-verified-run-artifacts'
 foreach($name in @('release-info.json','checksums.json','artifact-manifest.json','search-settings.json','frontend.zip')){Download-ReleaseFile $assets[$name] $tag $directory}
 $info=Read-FrontendJson (Join-Path $directory 'release-info.json')
 if($info.schemaVersion -ne 1 -or $info.repository -cne 'git2664/Amnikon-Website' -or $info.sourceSha -cne $sha -or $info.ref -cne 'refs/heads/main' -or $info.workflowPath -cne '.github/workflows/deploy.yml' -or [string]$info.workflowRunId -ne $runId -or [string]$info.runAttempt -notmatch '^\d+$' -or [int]$info.runAttempt -lt 1 -or [int]$info.runAttempt -gt [int]$attempt -or $info.frontendOnly -ne $true -or $info.publicOrigin -cne 'https://amnikontechnologies.com'){throw 'release-descriptor-mismatch'}
 $stage='validate-static-frontend'
 $records=Assert-FrontendArtifact $directory
 if($CheckOnly){$status.state='verified-not-deployed';Save-SyncStatus;return}
 Add-Type -Path "$env:windir\System32\inetsrv\Microsoft.Web.Administration.dll"
 $manager=New-Object Microsoft.Web.Administration.ServerManager
 $site=$manager.Sites['Default Web Site']
 if(-not $site -or $site.State -ne 'Started' -or $site.Applications['/'].ApplicationPoolName -cne 'DefaultAppPool' -or $site.Applications['/api'].ApplicationPoolName -cne 'CareerService' -or $site.Applications['/api'].VirtualDirectories['/'].PhysicalPath -cne $settings.backendRoot){throw 'iis-targets-changed'}
 $oldFrontend=[string]$site.Applications['/'].VirtualDirectories['/'].PhysicalPath
 if(-not $oldFrontend.StartsWith($settings.releaseRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'unexpected-current-frontend-root'}
 $candidate=Join-Path $settings.releaseRoot ('github-'+$sha.Substring(0,12)+'-'+$runId+'-'+$attempt+'\frontend')
 $stage='stage-frontend'
 Expand-FrontendArtifact $directory $candidate $records
 Copy-Item -LiteralPath (Join-Path $root 'frontend.web.config') -Destination (Join-Path $candidate 'web.config') -Force
 # Confirm main did not advance while the release was downloading.
 if((Get-GitHubJson ($repo+'/git/ref/heads/main')).object.sha -cne $sha){$status.state='superseded-before-switch';Save-SyncStatus;return}
 $stage='switch-frontend'
 $site.Applications['/'].VirtualDirectories['/'].PhysicalPath=$candidate
 $manager.CommitChanges();$switched=$true
 $stage='check-public-website'
 Test-HostedFrontend $records
 $deployedUtc=[DateTime]::UtcNow.ToString('o')
 @{releaseId=[string]$release.id;sourceSha=$sha;workflowRunId=$runId;frontendRoot=$candidate;previousFrontendRoot=$oldFrontend;deployedUtc=$deployedUtc}|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding UTF8
 $status.state='deployed';$status.deployedUtc=$deployedUtc;$status.frontendRoot=$candidate;$status.previousFrontendRoot=$oldFrontend;$status.publicChecksPassed=$true
 $stage='complete';Save-SyncStatus
}catch{
 $status.state='failed';$status.errorType=$_.Exception.GetType().Name
 $safeCodes=@('untrusted-release','untrusted-workflow-run','workflow-did-not-succeed','incomplete-release-assets','missing-release-asset','release-descriptor-mismatch','iis-targets-changed','unexpected-current-frontend-root','hosted-homepage-mismatch','hosted-public-file-unavailable','existing-backend-unavailable','private-endpoint-exposed','https-redirect-invalid','invalid-public-manifest','unsafe-frontend-archive','bundle-checksum-mismatch','frontend-entry-checksum-mismatch','incomplete-existing-candidate')
 if($_.Exception.Message -cin $safeCodes){$status.errorCode=$_.Exception.Message}
 if($switched){
  try{$manager.Dispose();$manager=New-Object Microsoft.Web.Administration.ServerManager;$manager.Sites['Default Web Site'].Applications['/'].VirtualDirectories['/'].PhysicalPath=$oldFrontend;$manager.CommitChanges();$status.previousFrontendRestored=$true}catch{$status.rollbackErrorType=$_.Exception.GetType().Name}
 }
 Save-SyncStatus
 exit 1
}finally{if($manager){$manager.Dispose()};if($held){$mutex.ReleaseMutex()};$mutex.Dispose()}
