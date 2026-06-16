import re

with open('style.css', 'r') as f:
    css = f.read()

def replacer(match):
    val = float(match.group(1))
    if val == 1: # leave 1px alone for borders
        return '1px'
    if val == 0:
        return '0'
    rem_val = val / 10.0
    return f"{rem_val:g}rem"

# Replace px with rem
new_css = re.sub(r'(-?\d+(?:\.\d+)?)px\b', replacer, css)

# add html { font-size: calc(100vw / 144); } at the top
new_css = "html { font-size: calc(100vw / 144); }\n" + new_css

with open('style.css', 'w') as f:
    f.write(new_css)
