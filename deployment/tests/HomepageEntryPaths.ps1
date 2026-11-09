$ErrorActionPreference='Stop'
$projectRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$homepageHtml=Get-Content -LiteralPath (Join-Path $projectRoot 'pages\home\index.html') -Raw
$publicFiles=(Get-Content -LiteralPath (Join-Path $projectRoot 'deployment\frontend.manifest.json') -Raw|ConvertFrom-Json).files
$attributePattern='(?is)<(?:link|script|img|source|a)\b[^>]*?\b(?:href|src)=["'']([^"'']+)["'']'
$references=@([regex]::Matches($homepageHtml,$attributePattern)|ForEach-Object{[Net.WebUtility]::HtmlDecode($_.Groups[1].Value)})
$checked=0
foreach($entryUrl in @('https://amnikontechnologies.com/','https://amnikontechnologies.com/pages/home/index.html')){
 foreach($reference in $references){
  if($reference.StartsWith('#')){continue}
  $resolved=[Uri]::new([Uri]$entryUrl,$reference)
  if($resolved.Scheme -notin @('https','http') -or $resolved.Host -ne 'amnikontechnologies.com'){continue}
  $publicPath=[Uri]::UnescapeDataString($resolved.AbsolutePath).TrimStart('/')
  if($publicPath -cnotin $publicFiles -or -not (Test-Path -LiteralPath (Join-Path $projectRoot $publicPath) -PathType Leaf)){throw ('Homepage reference fails at '+$entryUrl+': '+$reference+' resolves to '+$publicPath)}
  $checked++
 }
}
Write-Output ('PASS: '+$checked+' homepage CSS, JavaScript, image, video and link references work at both / and /pages/home/index.html.')

$pagePaths=@($publicFiles|Where-Object{$_ -like 'pages/*.html'})
$sharedSources=foreach($component in @('navbar.js','footer.js','chatbot.js')){Get-Content -LiteralPath (Join-Path $projectRoot ('components/'+$component)) -Raw}
$allEntries=@('')+$pagePaths
$navigationChecks=0
foreach($pagePath in $allEntries){
 $entryUrl='https://amnikontechnologies.com/'+$pagePath
 $sources=@($sharedSources)
 if($pagePath){$sources+=Get-Content -LiteralPath (Join-Path $projectRoot $pagePath) -Raw}
 foreach($source in $sources){
  foreach($referenceMatch in [regex]::Matches($source,$attributePattern)){
   $reference=[Net.WebUtility]::HtmlDecode($referenceMatch.Groups[1].Value)
   if([string]::IsNullOrWhiteSpace($reference) -or $reference.StartsWith('#')){continue}
   $resolved=[Uri]::new([Uri]$entryUrl,$reference)
   if($resolved.Scheme -notin @('https','http') -or $resolved.Host -ne 'amnikontechnologies.com'){continue}
   $publicPath=[Uri]::UnescapeDataString($resolved.AbsolutePath).TrimStart('/')
   if(-not $publicPath){$publicPath='pages/home/index.html'}
   if($publicPath -cnotin $publicFiles -or -not (Test-Path -LiteralPath (Join-Path $projectRoot $publicPath) -PathType Leaf)){throw ('Navigation/asset reference fails at '+$entryUrl+': '+$reference+' resolves to '+$publicPath)}
   $navigationChecks++
  }
 }
}
Write-Output ('PASS: '+$navigationChecks+' shared navigation and page references resolve from the root and all '+$pagePaths.Count+' pages.')
