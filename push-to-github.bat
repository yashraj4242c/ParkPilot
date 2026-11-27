@echo off
title ParkPilot - Push to GitHub
echo ========================================================
echo   ParkPilot - Pushing to github.com/yashraj4242/ParkPilot
echo ========================================================
echo.
git branch -M main
git remote set-url origin https://github.com/yashraj4242/ParkPilot.git
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! Project pushed to https://github.com/yashraj4242/ParkPilot
    echo ========================================================
) else (
    echo ========================================================
    echo   Push encountered an error. Please see instructions above.
    echo ========================================================
)
echo.
pause
