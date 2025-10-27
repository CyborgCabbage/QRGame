import png
import unicodedata
unidata = {}
skipped = 0
with open('unifont.hex', 'r') as file:
    for line in file:
        code, value = line.strip().split(':')
        index = int(code, 16)
        if unicodedata.category(chr(index)) == 'Lo':
            skipped += 1
            continue
        rows = []
        row = 4 if len(value) == 64 else 2
        for i in range(0, len(value), row):
            rows.append(format(int(value[i:i+row], 16), "016b"))
        unidata[index] = rows
print("Skipped:"+str(skipped))
width = 16
while width**2 < len(unidata):
    width *= 2
codepoints = list(unidata.keys())
print("Width:"+str(width))

def create_chars():
    image = []
    for y in range(width * 16):
        row = []
        for x in range(width * 16):
            idx = (y // 16 * width) + x // 16
            value = 0
            if idx in codepoints:
                print(codepoints[idx])
                value = 255 if unidata[codepoints[idx]][y % 16][x % 16] == '1' else 0
            row.append(value)
        image.append(row)
    return image

# Create and save chars
writer = png.Writer(width * 16, width * 16, bitdepth=8, greyscale=True)
with open('chars.png', 'wb') as f:
    writer.write(f, [[0]*width]*width)
