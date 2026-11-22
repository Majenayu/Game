# Side-by-side of a reference image and a game capture for docs/reference-art/compare/.
# Usage: powershell -File tools/compare.ps1 <ref.png> <game.png> <out.png> [crop w:h:x:y of the game image]
param([string]$ref, [string]$game, [string]$out, [string]$crop = '')
$env:PATH += ';C:\Users\pgayu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin'
$font = "fontfile='C\:/Windows/Fonts/arialbd.ttf'"
$g = if ($crop) { "crop=$crop," } else { '' }
$f = "[0:v]scale=-2:640,drawtext=$($font):text='REFERENCE':x=10:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.7[a];" +
     "[1:v]$($g)scale=-2:640,drawtext=$($font):text='GAME':x=10:y=10:fontsize=26:fontcolor=cyan:box=1:boxcolor=black@0.7[b];[a][b]hstack=inputs=2"
ffmpeg -y -loglevel error -i $ref -i $game -filter_complex $f $out
