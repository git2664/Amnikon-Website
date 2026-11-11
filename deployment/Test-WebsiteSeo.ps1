[CmdletBinding()]
param([string]$ProjectRoot)
if([string]::IsNullOrWhiteSpace($ProjectRoot)){$ProjectRoot=Split-Path $PSScriptRoot -Parent}
$ErrorActionPreference='Stop'
$config=Get-Content (Join-Path $ProjectRoot 'deployment/seo-pages.json') -Raw | ConvertFrom-Json
$origin=([uri]$config.origin).GetLeftPart([UriPartial]::Authority)
if($origin -ne $config.origin -or !$origin.StartsWith('https://')){throw 'SEO origin must be an HTTPS origin without a path.'}
$manifest=(Get-Content (Join-Path $ProjectRoot 'deployment/frontend.manifest.json') -Raw | ConvertFrom-Json).files
$titles=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$descriptions=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$expected=@()
foreach($page in $config.pages){
    if($page.file -notin $manifest){throw 'SEO page omitted from public allowlist.'}
    $html=Get-Content (Join-Path $ProjectRoot $page.file) -Raw
    $head=[regex]::Match($html,'(?is)<head\b[^>]*>(.*?)</head>').Groups[1].Value
    foreach($pattern in @('<title>.*?</title>','<meta\s+name="description"[^>]*>','<meta\s+name="robots"[^>]*>','<link\s+rel="canonical"[^>]*>','<meta\s+property="og:url"[^>]*>','<script\s+type="application/ld\+json">.*?</script>')){
        if([regex]::Matches($head,$pattern,[Text.RegularExpressions.RegexOptions]::Singleline).Count -ne 1){throw ('Missing or duplicate SEO metadata: '+$page.file)}
    }
    $canonical=$origin+'/'+$page.file
    if(!$head.Contains('rel="canonical" href="'+$canonical+'"') -or !$head.Contains('property="og:url" content="'+$canonical+'"')){throw 'Canonical/social URL mismatch.'}
    $title=[Net.WebUtility]::HtmlDecode([regex]::Match($head,'(?s)<title>(.*?)</title>').Groups[1].Value)
    $description=[Net.WebUtility]::HtmlDecode([regex]::Match($head,'<meta name="description" content="([^"]*)"').Groups[1].Value)
    if($title -ne $page.title -or $description -ne $page.description -or !$titles.Add($title) -or !$descriptions.Add($description)){throw 'Metadata inventory or uniqueness mismatch.'}
    $schema=[regex]::Match($head,'(?s)<script type="application/ld\+json">(.*?)</script>').Groups[1].Value | ConvertFrom-Json
    if($schema.'@context' -ne 'https://schema.org' -or $schema.'@graph'[0].url -ne $canonical){throw 'Structured data URL mismatch.'}
    if(@($schema.'@graph' | Where-Object {$_.'@type' -eq 'JobPosting'}).Count){throw 'No current vacancies: JobPosting markup is forbidden.'}
    if($page.indexable){
        if(!$head.Contains('name="robots" content="index, follow"')){throw 'Public page accidentally noindexed.'}
        $expected+=$canonical
    }elseif(!$head.Contains('name="robots" content="noindex, follow"')){throw 'A non-indexable page must remain excluded from search.'}
}
[xml]$sitemap=Get-Content (Join-Path $ProjectRoot 'sitemap.xml') -Raw
if($sitemap.DocumentElement.NamespaceURI -ne 'http://www.sitemaps.org/schemas/sitemap/0.9'){throw 'Invalid sitemap namespace.'}
$locations=@($sitemap.urlset.url | ForEach-Object {$_.loc})
if($locations.Count -ne $expected.Count -or (Compare-Object $expected $locations)){throw 'Sitemap must contain exactly the indexable canonical URLs.'}
foreach($file in @('sitemap.xml','robots.txt',$config.image)){if($file -notin $manifest -or !(Test-Path -LiteralPath (Join-Path $ProjectRoot $file))){throw 'Discovery file or social image missing from release allowlist.'}}
$imageName=Split-Path $config.image -Leaf
if(!(Get-ChildItem -LiteralPath (Join-Path $ProjectRoot (Split-Path $config.image -Parent)) -File | Where-Object {$_.Name -ceq $imageName})){throw 'Social image filename casing does not match.'}
$robots=Get-Content (Join-Path $ProjectRoot 'robots.txt') -Raw
if(!$robots.Contains('Sitemap: '+$origin+'/sitemap.xml') -or $robots -match '(?m)^Disallow:\s*/\s*$'){throw 'Production robots file blocks crawling or lacks sitemap.'}
$homeCanonical=$origin+'/'+$config.home
$entry=Get-Content (Join-Path $ProjectRoot 'index.html') -Raw
if(!$entry.Contains('rel="canonical" href="'+$homeCanonical+'"')){throw 'Root redirect canonical mismatch.'}
Write-Output ('PASS: '+$config.pages.Count+' metadata/structured-data pages, '+$expected.Count+' sitemap URLs, approved legal pages, no vacancy markup, logo casing and discovery allowlists.')
