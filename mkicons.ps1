# Icono de Alcancía: cuadrado negro con jarra de vidrio y monedas doradas (dibujado en código)
Add-Type -AssemblyName System.Drawing

function New-RoundedRect([System.Drawing.Rectangle]$r, [int]$rad) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $rad * 2
  $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
  $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
  $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $p
}

function Draw-Icon([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $s = $size / 512.0
  $u = { param($v) [float]($v * $s) }

  # fondo negro redondeado
  $rect = New-Object System.Drawing.Rectangle((& $u 14), (& $u 14), (& $u 484), (& $u 484))
  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 11, 15))
  $g.FillPath($bg, (New-RoundedRect $rect 108)) | Out-Null

  # halo morado sutil detrás de la jarra
  $halo = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 139, 92, 246))
  $g.FillEllipse($halo, (& $u 90), (& $u 120), (& $u 332), (& $u 320)) | Out-Null

  # jarra interior (recorte para el oro)
  $cuerpo = New-RoundedRect (New-Object System.Drawing.Rectangle((& $u 168), (& $u 210), (& $u 176), (& $u 232))) 40

  # oro nivel ~62% con clip al cuerpo de la jarra
  $g.SetClip($cuerpo) | Out-Null
  $oro = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 196, 81))
  $g.FillRectangle($oro, (& $u 150), (& $u 300), (& $u 220), (& $u 160)) | Out-Null
  # onda superior del oro
  $onda = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 196, 81))
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddClosedCurve(@(
    (New-Object System.Drawing.PointF((& $u 140), (& $u 312))),
    (New-Object System.Drawing.PointF((& $u 190), (& $u 292))),
    (New-Object System.Drawing.PointF((& $u 256), (& $u 312))),
    (New-Object System.Drawing.PointF((& $u 320), (& $u 292))),
    (New-Object System.Drawing.PointF((& $u 380), (& $u 312)))
  )) | Out-Null
  $g.FillPath($onda, $gp) | Out-Null

  # monedas doradas apiladas
  $monedaFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 208, 106))
  $monedaRing = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 212, 156, 44), (& $u 7))
  $brillo = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(170, 255, 255, 255), (& $u 9))
  foreach ($c in @(@(214,352,34), @(258,392,34), @(296,348,34), @(240,428,34), @(296,420,30), @(196,412,30))) {
    $x = & $u $c[0]; $y = & $u $c[1]; $r = & $u $c[2]
    $g.FillEllipse($monedaFill, ($x - $r), ($y - $r), ($r * 2), ($r * 2)) | Out-Null
    $g.DrawEllipse($monedaRing, ($x - ($r * .74)), ($y - ($r * .74)), ($r * 1.48), ($r * 1.48)) | Out-Null
    $g.DrawArc($brillo, ($x - $r), ($y - $r), ($r * 2), ($r * 2), 205, 70) | Out-Null
  }
  $g.ResetClip() | Out-Null

  # vidrio de la jarra (contorno) + cuello + tapa
  $vidrio = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 245, 244, 238), (& $u 14))
  $g.DrawPath($vidrio, $cuerpo) | Out-Null
  $g.DrawLine($vidrio, (& $u 196), (& $u 210), (& $u 196), (& $u 172)) | Out-Null
  $g.DrawLine($vidrio, (& $u 316), (& $u 210), (& $u 316), (& $u 172)) | Out-Null
  $tapa = New-RoundedRect (New-Object System.Drawing.Rectangle((& $u 172), (& $u 132), (& $u 168), (& $u 46))) 20
  $g.DrawPath($vidrio, $tapa) | Out-Null
  $knob = New-RoundedRect (New-Object System.Drawing.Rectangle((& $u 236), (& $u 112), (& $u 40), (& $u 26))) 12
  $g.DrawPath($vidrio, $knob) | Out-Null

  # brillo del vidrio
  $destello = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 255, 255, 255), (& $u 10))
  $destello.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $destello.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($destello, (& $u 196), (& $u 250), (& $u 120), (& $u 120), 130, 60) | Out-Null

  $g.Dispose()
  $bmp
}

$dir = Split-Path $MyInvocation.MyCommand.Path
$master = Draw-Icon 512
$master.Save("$dir\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
foreach ($s in @(192, 180, 120)) {
  $b = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($master, 0, 0, $s, $s)
  $g.Dispose()
  $b.Save("$dir\icon-$s.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
$master.Dispose()
Get-ChildItem "$dir\icon-*.png" | Select-Object Name, Length
