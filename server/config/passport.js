const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Block inactive users
          if (!user.isActive) {
            return done(null, false, { message: 'Account is inactive' });
          }
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user (Google sign-up)
        // Check if this email is a pre-assigned role
        const roleMap = {
          '25it1ad12@mitsgwl.ac.in': { role: 'abc', name: 'Aditya Kumar Vaidey' },
          '25ai1am15@mitsgwl.ac.in': { role: 'superadmin', name: 'AmanVeer Singh Dugal' },
          '25mc1ma70@mitsgwl.ac.in': { role: 'registrar', name: 'Manash Gupta' },
        };

        const email = profile.emails[0].value.toLowerCase();
        const preAssigned = roleMap[email];

        const bcrypt = require('bcryptjs');
        const randomPass = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        user = new User({
          googleId: profile.id,
          name: preAssigned ? preAssigned.name : profile.displayName,
          email,
          password: randomPass,
          role: preAssigned ? preAssigned.role : 'student',
          isActive: true,
          branch: 'Not Set',
          enrollmentNo: 'GOOGLE-' + profile.id
        });

        // Skip pre-save hook for password since we already hashed it
        user.$locals = { skipPasswordHash: true };
        await user.save();
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
