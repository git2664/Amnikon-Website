<# Builds source-free public/frontend and clean-published API archives. Never deploys to IIS. #>
[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [ValidateSet('CareerService/CareerService.csproj','backend/CareerService/CareerService.csproj')]
    [string]$ApiProject = 'CareerService/CareerService.csproj',
    [switch]$FrontendOnly,
    [ValidateSet('Preview','Production')][string]$SearchVisibility = 'Preview',
    [ValidateSet('win-x64','win-arm64')][string]$RuntimeIdentifier = 'win-x64',
    # For an already-clean published output, including the synthetic packaging test fixture.
    [string]$PublishedApiPath
)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($ProjectRoot)){$ProjectRoot=Split-Path $PSScriptRoot -Parent}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceRoot=[IO.Path]::GetFullPath((Resolve-Path -LiteralPath $ProjectRoot).Path)
if((Get-Item -LiteralPath $sourceRoot).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Source root cannot be a junction or symbolic link.'}
$output=[IO.Path]::GetFullPath($OutputDirectory)
if($output -eq [IO.Path]::GetPathRoot($output) -or $sourceRoot.StartsWith($output.TrimEnd('\','/')+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $output -eq $sourceRoot){throw 'Output must not be the source root, its ancestor or a filesystem root.'}
if(Test-Path -LiteralPath $output){throw 'Use a new output directory; existing files will never be mirrored or deleted.'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$workRoot=Join-Path $sourceRoot ('work\release-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
$publicRoot=Join-Path $workRoot 'frontend'
New-Item -ItemType Directory -Path $publicRoot -Force | Out-Null
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'frontend.manifest.json') -Raw | ConvertFrom-Json
$blocked='(^|/)(\.git|\.github|bin|obj|backend|CareerService|Uploads|ResumeOutbox|SubmissionOutbox|work)(/|$)|(^|/)(appsettings[^/]*|web\.config|\.env[^/]*)$'
$allowedExtensions=@('.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.gif','.ico','.mp4','.woff','.woff2','.ttf')
$discoveryFiles=@('robots.txt','sitemap.xml')
$seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach($rel in $manifest.files){
    if([string]::IsNullOrWhiteSpace($rel) -or $rel.Contains('\') -or $rel.StartsWith('/') -or $rel.Split('/').Contains('..') -or $rel -match $blocked -or ([IO.Path]::GetExtension($rel).ToLowerInvariant() -notin $allowedExtensions -and $rel -notin $discoveryFiles) -or !$seen.Add($rel)){throw 'Invalid, sensitive or duplicate public manifest entry.'}
    if($rel -notin @('index.html','robots.txt','sitemap.xml') -and $rel -notmatch '^(pages|assets|components)/'){throw 'Unexpected public file root.'}
    $from=[IO.Path]::GetFullPath((Join-Path $sourceRoot $rel));$to=[IO.Path]::GetFullPath((Join-Path $publicRoot $rel))
    if(!$from.StartsWith($sourceRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or !$to.StartsWith($publicRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Public file escaped its allowed root.'}
    $parent=Get-Item -LiteralPath $from
    while($parent.FullName -ne $sourceRoot){if($parent.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Public manifest cannot follow a junction or symbolic link.'};$parent=if($parent -is [IO.FileInfo]){$parent.Directory}else{$parent.Parent};if(!$parent){throw 'Invalid public file ancestry.'}}
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($to)) -Force | Out-Null
    Copy-Item -LiteralPath $from -Destination $to
}
if(!(Test-Path -LiteralPath (Join-Path $publicRoot 'index.html'))){throw 'Public entry point missing.'}

# Validate production metadata before applying environment-specific preview protection.
& (Join-Path $PSScriptRoot 'Test-WebsiteSeo.ps1') -ProjectRoot $sourceRoot
if($SearchVisibility -eq 'Preview'){
    foreach($page in Get-ChildItem -LiteralPath $publicRoot -Recurse -Filter '*.html'){
        $html=[IO.File]::ReadAllText($page.FullName)
        $meta='<meta name="robots" content="noindex, nofollow">'
        if($html -match '<meta\s+name="robots"[^>]*>'){$html=[regex]::Replace($html,'<meta\s+name="robots"[^>]*>',$meta)}
        else{$html=$html.Replace('</head>',$meta+'</head>')}
        [IO.File]::WriteAllText($page.FullName,$html)
    }
    # Permit crawling to read noindex; robots.txt is not access control.
    [IO.File]::WriteAllText((Join-Path $publicRoot 'robots.txt'),"User-agent: *`nAllow: /`n# Preview HTML requests noindex, nofollow. Protect non-public previews with authentication.`n")
    [IO.File]::WriteAllText((Join-Path $publicRoot 'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />')
}
[PSCustomObject]@{searchVisibility=$SearchVisibility;productionOrigin=(Get-Content (Join-Path $PSScriptRoot 'seo-pages.json') -Raw | ConvertFrom-Json).origin;deploymentPerformed=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'search-settings.json') -Encoding utf8

$artifacts=@(@{name='frontend';root=$publicRoot})
if(!$FrontendOnly){
    if($PublishedApiPath){$publishRoot=(Resolve-Path -LiteralPath $PublishedApiPath).Path}
    else{
        $chosen=Join-Path $sourceRoot $ApiProject;$projectFolder=Split-Path $chosen -Parent
        [xml]$projectXml=Get-Content -LiteralPath $chosen -Raw
        if($projectXml.SelectNodes('//ProjectReference').Count){throw 'Project references require an explicit reviewed source build plan.'}
        $cleanSource=Join-Path $workRoot 'api-source';New-Item -ItemType Directory -Path $cleanSource -Force | Out-Null
        # Only compiler inputs are copied. Runtime configuration and applicant data never enter this build tree.
        Get-ChildItem -LiteralPath $projectFolder -Recurse -File | Where-Object {$_.FullName -notmatch '\\(bin|obj|Uploads|\.git)\\' -and $_.Extension -in @('.cs','.csproj')} | ForEach-Object {
            $rel=$_.FullName.Substring($projectFolder.Length+1);$to=Join-Path $cleanSource $rel;New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($to)) -Force | Out-Null;Copy-Item -LiteralPath $_.FullName -Destination $to
        }
        $publishRoot=Join-Path $workRoot 'api-publish'
        # Select Windows runtime assets during publish rather than shipping an
        # unreviewed runtimes tree. IIS must match the selected architecture.
        & dotnet publish (Join-Path $cleanSource ([IO.Path]::GetFileName($chosen))) --configuration Release --runtime $RuntimeIdentifier --output $publishRoot --self-contained false -p:UseAppHost=false --nologo
        if($LASTEXITCODE -ne 0){throw 'Clean API publish failed. No deployable API artifact was produced.'}
    }
    $apiRoot=Join-Path $workRoot 'api';New-Item -ItemType Directory -Path $apiRoot -Force | Out-Null
    if(Test-Path -LiteralPath (Join-Path $publishRoot 'runtimes')){throw 'Native runtime content requires a reviewed publish allowlist update.'}
    foreach($directory in Get-ChildItem -LiteralPath $publishRoot -Directory){if($directory.Name -notin @('Uploads','bin','obj','.git')){throw 'Unexpected publish directory requires an explicit allowlist review.'}}
    foreach($file in Get-ChildItem -LiteralPath $publishRoot -File){
        if($file.Name -match '^[A-Za-z0-9_.-]+\.dll$' -or $file.Name -in @('CareerService.deps.json','CareerService.runtimeconfig.json','CareerService.staticwebassets.endpoints.json','web.config')){Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $apiRoot $file.Name)}
    }
    foreach($required in @('CareerService.dll','CareerService.deps.json','CareerService.runtimeconfig.json','web.config')){if(!(Test-Path -LiteralPath (Join-Path $apiRoot $required))){throw 'Required published API file missing.'}}
    [xml]$web=Get-Content -LiteralPath (Join-Path $apiRoot 'web.config') -Raw
    if($web.SelectNodes('//environmentVariable').Count){throw 'API artifact web.config must not carry environment values or credentials.'}
    $artifacts+=@{name='api';root=$apiRoot}
}

$records=@()
function Write-CanonicalArtifactZip([string]$Root,[string]$Destination){
    # Windows PowerShell/.NET Framework can emit backslash entry names through
    # ZipFile.CreateFromDirectory. Explicit names keep artifacts and manifests
    # consistent across Windows PowerShell, pwsh and deployment extractors.
    $stream=[IO.File]::Open($Destination,[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    $zip=$null
    try{
        $zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
        foreach($file in Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName){
            $name=$file.FullName.Substring($Root.Length+1).Replace('\','/')
            $entry=$zip.CreateEntry($name,[IO.Compression.CompressionLevel]::Optimal)
            $inputFile=[IO.File]::OpenRead($file.FullName);$outputEntry=$null
            try{$outputEntry=$entry.Open();$inputFile.CopyTo($outputEntry)}
            finally{if($outputEntry){$outputEntry.Dispose()};$inputFile.Dispose()}
        }
    }finally{if($zip){$zip.Dispose()}else{$stream.Dispose()}}
}
foreach($artifact in $artifacts){
    foreach($file in Get-ChildItem -LiteralPath $artifact.root -Recurse -File){$rel=$file.FullName.Substring($artifact.root.Length+1).Replace('\','/');if($rel -match $blocked -and !($artifact.name -eq 'api' -and $rel -eq 'web.config')){throw 'Sensitive path found in release content.'};$records += [PSCustomObject]@{artifact=$artifact.name;path=$rel;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash}}
    Write-CanonicalArtifactZip -Root $artifact.root -Destination (Join-Path $output ($artifact.name+'.zip'))
}
$records | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $output 'artifact-manifest.json') -Encoding utf8
Write-Output ('Created reviewed artifacts only: '+(($artifacts | ForEach-Object {$_.name+'.zip'}) -join ', '))
Write-Output ('Public files: '+$manifest.files.Count+'. No IIS writes, mirror operations or runtime configuration copies were performed.')
