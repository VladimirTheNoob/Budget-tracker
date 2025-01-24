const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Create OAuth2 client
const oauth2Client = new OAuth2Client();

// Configure passport
function configurePassport() {
  try {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
      },
      function(accessToken, refreshToken, profile, cb) {
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        return cb(null, profile);
      }));

      passport.serializeUser((user, done) => {
        done(null, user);
      });

      passport.deserializeUser((user, done) => {
        done(null, user);
      });
    } else {
      console.log('Google OAuth credentials not found, skipping OAuth configuration');
    }
  } catch (error) {
    console.error('Error configuring passport:', error);
  }
}

module.exports = {
  oauth2Client,
  passport,
  configurePassport
}; 