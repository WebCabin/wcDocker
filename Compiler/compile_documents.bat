setlocal
cd ..\Build

if not exist Docs goto :SKIP
rmdir /S /Q Docs

:SKIP
cd ..
call Compiler\node_modules\.bin\jsdoc -c Compiler\config_documents.json -d Build\Docs
copy "favicon.ico" "Build\Docs\favicon.ico"

endlocal
