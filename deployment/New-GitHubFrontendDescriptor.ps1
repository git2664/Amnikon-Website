param([Parameter(Mandatory=$true)][string]$ReleaseDirectory)
$ErrorActionPreference='Stop'
if($env:GITHUB_REPOSITORY -ne 'git2664/Amnikon-Website' -or $env:GITHUB_REF -ne 'refs/heads/main' -or $env:GITHUB_SHA -notmatch '^[a-f0-9]{40}$' -or $env:GITHUB_RUN_ID -notmatch '^\d+$' -or $env:GITHUB_RUN_ATTEMPT -notmatch '^\d+$'){throw 'Only a main-branch run in the approved repository can publish deployment metadata.'}
$info=[ordered]@{schemaVersion=1;repository=$env:GITHUB_REPOSITORY;sourceSha=$env:GITHUB_SHA;ref=$env:GITHUB_REF;workflowPath='.github/workflows/deploy.yml';workflowRunId=$env:GITHUB_RUN_ID;runAttempt=$env:GITHUB_RUN_ATTEMPT;frontendOnly=$true;publicOrigin='https://amnikontechnologies.com'}
$info|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $ReleaseDirectory 'release-info.json') -Encoding UTF8
$checksums=foreach($name in @('frontend.zip','artifact-manifest.json','search-settings.json','release-info.json')){
 $file=Get-Item -LiteralPath (Join-Path $ReleaseDirectory $name)
 [pscustomobject]@{path=$name;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash}
}
$checksums|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $ReleaseDirectory 'checksums.json') -Encoding UTF8
