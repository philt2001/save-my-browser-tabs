@echo off
REM Script to create the Firefox extension XPI file
REM from: http://superuser.com/questions/110991/can-you-zip-a-file-from-the-command-prompt-using-only-windows-built-in-capabili

REM this file should be in the directory ABOVE the folder with all the files in it
set folderName=firefox\

REM Set the file name, no extension
set outputFileName=savemytabs

cscript CreateZip.vbs %outputFileName%.zip %folderName%chrome %folderName%defaults %folderName%chrome.manifest %folderName%install.rdf %folderName%LICENSE %folderName%README 

echo Deleting existing file
del %outputFileName%.xpi

echo Renaming file
rename %outputFileName%.zip %outputFileName%.xpi

pause