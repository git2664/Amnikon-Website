# This trusted server module accepts static frontend artifacts only. It never
# executes a script downloaded from GitHub or reads/writes backend credentials.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Read-FrontendJson([string]$Path){
 if((Get-Item -LiteralPath $Path).Length -gt 2MB){throw 'json-too-large'}
 return (Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json)
}
function Test-FrontendPublicPath([string]$Name){
 if([string]::IsNullOrWhiteSpace($Name) -or $Name.Length -gt 220 -or $Name -match '(^/|\\|:|(^|/)\.\.?(/|$)|//)' -or $Name.EndsWith('/')){return $false}
 foreach($part in $Name.Split('/')){if($part.EndsWith('.') -or $part.EndsWith(' ') -or $part -match '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)'){return $false}}
 if($Name -match '(?i)(^|/)(\.git|\.github|backend|CareerService|Uploads|SubmissionOutbox|ResumeOutbox|bin|obj|work)(/|$)|(^|/)(appsettings[^/]*|web\.config|\.env[^/]*)$'){return $false}
 if($Name -in @('index.html','robots.txt','sitemap.xml')){return $true}
 if($Name -notmatch '^(assets|components|pages)/'){return $false}
 return [IO.Path]::GetExtension($Name).ToLowerInvariant() -in @('.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.gif','.ico','.mp4','.woff','.woff2','.ttf')
}
function Assert-FrontendChecksums([string]$Directory){
 $expectedNames=@('frontend.zip','artifact-manifest.json','search-settings.json','release-info.json')
 $checksums=Read-FrontendJson (Join-Path $Directory 'checksums.json')
 $seen=@{}
 foreach($record in $checksums){
  if($record.path -cnotin $expectedNames -or $seen.ContainsKey($record.path) -or $record.sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'invalid-bundle-checksums'}
  $seen[$record.path]=$true;$file=Get-Item -LiteralPath (Join-Path $Directory $record.path)
  if($file.Length -ne $record.bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $record.sha256){throw 'bundle-checksum-mismatch'}
 }
 if($seen.Count -ne 4){throw 'incomplete-bundle-checksums'}
}
function Assert-FrontendArtifact([string]$Directory){
 Assert-FrontendChecksums $Directory
 $search=Read-FrontendJson (Join-Path $Directory 'search-settings.json')
 if($search.searchVisibility -cne 'Production' -or $search.productionOrigin -cne 'https://amnikontechnologies.com'){throw 'non-production-frontend'}
 $records=Read-FrontendJson (Join-Path $Directory 'artifact-manifest.json')
 $expected=@{};$total=0L
 foreach($record in $records){
  if($record.artifact -cne 'frontend' -or -not (Test-FrontendPublicPath $record.path) -or $expected.ContainsKey($record.path) -or $record.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or $record.bytes -lt 0 -or $record.bytes -gt 128MB){throw 'invalid-public-manifest'}
  $expected[$record.path]=$record;$total+=[long]$record.bytes
 }
 if($expected.Count -lt 3 -or $expected.Count -gt 1000 -or $total -gt 512MB -or -not $expected.ContainsKey('pages/home/index.html') -or -not $expected.ContainsKey('index.html')){throw 'invalid-public-manifest-size'}
 $zip=[IO.Compression.ZipFile]::OpenRead((Join-Path $Directory 'frontend.zip'))
 try{
  $seen=@{}
  foreach($entry in $zip.Entries){
   $name=$entry.FullName
   if(-not (Test-FrontendPublicPath $name) -or $seen.ContainsKey($name) -or -not $expected.ContainsKey($name) -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw 'unsafe-frontend-archive'}
   $seen[$name]=$true;$record=$expected[$name]
   if($entry.Length -ne $record.bytes){throw 'frontend-entry-size-mismatch'}
   $stream=$entry.Open();$sha=[Security.Cryptography.SHA256]::Create()
   try{$hash=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$sha.Dispose()}
   if($hash -ne $record.sha256){throw 'frontend-entry-checksum-mismatch'}
  }
  if($seen.Count -ne $expected.Count){throw 'frontend-entry-count-mismatch'}
 }finally{$zip.Dispose()}
 return $expected
}
function Set-FrontendReleaseAcl([string]$Directory){
 [IO.Directory]::CreateDirectory($Directory)|Out-Null
 $acl=New-Object Security.AccessControl.DirectorySecurity
 $acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @('S-1-5-18','S-1-5-32-544')){
  $identity=New-Object Security.Principal.SecurityIdentifier($sid)
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
 }
 foreach($identity in @('IUSR','IIS AppPool\DefaultAppPool','IIS AppPool\CareerService')){
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,'ReadAndExecute','ContainerInherit,ObjectInherit','None','Allow')))
 }
 Set-Acl -LiteralPath $Directory -AclObject $acl
}
function Expand-FrontendArtifact([string]$Directory,[string]$Destination,$Records){
 if(Test-Path -LiteralPath $Destination){
  # A retry reuses the same candidate instead of creating unbounded copies.
  foreach($name in $Records.Keys){$file=Get-Item -LiteralPath (Join-Path $Destination $name);if($file.Length -ne $Records[$name].bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $Records[$name].sha256){throw 'incomplete-existing-candidate'}}
  return
 }
 Set-FrontendReleaseAcl (Split-Path -Parent $Destination)
 Set-FrontendReleaseAcl $Destination
 $root=[IO.Path]::GetFullPath($Destination).TrimEnd('\')+'\'
 $zip=[IO.Compression.ZipFile]::OpenRead((Join-Path $Directory 'frontend.zip'))
 try{
  foreach($entry in $zip.Entries){
   $target=[IO.Path]::GetFullPath((Join-Path $Destination $entry.FullName))
   if(-not $target.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'extraction-path-escaped'}
   [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
   $inputStream=$entry.Open();$outputStream=[IO.File]::Open($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
   try{$inputStream.CopyTo($outputStream)}finally{$inputStream.Dispose();$outputStream.Dispose()}
  }
 }finally{$zip.Dispose()}
}
function Get-FrontendHttp([string]$Url,[string]$Method='GET'){
 $request=[Net.HttpWebRequest]::Create($Url);$request.Method=$Method;$request.AllowAutoRedirect=$false;$request.Timeout=15000;$request.Headers['Accept-Encoding']='identity'
 $response=$null
 try{try{$response=$request.GetResponse()}catch [Net.WebException]{if(-not $_.Exception.Response){throw};$response=$_.Exception.Response}
  $hash=$null;$iisErrorCode=$null
  if($Method -eq 'GET' -and [int]$response.StatusCode -eq 200){$stream=$response.GetResponseStream();$sha=[Security.Cryptography.SHA256]::Create();try{$hash=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$sha.Dispose()}}
  if([int]$response.StatusCode -ge 500){
   $reader=New-Object IO.StreamReader($response.GetResponseStream())
   try{$buffer=New-Object char[] 65536;$count=$reader.Read($buffer,0,$buffer.Length);$errorText=[string]::new($buffer,0,$count);$match=[regex]::Match($errorText,'0x[0-9a-fA-F]{8}');if($match.Success){$iisErrorCode=$match.Value}}finally{$reader.Dispose()}
  }
  return [pscustomobject]@{status=[int]$response.StatusCode;sha256=$hash;location=$response.Headers['Location'];iisErrorCode=$iisErrorCode}
 }finally{if($response){$response.Dispose()}}
}
function Test-HostedFrontend($Records,[int]$ReadinessAttempts=12,[int]$RetryDelayMilliseconds=1000){
 $origin='https://amnikontechnologies.com'
 $homepageResponse=Get-FrontendHttp ($origin+'/pages/home/index.html')
 if($homepageResponse.status -ne 200 -or $homepageResponse.sha256 -ne $Records['pages/home/index.html'].sha256){throw 'hosted-homepage-mismatch'}
 foreach($name in $Records.Keys){
  $encoded=($name.Split('/')|ForEach-Object{[Uri]::EscapeDataString($_)}) -join '/'
  if((Get-FrontendHttp ($origin+'/'+$encoded) 'HEAD').status -ne 200){throw 'hosted-public-file-unavailable'}
 }
 $backendResponse=$null
 for($readinessAttempt=0;$readinessAttempt -lt $ReadinessAttempts;$readinessAttempt++){
  try{$backendResponse=Get-FrontendHttp ($origin+'/api/api/contact');if($backendResponse.status -eq 405){break}}catch{if($readinessAttempt -eq $ReadinessAttempts-1){throw}}
  if($readinessAttempt -lt $ReadinessAttempts-1 -and $RetryDelayMilliseconds -gt 0){Start-Sleep -Milliseconds $RetryDelayMilliseconds}
 }
 if(-not $backendResponse -or $backendResponse.status -ne 405){
  $failure=New-Object Exception('existing-backend-unavailable')
  if($backendResponse){$failure.Data['HttpStatus']=[int]$backendResponse.status;if($backendResponse.iisErrorCode){$failure.Data['IisErrorCode']=[string]$backendResponse.iisErrorCode}}
  throw $failure
 }
 foreach($path in @('/api/appsettings.json','/api/swagger/index.html')){if((Get-FrontendHttp ($origin+$path)).status -notin @(403,404)){throw 'private-endpoint-exposed'}}
 $redirect=Get-FrontendHttp 'http://amnikontechnologies.com/pages/home/index.html'
 if($redirect.status -notin @(301,302,307,308) -or -not $redirect.location.StartsWith($origin+'/')){throw 'https-redirect-invalid'}
}
