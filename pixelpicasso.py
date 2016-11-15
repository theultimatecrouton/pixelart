import os
from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash
from flask.ext.session import Session


# create our little application :)
app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = 'super secret key'
Session(app)

# Load default config and override config from an environment variable
app.config.update(dict(
    DATABASE=os.path.join(app.root_path, 'pixelpicasso.db'),
    DEBUG=True,
    SECRET_KEY='development key',
    USERNAME='admin',
    PASSWORD='default'
))
app.config.from_envvar('PIXELPICASSO_SETTINGS', silent=True)


def connect_db():
    """Connects to the specific database."""
    rv = sqlite3.connect(app.config['DATABASE'])
    rv.row_factory = sqlite3.Row
    return rv


def init_db():
    """Initializes the database."""
    db = get_db()
    with app.open_resource('schema.sql', mode='r') as f:
        db.cursor().executescript(f.read())
    db.commit()


@app.cli.command('initdb')
def initdb_command():
    """Creates the database tables."""
    init_db()
    print('Initialized the database.')


def get_db():
    """Opens a new database connection if there is none yet for the
    current application context.
    """
    if not hasattr(g, 'sqlite_db'):
        g.sqlite_db = connect_db()
    return g.sqlite_db


@app.teardown_appcontext
def close_db(error):
    """Closes the database again at the end of the request."""
    if hasattr(g, 'sqlite_db'):
        g.sqlite_db.close()


@app.route('/')
def welcome():
    return render_template('workshop.html')


@app.route('/add', methods=['POST'])
def save():
    if not session.get('logged_in'):
        abort(401)
    db = get_db()
    db.execute('insert into pictures (user, picture_array) values (?, ?)',
               [request.form['title'], request.form['text']])
    db.commit()
    flash('New entry was successfully posted')
    return redirect(url_for('workshop'))


@app.route('/create_account', methods=['GET', 'POST'])
def create_account():
    error = None
    if request.method == 'POST':
		db = get_db()
		db.execute('insert into users (username, password) values (?, ?)',
		           [request.form['username'], request.form['password']])
		db.commit()
		flash('New account was successfully created')
    return render_template('create_account.html', error=error)


@app.route('/', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        db = get_db()
        qry = db.execute("select * from users where username='" + request.form['username'] + "' and password='" + request.form['password'] + "'")
        if qry.fetchone() is not None:
            session['logged_in'] = True
            flash('You were logged in')
            return render_template('workshop.html')
            # return redirect(url_for('workshop'))
        else:
            error = 'invalid username or password'
            return render_template('workshop.html', error=error)
            # return render_template('login.html', error=error)


@app.route('/')
def logout():
    # session.pop('logged_in', None)
    session['logged_in'] = False
    print session.logged_in
    flash('You were logged out')
    return render_template('workshop.html')
