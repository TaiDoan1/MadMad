$files = Get-ChildItem -Recurse -Path "src\pages\admin" -Include "*.tsx"
foreach ($file in $files) {
    $content = Get-Content -Raw -Path $file.FullName
    $newContent = $content -replace 'to="/admin/', 'to="/'
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
    Write-Host "Fixed: $($file.Name)"
}
Write-Host "Done!"
