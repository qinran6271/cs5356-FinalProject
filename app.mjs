import dotenv from 'dotenv'
dotenv.config()

import * as db from './db.mjs';
import mongoose from 'mongoose';

import express from 'express';
import session     from 'express-session';
import MongoStore  from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import pkg from 'hbs';
const { handlebars } = pkg;

import Chart from 'chart.js';


const app = express();


// passport.js
import passport from 'passport';
// import GoogleStrategy from 'passport-google-oidc';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcryptjs';

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));  

// session 
app.use(session({
    secret: process.env.SESSION_SECRET,
    store:  MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
app.use(passport.initialize());
app.use(passport.session());
  

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const Dream = mongoose.model('Dream');
const User = mongoose.model('User');

// handlebars helpers
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
handlebars.registerHelper('toDate', function (date) {
  return new Date(date).toLocaleDateString(undefined, options);
});

// login
app.get('/login', (req, res) => {
    res.render('login', {user: null, message: req.session.message});
});

// login with google
// app.get('/login/federated/google', passport.authenticate('google'));

// app.get('/oauth2/redirect/google', passport.authenticate('google', {
//     successRedirect: '/',
//     failureRedirect: '/login'
// }));

// login with local
app.post('/login/local', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).render('failure', { error: err.message, failureRedirect: '/login' });
      }
      if (!user) {
        return res.status(401).render('failure', { error: info.message, failureRedirect: '/login' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).render('failure', { error: err.message, failureRedirect: '/login' });
        }
        return res.redirect('/');
      });
    })(req, res, next);
  });

app.get('/login_failure', (req, res) => {
    res.render('failure');
});


// signup
app.get('/signup', (req, res) => {
    res.render('signup', {user: null});
});

app.post('/signup', (req, res) => {
    const { username, password, passwordConfirm, name } = req.body;
    console.log('username:', username);
    console.log('password:', password);
    console.log('passwordConfirm:', passwordConfirm);
    console.log('name:', name);
  
    // 1. Required fields check
    if (!username || !password || !name) {
      console.log('Error: missing fields');
      return res.status(400).render('failure', {
        error: 'Username, password, password confirmation, and name are all required fields',
        failureRedirect: '/signup'
      });
    }
  
    // 2. Username length & format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.log('Error: username format invalid');
      return res.status(400).render('failure', {
        error: 'Username can only contain letters, numbers, and underscores',
        failureRedirect: '/signup'
      });
    }
  
    // 3. Password length & confirmation
    if (password.length < 8) {
      console.log('Error: password too short');
      return res.status(400).render('failure', {
        error: 'Password must be at least 8 characters long',
        failureRedirect: '/signup'
      });
    }
  
    // 4. Uniqueness check (username already exists)
    User.findOne({ username }, (err, exists) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).render('failure', {
          error: 'Internal server error, please try again later',
          failureRedirect: '/signup'
        });
      }
      if (exists) {
        console.log('Error: username exists');
        return res.status(409).render('failure', {
          error: 'This username is already taken, please choose another',
          failureRedirect: '/signup'
        });
      }
  
      // 5. Hash password and save
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          console.error('Hash error:', err);
          return res.status(500).render('failure', {
            error: 'Internal server error, please try again later',
            failureRedirect: '/signup'
          });
        }
  
        const user = new User({
          username,
          password: hash,
          name,
          mechanism: 'password'
        });
  
        user.save((err) => {
          if (err) {
            console.error('Save user error:', err);
            return res.status(500).render('failure', {
              error: 'Registration failed, please try again later',
              failureRedirect: '/signup'
            });
          }
          return res.redirect('/login');
        });
      });
    });
  });
  
// require authenticated user to access any route before login
app.use((req, res, next) => {
    if (req.session.passport) {
        return next();
    }
    res.redirect('/login');
});


