drop table if exists pictures;
create table pictures (
  id integer primary key autoincrement,
  user text not null,
  picture_name text not null,
  picture_array text not null
);

drop table if exists users;
create table users (
  id integer primary key autoincrement,
  username text not null,
  password text not null
);
