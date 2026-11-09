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
