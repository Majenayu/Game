# Prints "Rnn<TAB>full path" for every reference image listed in docs/reference-art/INVENTORY.md.
# The table abbreviates "Gemini_Generated_Image_t3a6tbt3a6tbt3a6" as "...t3a6".
$root = Split-Path $PSScriptRoot -Parent
$rows = Get-Content (Join-Path $root 'docs/reference-art/INVENTORY.md') | Where-Object { $_ -match '^\| R\d\d' }
foreach ($l in $rows) {
  $c = $l.Split('|')
  $id = $c[1].Trim()
  $fn = $c[2].Trim()
  if ($fn.StartsWith('...t3a6')) { $fn = 'Gemini_Generated_Image_t3a6tbt3a6tbt3a6' + $fn.Substring(7) }
  $p = Join-Path $root "gemini/$fn"
  if (Test-Path -LiteralPath $p) { "$id`t$p" } else { "$id`tMISSING $fn" }
}
