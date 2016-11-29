import os
from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash, jsonify, json
from flask_login import LoginManager, login_required, logout_user, login_user, current_user, UserMixin

# create our little application :)
app = Flask(__name__)

# Load default config and override config from an environment variable
app.config.update(
    DATABASE=os.path.join(app.root_path, 'pixelpicasso.db'),
    DEBUG=True,
    SECRET_KEY='super secret key'
)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# silly user model
class User(UserMixin):
    def __init__(self, id):
        self.id = id
        self.name = "user" + str(id)
        self.password = self.name + "_secret"

    def __repr__(self):
        return "%d/%s/%s" % (self.id, self.name, self.password)

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


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


@app.route('/save', methods=['GET', 'POST'])
@login_required
def save():
    # if not current_user.is_authenticated:
    #     abort(401)
    db = get_db()
    db.execute("insert into pictures (user, picture_name, picture_array) values (?, ?, ?)", (current_user.id, "test_picture_name", request.data))
    db.commit()
    flash('New entry was successfully posted')
    # return redirect(url_for('workshop'))
    return request.data

@app.route('/load', methods=['GET'])
@login_required
def load():
    # if not current_user.is_authenticated:
    #     abort(401)
    db = get_db()
    qry = db.execute("select picture_array from pictures where user='" + current_user.id + "' and picture_name='test_picture_name'")
    return qry.fetchall()


@app.route('/gallery')
def gallery():
    return render_template('gallery.html')


@app.route('/<username>', methods=['POST'])
def user(username):
    error = None
    if request.form['action']=='login':
        db = get_db()
        qry = db.execute("select * from users where username='" + request.form['username'] + "' and password='" + request.form['password'] + "'")
        if qry.fetchone() is not None:
            user = User(request.form['username'])
            login_user(user)
            flash('You were logged in')
            return render_template('workshop.html')
        else:
            error = 'invalid username or password'
    else:
        # create account
        db = get_db()
    	db.execute('insert into users (username, password) values (?, ?)', \
    	           [request.form['username'], request.form['password']])
    	db.commit()
    	flash('New account was successfully created')
    return render_template('workshop.html', error=error)


@app.route('/logout', methods=['GET'])
@login_required
def logout():
    logout_user()
    flash('You were logged out')
    return render_template('workshop.html')
