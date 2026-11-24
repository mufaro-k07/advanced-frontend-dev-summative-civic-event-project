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
  },

  // The same file types and sizes the backend accepts
  FILE_RULES: {
    image: { extensions: ['jpg', 'jpeg', 'png', 'gif'], maxMb: 2, label: 'JPG, PNG or GIF' },
    audio: { extensions: ['mp3', 'wav', 'm4a', 'ogg'], maxMb: 5, label: 'MP3, WAV, M4A or OGG' },
    // Browsers can't play .mov or .mkv, so we only let admins upload .mp4
    video: { extensions: ['mp4'], maxMb: 8, label: 'MP4' }
  },

  // Returns a message saying what's wrong with the file, or '' if it's fine
  fileError: function (file, kind) {
    const rule = Validate.FILE_RULES[kind];
    const extension = file.name.split('.').pop().toLowerCase();
    if (rule.extensions.indexOf(extension) === -1) {
      return 'That file type won\'t work. Choose a ' + rule.label + ' file.';
    }
    if (file.size > rule.maxMb * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return 'That file is ' + sizeMb + ' MB. The limit is ' + rule.maxMb + ' MB, so try a smaller one.';
    }
    return '';
  }
};
