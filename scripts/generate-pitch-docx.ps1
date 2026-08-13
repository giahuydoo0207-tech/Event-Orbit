param(
  [string]$SourcePath = "docs/event-orbit-pitch-content.md",
  [string]$OutputPath = "docs/Event-Orbit-Pitch-UniHackfest-2026.docx"
)

$ErrorActionPreference = "Stop"
$source = (Resolve-Path -LiteralPath $SourcePath).Path
$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$lines = Get-Content -LiteralPath $source -Encoding UTF8

$word = $null
$document = $null

function Add-Paragraph {
  param(
    [string]$Text,
    [string]$Style = "Normal",
    [bool]$Bold = $false,
    [bool]$Italic = $false,
    [int]$Color = 0
  )

  $paragraph = $document.Content.Paragraphs.Add()
  $paragraph.Range.Text = $Text
  try { $paragraph.Range.Style = $Style } catch { }
  $paragraph.Range.Bold = [int]$Bold
  $paragraph.Range.Italic = [int]$Italic
  if ($Color -ne 0) { $paragraph.Range.Font.Color = $Color }
  $paragraph.Range.InsertParagraphAfter()
  return $paragraph
}

function Clean-Markdown {
  param([string]$Text)
  $clean = $Text -replace '\*\*([^*]+)\*\*', '$1'
  $clean = $clean -replace '`([^`]+)`', '$1'
  $clean = $clean -replace '^\*([^*]+)\*$', '$1'
  return $clean.Trim()
}

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Add()

  $document.PageSetup.TopMargin = $word.CentimetersToPoints(1.8)
  $document.PageSetup.BottomMargin = $word.CentimetersToPoints(1.8)
  $document.PageSetup.LeftMargin = $word.CentimetersToPoints(2.0)
  $document.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)

  $document.Styles.Item("Normal").Font.Name = "Poppins"
  $document.Styles.Item("Normal").Font.Size = 10.5
  foreach ($styleName in @("Title", "Heading 1", "Heading 2", "Heading 3")) {
    $document.Styles.Item($styleName).Font.Name = "Poppins"
  }
  $document.Styles.Item("Title").Font.Color = 1542932
  $document.Styles.Item("Heading 1").Font.Color = 1542932
  $document.Styles.Item("Heading 2").Font.Color = 1542932
  $document.Styles.Item("Heading 3").Font.Color = 2922752

  $index = 0
  $seenSlide = $false
  while ($index -lt $lines.Count) {
    $line = $lines[$index].TrimEnd()

    if ([string]::IsNullOrWhiteSpace($line) -or $line -eq "---") {
      $index++
      continue
    }

    if ($line.StartsWith("|")) {
      $tableLines = New-Object System.Collections.Generic.List[string]
      while ($index -lt $lines.Count -and $lines[$index].Trim().StartsWith("|")) {
        $tableLines.Add($lines[$index].Trim())
        $index++
      }
      $dataLines = $tableLines | Where-Object { $_ -notmatch '^\|[\s:|-]+\|$' }
      if ($dataLines.Count -gt 0) {
        $rows = @($dataLines | ForEach-Object {
          @(($_.Trim('|') -split '\|') | ForEach-Object { Clean-Markdown $_ })
        })
        $columnCount = $rows[0].Count
        $range = $document.Content
        $range.Collapse(0)
        $table = $document.Tables.Add($range, $rows.Count, $columnCount)
        $table.Borders.Enable = 1
        $table.AutoFitBehavior(2)
        for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
          for ($columnIndex = 0; $columnIndex -lt $columnCount; $columnIndex++) {
            $table.Cell($rowIndex + 1, $columnIndex + 1).Range.Text = $rows[$rowIndex][$columnIndex]
          }
        }
        $table.Rows.Item(1).Range.Bold = 1
        $table.Rows.Item(1).Shading.BackgroundPatternColor = 12566463
        $table.Range.Font.Name = "Poppins"
        $table.Range.Font.Size = 9
        $table.Range.InsertParagraphAfter()
      }
      continue
    }

    if ($line -match '^## SLIDE') {
      if ($seenSlide) {
        $range = $document.Content
        $range.Collapse(0)
        $range.InsertBreak(7)
      }
      $seenSlide = $true
      Add-Paragraph (Clean-Markdown ($line -replace '^##\s+', '')) "Heading 1" $true $false | Out-Null
    } elseif ($line -match '^# ') {
      Add-Paragraph (Clean-Markdown ($line -replace '^#\s+', '')) "Title" $true $false | Out-Null
    } elseif ($line -match '^## ') {
      Add-Paragraph (Clean-Markdown ($line -replace '^##\s+', '')) "Heading 1" $true $false | Out-Null
    } elseif ($line -match '^### ') {
      $heading = Clean-Markdown ($line -replace '^###\s+', '')
      $color = if ($heading -eq "Speaker note") { 8421504 } else { 1542932 }
      Add-Paragraph $heading "Heading 2" $true $false $color | Out-Null
    } elseif ($line -match '^> ') {
      $paragraph = Add-Paragraph (Clean-Markdown ($line -replace '^>\s+', '')) "Quote" $false $true
      $paragraph.Range.ParagraphFormat.LeftIndent = $word.CentimetersToPoints(0.6)
      $paragraph.Range.Font.Color = 2922752
    } elseif ($line -match '^[-*] ') {
      $paragraph = Add-Paragraph (Clean-Markdown ($line -replace '^[-*]\s+', ''))
      $paragraph.Range.ListFormat.ApplyBulletDefault()
    } elseif ($line -match '^\d+\. ') {
      $paragraph = Add-Paragraph (Clean-Markdown ($line -replace '^\d+\.\s+', ''))
      $paragraph.Range.ListFormat.ApplyNumberDefault()
    } else {
      $isBold = $line -match '^\*\*.*\*\*$'
      $isItalic = $line -match '^\*[^*].*\*$'
      Add-Paragraph (Clean-Markdown $line) "Normal" $isBold $isItalic | Out-Null
    }
    $index++
  }

  $outputDirectory = Split-Path -Parent $output
  if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
  }
  $document.SaveAs2($output, 16)
  $document.Close()
  $word.Quit()
  Write-Output $output
} finally {
  if ($document) { try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) } catch { } }
  if ($word) { try { $word.Quit() } catch { }; try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) } catch { } }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
