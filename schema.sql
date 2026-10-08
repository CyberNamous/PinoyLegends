CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT, image TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS heroes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT, image TEXT, sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT, grp TEXT, badge TEXT, tone TEXT, sort INTEGER DEFAULT 0);
INSERT INTO staff (name, role, grp, badge, tone, sort) VALUES
 ('JC GFX','Developer','Leadership','Development Team','blue',1),
 ('BaneTzy','Community Manager','Leadership','Administration','gold',2),
 ('Sib','Community Manager','Leadership','Administration','gold',3),
 ('Valt','Head of Staff','Leadership','Staff Operations','gold',4),
 ('Slytherious','Moderator','Moderators','Moderation Team','blue',5),
 ('Jah','Moderator','Moderators','Moderation Team','blue',6),
 ('Ryzen','Moderator','Moderators','Moderation Team','blue',7),
 ('Supremod','Moderator','Moderators','Moderation Team','blue',8),
 ('Jansen','Moderator','Moderators','Moderation Team','blue',9);
