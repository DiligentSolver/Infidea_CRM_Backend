const formatAndValidateEmail = (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  // Convert to string and trim whitespace
  let cleanEmail = email.toString().trim().toLowerCase();

  // Basic email format regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    throw new Error("Invalid email format");
  }

  // Additional validations
  const [localPart, domain] = cleanEmail.split("@");

  // Check local part length (before @)
  if (localPart.length > 64) {
    throw new Error("Email username part is too long");
  }

  // Check domain length (after @)
  if (domain.length > 255) {
    throw new Error("Email domain part is too long");
  }

  // Check for consecutive special characters
  if (/[._%+-]{2,}/.test(localPart)) {
    throw new Error(
      "Invalid email: consecutive special characters not allowed"
    );
  }

  // Check for leading/trailing special characters in local part
  if (/^[._%+-]|[._%+-]$/.test(localPart)) {
    throw new Error(
      "Invalid email: special characters can't start or end email username"
    );
  }

  // Check for valid domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain)) {
    throw new Error("Invalid email domain format");
  }

  // Check for consecutive dots
  if (cleanEmail.includes("..")) {
    throw new Error("Invalid email: consecutive dots not allowed");
  }

  // Comprehensive list of disposable email domains
  const disposableDomains = [
    // Common temporary email services
    "tempmail.com",
    "temp-mail.org",
    "tempmail.net",
    "temp-mail.net",
    "tempmail.de",
    "temporarymail.com",
    "tempr.email",
    "throwawaymail.com",

    // Guerrilla Mail domains
    "guerrillamail.com",
    "guerrillamail.net",
    "guerrillamail.org",
    "guerrillamailblock.com",
    "grr.la",
    "guerrillamail.biz",
    "guerrillamail.de",

    // 10 Minute Mail domains
    "10minutemail.com",
    "10minutemail.net",
    "10minutemail.org",
    "10minutemail.co",
    "10minutemail.info",

    // Mailinator domains
    "mailinator.com",
    "mailinator.net",
    "mailinator.org",
    "maildrop.cc",
    "mailnesia.com",
    "mailnator.com",
    "mailinator2.com",

    // Yopmail domains
    "yopmail.com",
    "yopmail.net",
    "yopmail.org",
    "yopmail.fr",
    "yopmail.info",

    // Other common disposable services
    "disposablemail.com",
    "sharklasers.com",
    "armyspy.com",
    "cuvox.de",
    "dayrep.com",
    "einrot.com",
    "fleckens.hu",
    "gustr.com",
    "teleworm.us",
    "discard.email",
    "discardmail.com",
    "spamgourmet.com",
    "trashmail.com",
    "trashmail.net",
    "tmpmail.org",
    "tmpmail.net",

    // More disposable services
    "fakeinbox.com",
    "fakemailgenerator.com",
    "safetymail.info",
    "jetable.org",
    "nospam.ze.tc",
    "nomail.xl.cx",
    "mega.zik.dj",
    "speed.1s.fr",
    "courriel.fr.nf",
    "moncourrier.fr.nf",
    "monemail.fr.nf",
    "monmail.fr.nf",
    "filzmail.com",
    "fakemail.fr",

    // Additional services
    "throwawayemail.com",
    "trashtempmail.com",
    "tempsky.com",
    "tempemail.net",
    "tempemail.com",
    "tmpemails.com",
    "emailondeck.com",
    "emaildrop.io",
    "trbvm.com",
    "drdrb.net",
    "dropmail.me",
    "getairmail.com",
    "instant-mail.de",
    "mailexpire.com",
    "mailforspam.com",
    "mailhazard.com",
    "mailhz.me",
    "mailimate.com",
    "mailincubator.com",
    "mailmoat.com",
    "reallymymail.com",
    "confidential.email",
    "anonymbox.com",
    "generator.email",
    "kuku.lu",
    "spam4.me",
    "incognitomail.org",
    "deadaddress.com",
    "nobulk.com",
    "nospammail.net",
    "kill-the-spam.com",

    // Burner email domains
    "burnermail.io",
    "burnthis.email",
    "mytemp.email",
    "cs.email",
    "bugfoo.com",
    "cool.fr.nf",
    "correo.blogos.net",
    "dispostable.com",
    "yomail.info",
    "eyepaste.com",
    "gimme.email",
    "guerrillamail.info",
    "haltospam.com",
    "hulapla.de",
    "ieatspam.eu",
    "incognitomail.com",
    "meltmail.com",
    "monumentmail.com",
    "quickinbox.com",
    "recode.me",
    "spambox.us",
    "tafmail.com",
    "tempomail.fr",
    "temporarily.de",
    "tempmail.de",
    "throwam.com",
    "trayna.com",
    "wegwerfemail.de",
    "zippymail.info",
    "jnxjn.com",
    "dropjar.com",
    "spam.la",
    "spam.su",
    "tempmail.ninja",
  ];

  if (
    disposableDomains.some((disposableDomain) =>
      domain.endsWith(disposableDomain)
    )
  ) {
    throw new Error("Disposable email addresses are not allowed");
  }

  return cleanEmail;
};

module.exports = { formatAndValidateEmail };
