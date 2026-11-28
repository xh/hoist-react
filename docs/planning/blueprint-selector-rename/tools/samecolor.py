# Reads restcheck/statecheck diff lines on stdin and reports any whose before and after are not the
# same color, allowing for color(srgb) vs rgb() notation and oklch float noise.
import sys, re
CF = re.compile(r'color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: / ([\d.]+))?\)|rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)|oklch\(([\d.e-]+) ([\d.e-]+) ([\d.e-]+|none)(?: / ([\d.]+))?\)')
def colors(s):
    out = []
    for m in CF.finditer(s):
        g = m.groups()
        if g[0] is not None: out.append(('rgb', float(g[0]) * 255, float(g[1]) * 255, float(g[2]) * 255, float(g[3] or 1)))
        elif g[4] is not None: out.append(('rgb', int(g[4]), int(g[5]), int(g[6]), float(g[7] or 1)))
        else: out.append(('ok', float(g[8]), float(g[9]), None if g[10] == 'none' else float(g[10]), float(g[11] or 1)))
    return out, CF.sub('C', s)
def same(x, y):
    if x[0] != y[0]: return False
    if x[0] == 'rgb': return all(abs(p - q) <= 0.6 for p, q in zip(x[1:4], y[1:4])) and abs(x[4] - y[4]) < 1e-3
    hue_ok = x[3] is None or y[3] is None or abs(x[3] - y[3]) < 0.5 or min(x[2], y[2]) < 0.03
    return abs(x[1] - y[1]) < 1e-3 and abs(x[2] - y[2]) < 1e-3 and abs(x[4] - y[4]) < 1e-3 and hue_ok
n = bad = 0
for line in sys.stdin:
    if ' -> ' not in line: continue
    head, after = line.rstrip('\n').split(' -> ', 1)
    i = min([j for j in (head.find('color('), head.find('rgb'), head.find('oklch(')) if j >= 0] or [len(head)])
    before = head[i:]; n += 1
    a, ra = colors(before); b, rb = colors(after)
    if not (ra == rb and len(a) == len(b) and a and all(same(x, y) for x, y in zip(a, b))):
        bad += 1
        if bad < 8: print('REAL', line.strip()[:240])
print(n, 'flagged,', bad, 'not the same color')
