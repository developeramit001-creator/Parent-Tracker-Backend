if (exists) {

  const accessToken = signAccessToken(exists);
  const refreshToken = signRefreshToken(exists);

  await RefreshToken.deleteMany({ userId: exists._id });
  await RefreshToken.create({
    userId: exists._id,
    token: refreshToken,
  });

  // 🔥 DEVICE SAVE LOGIC START

  if (deviceId) {

    const alreadyExists = exists.devices?.find(
      (d: any) => d.deviceId === deviceId
    );

    if (alreadyExists) {
      // update existing device
      await User.updateOne(
        {
          _id: exists._id,
          "devices.deviceId": deviceId
        },
        {
          $set: {
            "devices.$.isOnline": true,
            "devices.$.lastSeen": new Date()
          }
        }
      );
    } else {
      // add new device
      await User.updateOne(
        { _id: exists._id },
        {
          $push: {
            devices: {
              deviceId,
              deviceName,
              deviceType,
              platform,
              isOnline: true,
              lastSeen: new Date(),
              isTrusted: false
            }
          }
        }
      );
    }

  }

  // 🔥 DEVICE SAVE LOGIC END

  // fresh user return karo
  const updatedUser = await User.findById(exists._id);

  response.AuthenticationToken = accessToken;
  response.refreshToken = refreshToken;
  response.user = updatedUser;

}
