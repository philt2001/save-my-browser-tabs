'Script to create a zip file from multiple input files
'From: http://superuser.com/questions/110991/can-you-zip-a-file-from-the-command-prompt-using-only-windows-built-in-capabili

Set objArgs = WScript.Arguments
ZipFile = objArgs(0)

WScript.Echo "Zip file name"
WScript.Echo ZipFile

'Need to use the absolute path to get the accessing of the zip file to work correctly
'From: http://stackoverflow.com/questions/12713740/command-line-arguments-object-required-objshell-namespace
set fso = CreateObject("Scripting.FileSystemObject")
ZipFile_abs = fso.GetAbsolutePathName(ZipFile)
WScript.Echo "The Absolute Path for the  output file is: ", ZipFile_abs

' Create empty ZIP file and open for adding
CreateObject("Scripting.FileSystemObject").CreateTextFile(ZipFile_abs, True).Write "PK" & Chr(5) & Chr(6) & String(18, vbNullChar)
WScript.Sleep 1000
Set zip = CreateObject("Shell.Application").NameSpace(ZipFile_abs)
'Set objShell = CreateObject("Shell.Application")

'zip.CopyHere(objArgs(1))
'CreateObject("Shell.Application").NameSpace(ZipFile_abs).CopyHere(objArgs(1))

' Add all files/directories to the .zip file
For i = 1 To objArgs.count-1
  WScript.Echo "Adding item ", i, " ", objArgs(i)
  
  'The original code is below, but I needed the full path, 2 lines down
  'zip.CopyHere(objArgs(i))
  zip.CopyHere( fso.GetAbsolutePathName(objArgs(i)) )
  
  'Wait until the objcet has been added before continuing
  Do Until zip.Items.Count = i
	WScript.Sleep 200
  Loop
Next