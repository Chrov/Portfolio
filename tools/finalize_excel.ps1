$ErrorActionPreference = 'Stop'
$portfolioRoot = Split-Path $PSScriptRoot -Parent
$excelApp = New-Object -ComObject Excel.Application
$excelApp.Visible = $false
$excelApp.DisplayAlerts = $false
try {
  foreach ($caseId in @('copper-observatory','feria-demand','bank-campaign')) {
    $bookPath = Join-Path $portfolioRoot "outputs/portfolio-20260907/$caseId.xlsx"
    $book = $excelApp.Workbooks.Open($bookPath)
    try {
      $data = $book.Worksheets.Item('Data')
      $pivotSheet = $book.Worksheets.Add()
      $pivotSheet.Name = 'Pivot'
      $pivotSheet.Range('A1').Value2 = 'Exploración / Exploration'
      $pivotSheet.Range('A1').Font.Size = 16
      $pivotSheet.Range('A2').Value2 = 'Refresh All after editing Data / Actualizar todo después de editar Data'
      $cache = $book.PivotCaches().Create(1,'SourceData')
      $pivot = $cache.CreatePivotTable($pivotSheet.Range('A5'),'PortfolioPivot')
      if ($caseId -eq 'feria-demand') {
        $pivot.PivotFields('month').Orientation = 1
        $pivot.PivotFields('product_id').Orientation = 3
        $null = $pivot.AddDataField($pivot.PivotFields('demand_units'),'Demand units',-4157)
      } elseif ($caseId -eq 'copper-observatory') {
        $pivot.PivotFields('year').Orientation = 1
        $null = $pivot.AddDataField($pivot.PivotFields('production_kt'),'Production kt',-4157)
        $null = $pivot.AddDataField($pivot.PivotFields('exports_usd_m'),'Exports USD m',-4157)
        $null = $pivot.AddDataField($pivot.PivotFields('price_us_cent_lb'),'Price cents lb',-4106)
      } else {
        $pivot.PivotFields('selected_top20').Orientation = 1
        $null = $pivot.AddDataField($pivot.PivotFields('subscribed'),'Observed subscribers',-4157)
        $null = $pivot.AddDataField($pivot.PivotFields('record_order'),'Records',-4112)
      }
      $pivot.TableStyle2 = 'PivotStyleMedium9'
      $pivot.RefreshTable() | Out-Null
      $pivotSheet.Columns.Item('A:E').ColumnWidth = 24
      $excelApp.CalculateFullRebuild()
      $dash=$book.Worksheets.Item('Dashboard')
      if ($caseId -ne 'copper-observatory') {$dash.Range('B5').NumberFormat='#,##0';$dash.Range('E5').NumberFormat='#,##0'}
      if ($caseId -eq 'feria-demand') {$dash.Range('H5').NumberFormat='#,##0'}
      # Native engine recalculation proof: change one source cell, check downstream, restore.
      if ($caseId -eq 'feria-demand') {
        $before=[double]$dash.Range('B5').Value2
        $original=[double]$data.Range('C2').Value2
        $data.Range('C2').Value2=$original+7
        $excelApp.CalculateFullRebuild()
        if ([double]$dash.Range('B5').Value2 -ne ($before+7)) {throw 'Excel recalculation failed'}
        $data.Range('C2').Value2=$original
        $excelApp.CalculateFullRebuild()
        $pivot.RefreshTable() | Out-Null
      }
      $dash.Activate()
      $excelApp.ActiveWindow.DisplayGridlines=$false
      $excelApp.ActiveWindow.Zoom=80
      $dash.Range('A1').Select()
      $book.Save()
      Write-Output "$caseId : native pivots=$($pivotSheet.PivotTables().Count), headline=$($dash.Range('B5').Value2)"
    } finally {$book.Close($false)}
    Copy-Item -LiteralPath $bookPath -Destination (Join-Path $portfolioRoot "case-studies/$caseId/dashboard.xlsx") -Force
  }
} finally {$excelApp.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excelApp)}
