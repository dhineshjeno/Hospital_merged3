@echo off
echo ===== WEEK 5 SECURITY VERIFICATION =====
echo.
echo 1. Checking if server is running...
timeout /t 2 /nobreak
curl http://localhost:3000/health
echo.
echo 2. Testing rate limiting...
for /L %%i in (1,1,6) do (
    echo Request %%i...
    curl -X POST http://localhost:3000/api/v1/auth/login ^
         -H "Content-Type: application/json" ^
         -d "{\"email\":\"doctor@hospital.com\",\"password\":\"wrong\"}"
    timeout /t 1 /nobreak
)
echo.
echo ===== TESTS COMPLETE =====
pause