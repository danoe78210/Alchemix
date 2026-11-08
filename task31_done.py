import sqlite3
conn = sqlite3.connect(r'C:\Users\danao\kanzo\kanzo.db')
conn.execute('UPDATE tasks SET status = ? WHERE id = ?', ('done', 31))
conn.commit()
print('Ticket 31 mis à jour done')