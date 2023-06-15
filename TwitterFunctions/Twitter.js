const axios = require("axios");
const { getEnv } = require("../config");

const TWITTER_BEARER_TOKEN = getEnv("TWITTER_BEARER_TOKEN");
const TWITTER_BASE_URL = getEnv("TWITTER_BASE_URL");

const isTwitterIdValid = (twitter_id) => {
  const url = `${TWITTER_BASE_URL}/users/${twitter_id}`;

  console.log(url);

  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
    },
  });
};

const getUserFollowers = (user_id, next_token) => {
  const url = next_token
    ? `${TWITTER_BASE_URL}/users/${user_id}/followers?max_results=1000&pagination_token=${next_token}`
    : `${TWITTER_BASE_URL}/users/${user_id}/followers?max_results=1000`;

  console.log(url);

  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
    },
  });
};

const isUserFollowingGiverOnTwitter = async (
  giverTwitterId,
  subscriberTwitterId,
  next_token
) => {
  const twitterFollowers = await getUserFollowers(giverTwitterId, next_token);
  if (twitterFollowers?.data?.data) {
    const isFollowingOnTwitter = await twitterFollowers.data.data.find((tf) => {
      return tf.id == subscriberTwitterId;
    });
    if (!isFollowingOnTwitter) {
      if (!twitterFollowers.data.meta?.next_token) {
        return {
          error: "Please follow the giver on twitter then join his giveaway.",
        };
      }
      console.log("next_token", twitterFollowers.data.meta);
      // call a recursive function
      return await isUserFollowingGiverOnTwitter(
        giverTwitterId,
        subscriberTwitterId,
        twitterFollowers.data.meta.next_token
      );
    }
    return { data: isFollowingOnTwitter };
  } else if (twitterFollowers.data?.errors) {
    return { error: "Giver's twitter id is not valid" };
  } else {
    console.log("twitterFollowers", twitterFollowers);
    return {
      error: "Please follow the giver on twitter then join his giveaway.",
    };
  }
};

const isUsersFollowingGiverOnTwitter = async (
  giverTwitterId,
  subscriberTwitterIds,
  next_token
) => {
  if (subscriberTwitterIds.some((sub) => !sub.can_be_selected)) {
    const twitterFollowers = await getUserFollowers(giverTwitterId, next_token);

    if (twitterFollowers?.data?.data) {
      subscriberTwitterIds.forEach((subscriberTwitterId) => {
        if (!subscriberTwitterId.can_be_selected) {
          const isFollowingOnTwitter = twitterFollowers.data.data.find((tf) => {
            return tf.id == subscriberTwitterId.twitter_id;
          });
          if (isFollowingOnTwitter) subscriberTwitterId.can_be_selected = true;
        }
      });

      if (subscriberTwitterIds.some((sub) => !sub.can_be_selected)) {
        if (!twitterFollowers.data.meta?.next_token) {
          return { data: subscriberTwitterIds };
        }
        console.log("next_token", twitterFollowers.data.meta);
        // call a recursive function
        return await isUsersFollowingGiverOnTwitter(
          giverTwitterId,
          subscriberTwitterIds,
          twitterFollowers.data.meta.next_token
        );
      }

      return { data: subscriberTwitterIds };
    } else if (twitterFollowers.data?.errors) {
      return { error: "Giver's twitter id is not valid" };
    } else return { data: subscriberTwitterIds };
  } else {
    return { data: subscriberTwitterIds };
  }
};

module.exports = {
  isTwitterIdValid,
  getUserFollowers,
  isUserFollowingGiverOnTwitter,
  isUsersFollowingGiverOnTwitter,
};
