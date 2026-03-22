const fs = require("fs");
let c = fs.readFileSync("server/routes/events.js", "utf8");

// Patch 1: HOD fix already done - verify
console.log("HOD fix present:", c.includes("venue.hodDepartment) {"));

// Patch 2: Add attachment to registrar email
// Find the closing backtick of the registrar html template and add attachments before })
const marker = "Please prepare the key for collection.</p>\n                `\n              }).catch";
const markerWin = "Please prepare the key for collection.</p>\r\n                `\r\n              }).catch";

if (c.includes(markerWin)) {
  c = c.replace(
    markerWin,
    "Please prepare the key for collection.</p>\r\n                `,\r\n                attachments: eventAttachments\r\n              }).catch"
  );
  console.log("Registrar attachment PATCHED");
} else if (c.includes(marker)) {
  c = c.replace(
    marker,
    "Please prepare the key for collection.</p>\n                `,\n                attachments: eventAttachments\n              }).catch"
  );
  console.log("Registrar attachment PATCHED (unix)");
} else {
  console.log("Registrar marker NOT FOUND");
}

fs.writeFileSync("server/routes/events.js", c, "utf8");
console.log("DONE");
