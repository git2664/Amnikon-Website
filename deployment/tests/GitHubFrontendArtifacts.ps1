$ErrorActionPreference='Stop'
$deployment=Split-Path $PSScriptRoot -Parent
. (Join-Path $deployment 'GitHubFrontend.Common.ps1')
$run=Join-Path ([IO.Path]::GetTempPath()) ('amnikon-frontend-tests-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($run)|Out-Null
function New-Fixture([string]$Name,[string]$ExtraPath='',[switch]$ApiRecord,[switch]$Preview,[switch]$WrongEntryHash){
 $folder=Join-Path $run $Name;[IO.Directory]::CreateDirectory($folder)|Out-Null
 $files=[ordered]@{'index.html'='root';'pages/home/index.html'='home';'robots.txt'='User-agent: *'}
 if($ExtraPath){$files[$ExtraPath]='untrusted-fixture'}
 $records=@();$zipPath=Join-Path $folder 'frontend.zip'
 $fileStream=[IO.File]::Open($zipPath,[IO.FileMode]::CreateNew)
 $zip=New-Object IO.Compression.ZipArchive($fileStream,[IO.Compression.ZipArchiveMode]::Create,$false)
 try{foreach($path in $files.Keys){
  $bytes=[Text.Encoding]::UTF8.GetBytes($files[$path]);$entry=$zip.CreateEntry($path);$stream=$entry.Open();try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  $sha=[Security.Cryptography.SHA256]::Create();try{$hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','')}finally{$sha.Dispose()}
  if($WrongEntryHash){$hash='0'*64}
  $records += [pscustomobject]@{artifact=$(if($ApiRecord){'api'}else{'frontend'});path=$path;bytes=$bytes.Length;sha256=$hash}
 }}finally{$zip.Dispose()}
 $records|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $folder 'artifact-manifest.json') -Encoding UTF8
 @{searchVisibility=$(if($Preview){'Preview'}else{'Production'});productionOrigin='https://amnikontechnologies.com'}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $folder 'search-settings.json') -Encoding UTF8
 '{}'|Set-Content -LiteralPath (Join-Path $folder 'release-info.json') -Encoding UTF8
 $checksums=foreach($path in @('frontend.zip','artifact-manifest.json','search-settings.json','release-info.json')){$file=Get-Item -LiteralPath (Join-Path $folder $path);[pscustomobject]@{path=$path;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName).Hash}}
 $checksums|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $folder 'checksums.json') -Encoding UTF8
 return $folder
}
$good=New-Fixture 'valid'
$records=Assert-FrontendArtifact $good
if($records.Count -ne 3){throw 'Valid static bundle was not accepted.'}
$rejected=0
foreach($path in @('../outside.html','pages/../outside.html','assets/private.dll','assets/web.config','CareerService/Program.cs','assets/NUL.txt','assets/private.json','assets/trailing./x.js')){
 $fixture=New-Fixture ('bad-'+$rejected) $path
 $blocked=$false;try{$null=Assert-FrontendArtifact $fixture}catch{$blocked=$true}
 if(-not $blocked){throw ('Unsafe entry accepted: '+$path)};$rejected++
}
foreach($case in @('api','preview','wrong-entry-hash','tampered-checksum')){
 $fixture=switch($case){'api'{New-Fixture $case -ApiRecord};'preview'{New-Fixture $case -Preview};'wrong-entry-hash'{New-Fixture $case -WrongEntryHash};'tampered-checksum'{New-Fixture $case}}
 if($case -eq 'tampered-checksum'){Add-Content -LiteralPath (Join-Path $fixture 'release-info.json') -Value 'tampered'}
 $blocked=$false;try{$null=Assert-FrontendArtifact $fixture}catch{$blocked=$true}
 if(-not $blocked){throw ('Invalid bundle accepted: '+$case)};$rejected++
}
Write-Output ('PASS: valid static bundle accepted; '+$rejected+' unsafe/private/preview/checksum cases rejected. No IIS or network changes.')

# Exercise the real health-check function with a fake HTTP transport. This also
# catches attempts to assign PowerShell's read-only automatic variables.
$script:healthScenario='healthy'
$script:testHash='A'*64
function Get-FrontendHttp([string]$Url,[string]$Method='GET'){
 if($Url.StartsWith('http://')){return [pscustomobject]@{status=301;location=$(if($script:healthScenario -eq 'bad-redirect'){'https://wrong.example/'}else{'https://amnikontechnologies.com/pages/home/index.html'})}}
 if($Url.EndsWith('/api/api/contact')){return [pscustomobject]@{status=$(if($script:healthScenario -eq 'bad-api'){500}else{405})}}
 if($Url.EndsWith('/api/appsettings.json') -or $Url.EndsWith('/api/swagger/index.html')){return [pscustomobject]@{status=404}}
 return [pscustomobject]@{status=200;sha256=$script:testHash}
}
$healthRecords=@{'pages/home/index.html'=@{sha256=$script:testHash};'index.html'=@{sha256=$script:testHash}}
Test-HostedFrontend $healthRecords -ReadinessAttempts 1 -RetryDelayMilliseconds 0
foreach($scenario in @('bad-redirect','bad-api')){
 $script:healthScenario=$scenario;$blocked=$false
 try{Test-HostedFrontend $healthRecords -ReadinessAttempts 1 -RetryDelayMilliseconds 0}catch{$blocked=$true}
 if(-not $blocked){throw ('Unhealthy hosted site accepted: '+$scenario)}
}
Write-Output 'PASS: real hosted-health logic accepts a healthy site and rejects API/redirect failures through a fake transport.'
