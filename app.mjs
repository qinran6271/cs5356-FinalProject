import dotenv from 'dotenv'
dotenv.config()

import * as db from './db.mjs';
import mongoose from 'mongoose';

import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import pkg from 'hbs';
const { handlebars } = pkg;

import Chart from 'chart.js';


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// passport.js
import passport from 'passport';
// import GoogleStrategy from 'passport-google-oidc';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcryptjs';

app.set('view engine', 'hbs');

const sessionOptions = { 
    secret: 'secret for signing session id', 
    saveUninitialized: false, 
    resave: false
};
app.use(session(sessionOptions));
app.use(passport.authenticate('session'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const Dream = mongoose.model('Dream');
const User = mongoose.model('User');

// handlebars helpers
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
handlebars.registerHelper('toDate', function (date) {
  return new Date(date).toLocaleDateString(undefined, options);
});

// login with google
// app.get('/login', (req, res) => {
//     res.render('login', {user: null, message: req.session.message});
// });

// app.get('/login/federated/google', passport.authenticate('google'));

// app.get('/oauth2/redirect/google', passport.authenticate('google', {
//     successRedirect: '/',
//     failureRedirect: '/login'
// }));

// login with local
app.post('/login/local', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login_failure'
}));

app.get('/login_failure', (req, res) => {
    res.render('failure');
});


app.get('/signup', (req, res) => {
    res.render('signup', {user: null});
});

app.post('/signup', (req, res) => {
    if (req.body.username.length < 8 || req.body.password.length < 8) {
        console.log('Error: username password too short');
        res.redirect('/login_failure');
        return;
    }
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        console.log('hash', hash);
        if (err) {
            console.log(err);
            res.redirect('/signup');
        } else {
            const user = new User({
                username: req.body.username,
                password: hash,
                name: req.body.name,
                mechanism: 'password'
            });
            user.save((err) => {
                if (err) {
                    console.log(err);
                    res.redirect('/signup');
                } else {
                    res.redirect('/login');
                }
            });
        }
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
    const Dream = mongoose.model('Dream');
    const dream1 = new Dream({
        user: req.session.passport.user.id,
        title: req.body.title,
        date: req.body.date,
        emotions: req.body.emotions,
        colorfulness: req.body.colorfulness,
        narration: req.body.narration
    });
    dream1.save((err, result) => {
        if (err) {
            console.log(err);
            res.redirect('/dream/new');
        } else if (result) {
            res.redirect('/');
        }
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
        if (err) {
            console.log(err);
            res.redirect('/delete');
        } else if (result) {
            res.redirect('/');
        }
    });
});

app.listen(process.env.PORT || 3000);

