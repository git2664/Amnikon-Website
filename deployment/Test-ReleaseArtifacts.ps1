$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent

$run=Join-Path $project ('work\artifact-test-'+[Guid]::NewGuid().ToString('N'))
$published=Join-Path $run 'synthetic-publish'
New-Item -ItemType Directory -Path $published -Force | Out-Null
[IO.File]::WriteAllText((Join-Path $published 'CareerService.dll'),'synthetic packaging fixture; never execute')
[IO.File]::WriteAllText((Join-Path $published 'MailKit.dll'),'synthetic dependency fixture; never execute')
[IO.File]::WriteAllText((Join-Path $published 'CareerService.deps.json'),'{}')
[IO.File]::WriteAllText((Join-Path $published 'CareerService.runtimeconfig.json'),'{}')
[IO.File]::WriteAllText((Join-Path $published 'web.config'),'<configuration><system.webServer><aspNetCore processPath="dotnet" arguments=".\CareerService.dll" /></system.webServer></configuration>')
foreach($entry in @('appsettings.json','appsettings.Production.json','secret.cs','debug.pdb','assets.zip','Uploads/resume.pdf','obj/private.cs','.git/config')){
    $file=Join-Path $published $entry;New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($file)) -Force | Out-Null;[IO.File]::WriteAllText($file,'synthetic-sensitive-marker-do-not-ship')
}
$output=Join-Path $run 'artifacts'
& (Join-Path $project 'deployment\New-ReleaseArtifacts.ps1') -ProjectRoot $project -OutputDirectory $output -PublishedApiPath $published
Add-Type -AssemblyName System.IO.Compression.FileSystem
$public=[IO.Compression.ZipFile]::OpenRead((Join-Path $output 'frontend.zip'))
$api=[IO.Compression.ZipFile]::OpenRead((Join-Path $output 'api.zip'))
try{
    $expected=(Get-Content (Join-Path $project 'deployment\frontend.manifest.json') -Raw | ConvertFrom-Json).files
    if($public.Entries.Count -ne $expected.Count){throw 'Public file count does not match allowlist'}
    foreach($e in $public.Entries){if($e.FullName -match '(^|/)(backend|CareerService|Uploads|\.git|bin|obj)/|appsettings|\.zip$|\.cs$|\.dll$'){throw 'Private file found in frontend archive'}}
    foreach($page in $public.Entries | Where-Object {$_.FullName.EndsWith('.html')}){
        $reader=[IO.StreamReader]::new($page.Open());try{$html=$reader.ReadToEnd()}finally{$reader.Dispose()}
        if(!$html.Contains('<meta name="robots" content="noindex, nofollow">')){throw 'Preview HTML could be indexed.'}
    }
    $reader=[IO.StreamReader]::new($public.GetEntry('sitemap.xml').Open());try{[xml]$previewMap=$reader.ReadToEnd()}finally{$reader.Dispose()}
    if(@($previewMap.urlset.url | Where-Object {$_}).Count){throw 'Preview sitemap must not advertise URLs.'}
    if($api.Entries.Count -ne 5){throw 'Unexpected published API file count'}
    foreach($e in $api.Entries){$r=[IO.StreamReader]::new($e.Open());try{if($r.ReadToEnd().Contains('synthetic-sensitive-marker-do-not-ship')){throw 'Sensitive publish fixture leaked'}}finally{$r.Dispose()}}
}finally{$public.Dispose();$api.Dispose()}
$records=Get-Content (Join-Path $output 'artifact-manifest.json') -Raw | ConvertFrom-Json
if(@($records).Count -ne $expected.Count+5 -or @($records | Where-Object {$_.sha256.Length -ne 64}).Count){throw 'Artifact checksum manifest invalid'}

