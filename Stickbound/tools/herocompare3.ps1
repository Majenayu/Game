# Same-size compare: side by side and 50% overlay of a Gemini sheet and the game capture (both 1376x768).
# Usage: powershell -File tools/herocompare3.ps1 <element> <style>   (capture first: npx playwright test --project=herocmp)
param([string]$el = 'fire', [string]$style = 'classic')
$root = Split-Path $PSScriptRoot -Parent
$env:PATH += ';C:\Users\pgayu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin'
$ids = @{ fire = 'R01'; lightning = 'R15' }
$map = @{}
foreach ($l in (& (Join-Path $PSScriptRoot 'refmap.ps1'))) { $p = $l.Split("`t"); $map[$p[0]] = $p[1] }
$ref = $map[$ids[$el]]
$game = Join-Path $root "docs/reference-art/compare-v4/raw/$el-$style.png"
$out = Join-Path $root 'docs/reference-art/compare-v4'
ffmpeg -y -loglevel error -i $ref -i $game -filter_complex "[0:v][1:v]hstack=inputs=2" "$out/$el-$style-side.png"
ffmpeg -y -loglevel error -i $ref -i $game -filter_complex "[0:v][1:v]blend=all_mode=average" "$out/$el-$style-overlay.png"
