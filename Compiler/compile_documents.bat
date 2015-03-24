setlocal
cd ..\Build

if not exist Docs goto :SKIP
rmdir /S /Q Docs

:SKIP
cd ..
call Compiler\node_modules\.bin\jsdoc Code README.md -u Code\tutorial_docs -t Compiler\node_modules\ink-docstrap\template -c Compiler\config_documents.json -d Build\Docs
::call Compiler\node_modules\.bin\jsdoc Code README.md -u Code\tutorial_docs -t Compiler\node_modules\jaguarjs-jsdoc -d Build\Docs
::call Compiler\node_modules\.bin\jsdoc Code README.md -u Code\tutorial_docs -d Build\Docs

endlocal
