$apiKey = $env:ANTHROPIC_API_KEY
$baseUrl = "https://openrouter.ai/api/v1"
Write-Host "`nBuscando modelos gratuitos...`n" -ForegroundColor Cyan
$headers = @{ "Authorization" = "Bearer $apiKey" }
$response = Invoke-RestMethod -Uri "$baseUrl/models" -Headers $headers -Method Get
$freeModels = $response.data | Where-Object { $_.id -like "*:free*" } | Sort-Object id
for ($i = 0; $i -lt $freeModels.Count; $i++) {
    Write-Host "  $($i + 1). $($freeModels[$i].id)" -ForegroundColor White
}
Write-Host ""
$selection = Read-Host "Elige un numero"
$selectedModel = $freeModels[[int]$selection - 1].id
Write-Host "`nModelo: $selectedModel" -ForegroundColor Green
$env:ANTHROPIC_BASE_URL = $baseUrl
$env:ANTHROPIC_AUTH_TOKEN = ""
claude --model $selectedModel
