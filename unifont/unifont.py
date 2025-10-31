import png
import unicodedataplus as ud
unidata = {}
lines = 0
with open('unifont.hex', 'r') as file:
    for line in file:
        lines += 1
        code, value = line.strip().split(':')
        index = int(code, 16)
        c = chr(index)
        if ud.is_extended_pictographic(c) or index < 128:
            unidata[index] = value
            
print("Lines:"+str(lines))
print("Codepoints:"+str(len(unidata)))
width = 16
while width**2 < len(unidata):
    width *= 2
codepoints = list(unidata.keys())
print("Width:"+str(width))

atlas = [[0]*(width*16) for y in range(width*16)]
index = 0
for code in sorted(unidata):
    value = unidata[code]
    ax = index % width
    ay = index // width
    fullwidth = (len(value) == 64)
    for cy in range(16):
        crow = None
        if fullwidth:
            crow = format(int(value[cy*4:cy*4+4], 16), "016b")
        else:
            crow = "0000"+format(int(value[cy*2:cy*2+2], 16), "08b")+"0000"
        for cx in range(16):
            atlas[ay*16+cy][ax*16+cx] = int(crow[cx])
    index += 1

# Create and save chars
png.from_array(atlas, 'L;1').save("chars.png")

with open("chars.txt", "w", encoding="utf-8") as f:
    for code in sorted(unidata):
        f.write(str(code)+"\n")
