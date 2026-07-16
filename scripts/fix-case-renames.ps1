# fix-case-renames.ps1 — run from hospital-management-system/ root.
# Fixes the 8 filename casing bugs that crash the server on Linux.
# Two-step renames because Windows git ignores pure case changes.
$ErrorActionPreference = "Stop"

$renames = @(
  @("src/routes/v1/prescriptionsroutes.js",          "src/routes/v1/prescriptionsRoutes.js"),
  @("src/controllers/prescriptioncontroller.js",     "src/controllers/prescriptionController.js"),
  @("src/repositories/prescriptionrepository.js",    "src/repositories/prescriptionRepository.js"),
  @("src/repositories/prescriptionitemrepository.js","src/repositories/prescriptionItemRepository.js"),
  @("src/validators/prescriptionvalidator.js",       "src/validators/prescriptionValidator.js"),
  @("src/repositories/invoiceitemrepository.js",     "src/repositories/invoiceItemRepository.js"),
  @("src/repositories/paymentrepository.js",         "src/repositories/paymentRepository.js"),
  @("src/repositories/labresultrepository.js",       "src/repositories/labResultRepository.js")
)

foreach ($pair in $renames) {
  $from = $pair[0]; $to = $pair[1]
  if (Test-Path $from) {
    git mv $from "$from.tmp"
    git mv "$from.tmp" $to
    Write-Host "renamed: $from -> $to"
  } elseif (Test-Path $to) {
    Write-Host "already correct: $to"
  } else {
    Write-Warning "NOT FOUND: $from"
  }
}

git config core.ignorecase false
Write-Host ""
Write-Host "Done. Commit with:"
Write-Host '  git commit -m "fix: correct filename casing (crashes on Linux case-sensitive FS)"'
