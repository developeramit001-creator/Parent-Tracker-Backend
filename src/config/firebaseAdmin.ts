// import admin from "firebase-admin";

// const serviceAccount = JSON.parse(
//     process.env.FIREBASE_SERVICE_ACCOUNT as string
// );

// serviceAccount.private_key =
//     serviceAccount.private_key.replace(/\\n/g, "\n");

// if (!admin.apps.length) {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//     });
// }

// export default admin;







import admin from "firebase-admin";
import path from "path";

const serviceAccountPath = path.join(
    process.cwd(),
    "firebase-admin.json"
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
    });
}

export default admin;











