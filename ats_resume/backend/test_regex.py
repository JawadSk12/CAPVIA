import re

cleaned = "P R O J E C T S"
spaced_pattern = re.compile(r'(?:^|\s)([a-zA-Z])(?:\s+([a-zA-Z]))+(?=\s|$)')
def squash(m):
    return m.group(0).replace(" ", "")
print(spaced_pattern.sub(squash, cleaned))

cleaned2 = "D A T A S C I E N C E S K I L L S"
print(spaced_pattern.sub(squash, cleaned2))

cleaned3 = "P R O F I L E E D U C A T I O N"
print(spaced_pattern.sub(squash, cleaned3))

