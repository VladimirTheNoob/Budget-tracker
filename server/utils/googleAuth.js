const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Create OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production'
    ? 'https://vb-budgettracker.netlify.app/auth/google/callback'
    : 'http://localhost:5000/auth/google/callback'
);

// Configure passport
function configurePassport() {
  try {
    console.log('Configuring Passport Google Strategy');
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
    console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Callback URL:', process.env.NODE_ENV === 'production'
      ? 'https://vb-budgettracker.netlify.app/auth/google/callback'
      : 'http://localhost:5000/auth/google/callback'
    );

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return;
    }

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://vb-budgettracker.netlify.app/auth/google/callback'
        : 'http://localhost:5000/auth/google/callback',
      passReqToCallback: true,
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send']
    },
    function(req, accessToken, refreshToken, profile, cb) {
      try {
        console.log('Google OAuth Callback:', {
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          environment: process.env.NODE_ENV
        });

        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        // Attach additional info to the user object
        const user = {
          ...profile,
          accessToken,
          refreshToken
        };

        return cb(null, user);
      } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        return cb(error, null);
      }
    }));

    passport.serializeUser((user, done) => {
      console.log('Serializing user:', user.id);
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      console.log('Deserializing user:', user.id);
      done(null, user);
    });

    console.log('Passport Google Strategy configured successfully');
  } catch (error) {
    console.error('Error configuring passport:', error);
  }
}

module.exports = {
  oauth2Client,
  passport,
  configurePassport
}; 