Get-ChildItem ".\output" | 
Foreach-Object {
    $inputFile  = ".\output\" + $_.Name
    $outputFile = ".\zpaq\" + $_.Name.Replace(".lua", ".zpaq")
    ./zpaq64.exe -m5 add $outputFile $inputFile
}