// reference: https://www.passportjs.org/tutorials/google/configure/
// passport.use(new GoogleStrategy({
//     clientID: process.env['GOOGLE_CLIENT_ID'],
//     clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
//     callbackURL: '/oauth2/redirect/google',
//     scope: [ 'profile' ]
//   }, 
//   function(issuer, profile, done) {
//     console.log('profile: ' + profile);
//     console.log('profile.id: ' + profile.id);
//     console.log('profile.displayname: ' + profile.displayName);
//     User.findOne({username: profile.id, name: profile.displayName, mechanism: 'google'}, function(err, user) {
//         if (err) {
//             return done(err);
//         }
//         if (!user) {
//             user = new User({name: profile.displayName, username: profile.id, mechanism: 'google'});
//             user.save(function(err) {
//                 if (err) console.log(err);
//                 return done(err, user);
//             });
//         } else {
//             return done(err, user);
//         }
//     }
//     );
// }));

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        cb(null, { id: user.id, name: user.name });
    });
});

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        cb(null, user);
    });
});

// reference: https://www.passportjs.org/tutorials/password/verify/
passport.use(new LocalStrategy(function verify(username, password, done) {
    User.findOne({username: username, mechanism: 'password'}, function(err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            console.log('user not found');
            return done(null, false, {message: 'Incorrect username.'});
        }
        bcrypt.compare(password, user.password, (err, passwordMatch) => {
            if (passwordMatch) {
                return done(null, user);
            }
            else {
                console.log('password not match');
                return done(null, false, {message: 'Incorrect password.'});
            }
        });
    });
}));


app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});


app.get('/', (req, res) => {
    console.log(req.session)
    if (req.session.passport && req.session.passport.user) {
        Dream.find({user: req.session.passport.user.id}).sort('-date').exec((err, dreams) => {
            res.render('index', {user: req.session.passport.user, home: true, dreams: dreams});
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/dream/new', (req, res) => {
    res.render('dream-new', {user: req.session.passport.user});
});


app.post('/dream/new', (req, res) => {
    const { title, date, emotions, colorfulness, narration } = req.body;
    const userId = req.session.passport.user.id;
  
    // check empty fields
    if (!title || !date || !emotions || !colorfulness || !narration) {
      return res.status(400).render('dream-new', {
        user:    req.session.passport.user,
        error:   'all fields are required',
        form:    { title, date, emotions, colorfulness, narration } // sent back the form data to pre-fill the form
      });
    }
  
    // 2. save the dream to the database
    const Dream = mongoose.model('Dream');
    const dream = new Dream({
      user:         userId,
      title,
      date,
      emotions,
      colorfulness,
      narration
    });
  
    dream.save((err, result) => {
      if (err) {
        console.error(err);
        // if there is an error, render the form again with the error message
        return res.status(500).render('dream-new', {
          user:  req.session.passport.user,
          error: 'failed to save the dream',
          form:  { title, date, emotions, colorfulness, narration }
        });
      }
      // if the save is successful, redirect to the home page
      res.redirect('/');
    });
  });

app.get('/dream/:slug', (req, res) => {
    Dream.findOne({slug: req.params.slug, user: req.session.passport.user.id})
    .populate('user')
    .exec((err, dream) => {
      if (err) {
        console.log(err);
        res.status(500).send('Error: ' + err);
      } else if (!dream) {
        res.status(403).send('Whoosh! You are not allowed to view this dream.');
      } else {
        res.render('dream-detail', {user: req.session.passport.user, dream: dream});
      }
    });
});

// filter out dreams by title that include certain words
app.get('/search', (req, res) => {
    const search = '(?i)' + req.query.search;
    Dream.find({title: {$regex: search}, user: req.session.passport.user.id}).exec((err, dreams) => {
        res.render('search', {user: req.session.passport.user, home: true, dreams: dreams});
    });
});


// delete dreams that the user doe not want to keep
app.get('/delete', (req, res) => {
    Dream.find({user: req.session.passport.user.id}).sort('-date').exec((err, dreams) => {
        res.render('delete', {user: req.session.passport.user, home: true, dreams: dreams});
    }
    );
});

app.post('/delete', (req, res) => {
    Dream.deleteMany({user: req.session.passport.user.id, _id: {$in: Object.keys(req.body)}}, (err, result) => {
        console.log('delete result: ', result);
        if (err) {
            console.log(err);
            res.redirect('/delete');
        } else if (result) {
            res.redirect('/delete');
        }
    });
});

  


export default app

