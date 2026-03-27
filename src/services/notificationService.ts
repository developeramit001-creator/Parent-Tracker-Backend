



// // Firebase Admin SDK import
// // Iska use backend se push notification bhejne ke liye hota hai
import admin from "../config/firebaseAdmin";
import User from "../models/user"; // 👈 add this
// /**
//  * 📌 sendPush
//  * --------------------------------------------------
//  * Ye function multiple devices ko push notification bhejta hai
//  * (ek user ke multiple phones ho sakte hain)
//  *
//  * @param tokens - FCM tokens (array of device tokens)
//  * @param title  - Notification ka title (short & clear)
//  * @param body   - Notification ka message/body
//  * @param data   - Extra payload (screen navigation, type, ids, etc.)
//  */
// export async function sendPush(
//   tokens: string[],
//   title: string,
//   body: string,
//   data: Record<string, string> = {}
// ) {
//   // 🔐 Safety check:
//   // Agar user ke paas koi FCM token nahi hai,
//   // to notification bhejne ka koi matlab nahi
//   if (!tokens?.length) return;

//   /**
//    * 🧠 Notification payload structure
//    * --------------------------------------------------
//    * Ye payload Android + iOS dono platforms ke liye hai
//    * Zomato / Blinkit bhi isi type ka structure follow karti hain
//    */
//   const message = {
//     // 👇 Multiple devices support
//     tokens,

//     /**
//      * 🔔 Visible notification content
//      * Ye title & body user ko notification tray me dikhega
//      */
//     // notification: {
//     //   title, // eg: "You have a new connection"
//     //   body,  // eg: "Amit wants to stay connected with you on SafeTracker"
//     // },

//     /**
//      * 🤖 Android specific configuration
//      */
//     android: {
//       // High priority = turant delivery (important for safety apps)
//       priority: "high" as const,

//       notification: {
//         // Android notification channel (predefined in app)
//         channelId: "default",

//         // Default system sound
//         sound: "default",

//         // Notification accent color (SafeTracker brand blue)
//         color: "#1E88E5",
//       },
//     },

//     /**
//      * 🍎 iOS (APNs) specific configuration
//      */
//     // apns: {
//     //   payload: {
//     //     aps: {
//     //       // Default notification sound on iOS
//     //       sound: "default",
//     //     },
//     //   },
//     // },

//     /**
//      * 📦 Extra data payload (VERY IMPORTANT)
//      * --------------------------------------------------
//      * Ye data user ko kis screen par le jana hai
//      * uska decision lene me help karta hai
//      *
//      * Example:
//      * {
//      *   type: "CONNECTION_REQUEST",
//      *   userId: "abc123"
//      * }
//      */
//     // data,
//     data: {
//       type: "CONNECTION_REQUEST",
//       title: "New Connection Request",
//       body: "A child wants to connect with you",
//       requestId: "12345",
//     },
//   };

//   // 🚀 Firebase ko notification send karo
//   const response = await admin.messaging().sendEachForMulticast(message);



//   // 📊 Success count log (debug / monitoring ke liye)

// }



export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  if (!tokens?.length) return;

  const message = {
    tokens,

    android: {
      priority: "high" as const,
    },

    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      title,
      body,
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  console.log("✅ success:", response.successCount);
  console.log("❌ fail:", response.failureCount);

  // 🧠 collect invalid tokens
  const tokensToRemove: string[] = [];

  response.responses.forEach((r, i) => {
    if (!r.success) {
      const errorCode = r.error?.code;

      console.log("❌ token failed:", tokens[i]);
      console.log("❌ error:", r.error);

      // ✅ IMPORTANT: invalid token detect
      if (
        errorCode === "messaging/registration-token-not-registered" ||
        errorCode === "messaging/invalid-registration-token"
      ) {
        tokensToRemove.push(tokens[i]);
      }
    }
  });

  // 🧹 DB cleanup (VERY IMPORTANT)
  if (tokensToRemove.length) {
    console.log("🧹 removing invalid tokens:", tokensToRemove);

    await User.updateMany(
      { fcmTokens: { $in: tokensToRemove } },
      { $pull: { fcmTokens: { $in: tokensToRemove } } }
    );
  }
}