# An explicit production build must retain public indexing for approved legal pages.
$production=Join-Path $run 'production-artifacts'
& (Join-Path $project 'deployment\New-ReleaseArtifacts.ps1') -ProjectRoot $project -OutputDirectory $production -FrontendOnly -SearchVisibility Production
$archive=[IO.Compression.ZipFile]::OpenRead((Join-Path $production 'frontend.zip'))
try{
    $reader=[IO.StreamReader]::new($archive.GetEntry('pages/home/index.html').Open());try{$homepageHtml=$reader.ReadToEnd()}finally{$reader.Dispose()}
    if(!$homepageHtml.Contains('<meta name="robots" content="index, follow">')){throw 'Production home accidentally noindexed.'}
    foreach($file in @('pages/legal/privacy.html','pages/legal/terms.html')){
        $reader=[IO.StreamReader]::new($archive.GetEntry($file).Open());try{$legalPage=$reader.ReadToEnd()}finally{$reader.Dispose()}
        if(!$legalPage.Contains('<meta name="robots" content="index, follow">') -or $legalPage.Contains('pending review and approval')){throw 'Approved legal page must be publishable and indexable.'}
    }
    $reader=[IO.StreamReader]::new($archive.GetEntry('sitemap.xml').Open());try{[xml]$map=$reader.ReadToEnd()}finally{$reader.Dispose()}
    [xml]$sourceSiteMap=Get-Content -LiteralPath (Join-Path $project 'sitemap.xml') -Raw
    $expectedLocations=@($sourceSiteMap.urlset.url | ForEach-Object {$_.loc} | Sort-Object)
    $actualLocations=@($map.urlset.url | ForEach-Object {$_.loc} | Sort-Object)
    if($actualLocations.Count -ne $expectedLocations.Count -or @(Compare-Object $expectedLocations $actualLocations).Count){throw 'Production sitemap differs from the SEO-validated source sitemap.'}
}finally{$archive.Dispose()}

# A poisoned manifest must never become a public artifact.
$poison=Join-Path $run 'poison-source';$deploy=Join-Path $poison 'deployment';New-Item -ItemType Directory -Path $deploy -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $project 'deployment\New-ReleaseArtifacts.ps1') -Destination (Join-Path $deploy 'New-ReleaseArtifacts.ps1')
foreach($entry in @('backend/CareerService/appsettings.json','../outside.html','assets/icons.zip','assets/private.txt','unreviewed.xml')){
    @{files=@($entry)} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $deploy 'frontend.manifest.json')
    $rejected=$false;try{& (Join-Path $deploy 'New-ReleaseArtifacts.ps1') -ProjectRoot $poison -OutputDirectory (Join-Path $run ([Guid]::NewGuid().ToString('N'))) -FrontendOnly}catch{$rejected=$true}
    if(!$rejected){throw 'Poisoned public manifest was accepted'}
}
$rejected=$false;try{& (Join-Path $project 'deployment\New-ReleaseArtifacts.ps1') -ProjectRoot $project -OutputDirectory $output -FrontendOnly}catch{$rejected=$true};if(!$rejected){throw 'Existing output was not protected'}

# A published web.config carrying runtime values must be rejected, not shipped.
[IO.File]::WriteAllText((Join-Path $published 'web.config'),'<configuration><system.webServer><aspNetCore><environmentVariables><environmentVariable name="Smtp__Password" value="synthetic-only" /></environmentVariables></aspNetCore></system.webServer></configuration>')
$rejected=$false;try{& (Join-Path $project 'deployment\New-ReleaseArtifacts.ps1') -ProjectRoot $project -OutputDirectory (Join-Path $run 'blocked-config') -PublishedApiPath $published}catch{$rejected=$true};if(!$rejected){throw 'Environment values in artifact were accepted'}
$result=[PSCustomObject]@{frontendFiles=$expected.Count;apiFixtureFiles=5;checksums=@($records).Count;sourceOrSensitiveFilesLeaked=0;poisonedPathsRejected=5;existingOutputProtected=$true;runtimeValuesRejected=$true;previewNoIndex=$true;productionIndexing=$true;approvedLegalPagesIndexable=$true;liveIisChanged=$false;apiBuild='Synthetic packaging fixture only; clean publish still required'}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run 'test-result.json')
$result | Format-List
Write-Output 'PASS: artifact allowlists, omissions, checksums, blocked paths, overwrite refusal and runtime-value rejection.'
