# Builds docs/reference-art/compare/arena-<element>-<n>.png from an arenas.spec.ts capture folder.
# Usage: powershell -File tools/arenacompare.ps1 <capture dir> <n> [size]
param([string]$dir, [int]$n, [string]$size = '1366x768')
$root = Split-Path $PSScriptRoot -Parent
$map = @{}
foreach ($l in (& (Join-Path $PSScriptRoot 'refmap.ps1'))) { $p = $l.Split("`t"); $map[$p[0]] = $p[1] }
# element, arena id, reference id (docs/reference-art/INVENTORY.md)
$pairs = @(('fire', 'foundry', 'R00'), ('water', 'harbor', 'R02'), ('ice', 'cryo', 'R14'), ('lightning', 'neon', 'R16'), ('wind', 'skyrail', 'R18'),
  ('earth', 'techruins', 'R20'), ('leaf', 'biodome', 'R04'), ('light', 'orbital', 'R06'), ('gravity', 'gravwell', 'R08'), ('time', 'chrono', 'R10'))
foreach ($p in $pairs) {
  $shot = Get-ChildItem $dir -Filter "$size-arena-*-$($p[1])-a.png" | Select-Object -First 1
  if (-not $shot) { "no capture for $($p[1])"; continue }
  $out = Join-Path $root "docs/reference-art/compare/arena-$($p[0])-$n.png"
  & (Join-Path $PSScriptRoot 'compare.ps1') $map[$p[2]] $shot.FullName $out
}
