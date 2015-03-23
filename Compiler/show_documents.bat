:: Make sure to install the http-server package > npm install http-server -g
setlocal
cd ../Build/Docs
http-server -o --cors -a localhost -p 9009 -c-1
endlocal