setlocal
cd ..\Build

if not exist Docs goto :SKIP
rmdir /S /Q Docs

:SKIP
cd ..
::call Compiler\node_modules\.bin\jsdoc Code README.md -u Code\tutorials -t Compiler\node_modules\ink-docstrap\template -c Compiler\config_documents.json -d Build\Docs
call Compiler\node_modules\.bin\jsdoc Code README.md -u Code\tutorials -t Compiler\node_modules\docstrap\template -c Compiler\config_documents.json -d Build\Docs

endlocal
