# Tiles up to 10 screenshots into a 5x2 contact sheet (visual review helper).
# Usage: powershell -File tools/sheet.ps1 <dir> <glob> <out.png> [tileW] [tileH]
param([string]$dir, [string]$glob, [string]$out, [int]$tw = 683, [int]$th = 384)
$env:PATH += ';C:\Users\pgayu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin'
$files = Get-ChildItem (Join-Path $dir $glob) | Sort-Object Name | Select-Object -First 10
$n = $files.Count
$in = $files | ForEach-Object { '-i'; $_.FullName }
$f = ''
for ($i = 0; $i -lt $n; $i++) { $f += "[$i]scale=$($tw):$($th)[v$i];" }
$lay = @()
for ($i = 0; $i -lt $n; $i++) { $lay += "$(($i % 5) * $tw)_$([math]::Floor($i / 5) * $th)" }
$l = (0..($n - 1) | ForEach-Object { "[v$_]" }) -join ''
ffmpeg -y -loglevel error @in -filter_complex "$f$($l)xstack=inputs=$($n):layout=$($lay -join '|'):fill=black" $out
