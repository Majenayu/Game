# Builds docs/reference-art/compare/hero-<element>-<n>.png from a hero-sheet capture (e2e/rigs.spec.ts hero-sheet).
# Usage: powershell -File tools/herocompare.ps1 <hero-sheet.png> <n>
param([string]$sheet, [int]$n)
$root = Split-Path $PSScriptRoot -Parent
$map = @{}
foreach ($l in (& (Join-Path $PSScriptRoot 'refmap.ps1'))) { $p = $l.Split("`t"); $map[$p[0]] = $p[1] }
# element order matches ELEMENT_IDS; reference ids from docs/reference-art/INVENTORY.md
$els = @(('fire', 'R01'), ('water', 'R21'), ('ice', 'R13'), ('lightning', 'R15'), ('wind', 'R17'), ('earth', 'R19'), ('leaf', 'R03'), ('light', 'R05'), ('gravity', 'R07'), ('time', 'R09'))
for ($i = 0; $i -lt $els.Count; $i++) {
  $out = Join-Path $root "docs/reference-art/compare/hero-$($els[$i][0])-$n.png"
  & (Join-Path $PSScriptRoot 'compare.ps1') $map[$els[$i][1]] $sheet $out "420:900:$($i * 420):0"
}
