filepath = r'C:\Dev\Alchemix\frontend\src\lib\views\Module2View.test.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\t\\t', '\t\t')
content = content.replace('\\t', '\t')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Escape fix done')