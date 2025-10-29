Get-ChildItem ".\input" | 
Foreach-Object {
    $inputFile  = ".\input\" + $_.Name
    $outputFile = ".\output\" + $_.Name.Replace(".p8.png", ".lua")
    p8tool listlua --pure-lua $inputFile > $outputFile
}