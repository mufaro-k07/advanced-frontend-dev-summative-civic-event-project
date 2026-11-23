// Checks we run in the browser before sending anything to the backend.
const Validate = {
  // The same five rules the backend uses on signup, so people never get a surprise error
  passwordRules: [
    { id: 'length', label: 'At least 8 characters', test: function (pw) { return pw.length >= 8; } },
    { id: 'upper', label: 'An uppercase letter', test: function (pw) { return /[A-Z]/.test(pw); } },
    { id: 'lower', label: 'A lowercase letter', test: function (pw) { return /[a-z]/.test(pw); } },
    { id: 'number', label: 'A number', test: function (pw) { return /\d/.test(pw); } },
    { id: 'symbol', label: 'A symbol, like # or !', test: function (pw) { return /[\W_]/.test(pw); } }
  ],

  // How many of the five rules the password meets
  countPasswordRulesMet: function (password) {
    let count = 0;
    for (let i = 0; i < Validate.passwordRules.length; i++) {
      if (Validate.passwordRules[i].test(password)) {
        count++;
      }
    }
    return count;
  },

  isStrongPassword: function (password) {
    return Validate.countPasswordRulesMet(password) === Validate.passwordRules.length;
  },

  // A light check for typos. The backend does the strict one.
  isEmail: function (text) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }
};
